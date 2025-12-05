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

    if (!player_id || points === undefined) {
      return NextResponse.json({ error: 'player_id and points are required' }, { status: 400 });
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

    // Get current game player score
    const { data: gamePlayer, error: playerError } = await supabase
      .from('game_players')
      .select('score')
      .eq('game_id', game.id)
      .eq('player_id', player_id)
      .single();

    if (playerError || !gamePlayer) {
      return NextResponse.json({ error: 'Player not found in game' }, { status: 404 });
    }

    // Update player's score
    const { data: updated, error: updateError } = await supabase
      .from('game_players')
      .update({ score: gamePlayer.score + points })
      .eq('game_id', game.id)
      .eq('player_id', player_id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: 'Failed to award points' }, { status: 500 });
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
