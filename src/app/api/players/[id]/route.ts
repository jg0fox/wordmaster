import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

// GET /api/players/[id] - Get player with stats
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServiceClient();

    // Get player
    const { data: player, error } = await supabase
      .from('players')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    // Get player's game history
    const { data: gameHistory } = await supabase
      .from('game_players')
      .select(`
        score,
        game_id
      `)
      .eq('player_id', id)
      .order('joined_at', { ascending: false });

    // Get all games to check status
    const { data: games } = await supabase
      .from('games')
      .select('id, code, status, created_at');

    const gamesMap = new Map((games || []).map(g => [g.id, g]));

    // Calculate stats
    const completedGames = (gameHistory || []).filter(
      gh => gamesMap.get(gh.game_id)?.status === 'completed'
    );
    const totalScore = completedGames.reduce((sum, gh) => sum + gh.score, 0);
    const gamesPlayed = completedGames.length;
    const averageScore = gamesPlayed > 0 ? totalScore / gamesPlayed : 0;

    // Get submission stats
    const { count: totalSubmissions } = await supabase
      .from('submissions')
      .select('*', { count: 'exact', head: true })
      .eq('player_id', id);

    const { data: scoreCounts } = await supabase
      .from('submissions')
      .select('ai_score')
      .eq('player_id', id)
      .not('ai_score', 'is', null);

    const scoreDistribution = [0, 0, 0, 0, 0];
    (scoreCounts || []).forEach(s => {
      if (s.ai_score && s.ai_score >= 1 && s.ai_score <= 5) {
        scoreDistribution[s.ai_score - 1]++;
      }
    });

    return NextResponse.json({
      ...player,
      stats: {
        games_played: gamesPlayed,
        total_score: totalScore,
        average_score: Math.round(averageScore * 100) / 100,
        total_submissions: totalSubmissions || 0,
        score_distribution: scoreDistribution,
        fives_count: scoreDistribution[4],
        ones_count: scoreDistribution[0],
      },
      recent_games: (gameHistory || []).slice(0, 10).map(gh => {
        const game = gamesMap.get(gh.game_id);
        return {
          game_id: game?.id,
          game_code: game?.code,
          score: gh.score,
          date: game?.created_at,
        };
      }),
    });
  } catch (error) {
    console.error('Error in GET /api/players/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/players/[id] - Update player
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServiceClient();
    const body = await request.json();

    const allowedFields = ['display_name', 'avatar'];
    const updates: Record<string, string | null> = {};

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const { data: player, error } = await supabase
      .from('players')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to update player' }, { status: 500 });
    }

    return NextResponse.json(player);
  } catch (error) {
    console.error('Error in PATCH /api/players/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
