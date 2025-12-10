import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

// GET /api/games/[code]/leaderboard - Get game leaderboard
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const supabase = createServiceClient();

    // Get game
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('*')
      .eq('code', code.toUpperCase())
      .single();

    if (gameError || !game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    // Get players with scores
    const { data: gamePlayers, error: playersError } = await supabase
      .from('game_players')
      .select(`
        *,
        player:players(*)
      `)
      .eq('game_id', game.id)
      .order('score', { ascending: false });

    if (playersError) {
      return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
    }

    // Format leaderboard
    const leaderboard = (gamePlayers || []).map((gp, index) => ({
      rank: index + 1,
      player_id: gp.player_id,
      display_name: gp.player?.display_name || 'Unknown',
      avatar: gp.player?.avatar,
      score: gp.score,
    }));

    return NextResponse.json({
      game_id: game.id,
      current_round: game.current_round,
      total_rounds: game.total_rounds,
      leaderboard,
    });
  } catch (error) {
    console.error('Error in GET /api/games/[code]/leaderboard:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
