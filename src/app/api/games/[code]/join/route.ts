import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

// DELETE /api/games/[code]/join - Leave a game
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const supabase = createServiceClient();
    const body = await request.json();
    const { player_id } = body;

    if (!player_id) {
      return NextResponse.json({ error: 'player_id is required' }, { status: 400 });
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

    // Remove player from game
    const { error: deleteError } = await supabase
      .from('game_players')
      .delete()
      .eq('game_id', game.id)
      .eq('player_id', player_id);

    if (deleteError) {
      console.error('Error leaving game:', deleteError);
      return NextResponse.json({ error: 'Failed to leave game' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/games/[code]/join:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/games/[code]/join - Join a game
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const supabase = createServiceClient();
    const body = await request.json();
    const { player_id } = body;

    if (!player_id) {
      return NextResponse.json({ error: 'player_id is required' }, { status: 400 });
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

    // Check if game is in lobby
    if (game.status !== 'lobby') {
      return NextResponse.json({ error: 'Game has already started' }, { status: 400 });
    }

    // Check if player exists
    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('*')
      .eq('id', player_id)
      .single();

    if (playerError || !player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    // Check if already joined (use maybeSingle to avoid error when no match)
    const { data: existingJoin } = await supabase
      .from('game_players')
      .select('*')
      .eq('game_id', game.id)
      .eq('player_id', player_id)
      .maybeSingle();

    if (existingJoin) {
      return NextResponse.json({
        ...existingJoin,
        player,
      });
    }

    // Join game
    const { data: gamePlayer, error: joinError } = await supabase
      .from('game_players')
      .insert({
        game_id: game.id,
        player_id,
        score: 0,
      })
      .select()
      .single();

    if (joinError) {
      console.error('Error joining game:', joinError);
      return NextResponse.json({ error: 'Failed to join game' }, { status: 500 });
    }

    return NextResponse.json({
      ...gamePlayer,
      player,
    });
  } catch (error) {
    console.error('Error in POST /api/games/[code]/join:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
