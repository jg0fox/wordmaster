import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

// POST /api/games/[code]/award - Award points to a player (human judging)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const supabase = createServiceClient();
    const body = await request.json();
    const { player_id, points } = body;

    // Validate inputs
    if (!player_id || typeof player_id !== 'string') {
      return NextResponse.json({ error: 'Valid player_id is required' }, { status: 400 });
    }

    if (points === undefined || typeof points !== 'number') {
      return NextResponse.json({ error: 'points must be a number' }, { status: 400 });
    }

    // Validate point range (1-5 for human judging, but allow 0 for edge cases)
    if (points < 0 || points > 10) {
      return NextResponse.json({ error: 'points must be between 0 and 10' }, { status: 400 });
    }

    // Get game
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('*')
      .eq('code', code.toUpperCase())
      .single();

    if (gameError || !game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    // Verify game is in judging state
    if (game.status !== 'judging') {
      return NextResponse.json({ error: 'Can only award points during judging' }, { status: 400 });
    }

    // Use atomic increment with retry logic to handle concurrent updates
    // First, get the current score to verify player exists
    const { data: gamePlayer, error: playerError } = await supabase
      .from('game_players')
      .select('id, score')
      .eq('game_id', game.id)
      .eq('player_id', player_id)
      .single();

    if (playerError || !gamePlayer) {
      return NextResponse.json({ error: 'Player not found in game' }, { status: 404 });
    }

    // Atomic update with optimistic locking (retry up to 3 times)
    let attempts = 0;
    const maxAttempts = 3;
    let updated = null;

    while (attempts < maxAttempts) {
      // Get fresh score
      const { data: fresh } = await supabase
        .from('game_players')
        .select('score')
        .eq('id', gamePlayer.id)
        .single();

      if (!fresh) {
        return NextResponse.json({ error: 'Player record disappeared' }, { status: 500 });
      }

      const expectedScore = fresh.score;
      const newScore = expectedScore + points;

      // Update only if score hasn't changed (optimistic lock)
      const { data: result, error: updateError } = await supabase
        .from('game_players')
        .update({ score: newScore })
        .eq('id', gamePlayer.id)
        .eq('score', expectedScore) // Optimistic lock
        .select()
        .maybeSingle();

      if (updateError) {
        console.error('Error updating score:', updateError);
        attempts++;
        continue;
      }

      if (result) {
        updated = result;
        break;
      }

      // Score changed between read and write, retry
      attempts++;
    }

    if (!updated) {
      return NextResponse.json({ error: 'Failed to award points after retries' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      player_id,
      points_awarded: points,
      new_total: updated.score
    });
  } catch (error) {
    console.error('Error in POST /api/games/[code]/award:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
