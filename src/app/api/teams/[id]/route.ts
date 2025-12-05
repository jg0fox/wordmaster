import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

// GET /api/teams/[id] - Get team with stats
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServiceClient();

    // Get team
    const { data: team, error } = await supabase
      .from('teams')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Get team members
    const { data: members } = await supabase
      .from('players')
      .select('*')
      .eq('team_id', id)
      .order('display_name', { ascending: true });

    // Get team stats from game_players
    const memberIds = (members || []).map(m => m.id);

    if (memberIds.length === 0) {
      return NextResponse.json({
        ...team,
        members: [],
        stats: {
          total_score: 0,
          games_played: 0,
          average_score: 0,
          player_count: 0,
        },
      });
    }

    const { data: gameHistory } = await supabase
      .from('game_players')
      .select(`
        score,
        player_id,
        game_id
      `)
      .in('player_id', memberIds);

    // Get all games to check status
    const { data: games } = await supabase
      .from('games')
      .select('id, status');

    const completedGameIds = new Set(
      (games || []).filter(g => g.status === 'completed').map(g => g.id)
    );

    // Calculate stats
    const completedGames = (gameHistory || []).filter(
      gh => completedGameIds.has(gh.game_id)
    );

    const totalScore = completedGames.reduce((sum, gh) => sum + gh.score, 0);

    // Count unique games
    const uniqueGameIds = new Set(completedGames.map(gh => gh.game_id));
    const gamesPlayed = uniqueGameIds.size;

    const averageScore = gamesPlayed > 0 ? totalScore / completedGames.length : 0;

    return NextResponse.json({
      ...team,
      members: members || [],
      stats: {
        total_score: totalScore,
        games_played: gamesPlayed,
        average_score: Math.round(averageScore * 100) / 100,
        player_count: members?.length || 0,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/teams/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/teams/[id] - Delete team
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServiceClient();

    // Remove team from players first
    await supabase
      .from('players')
      .update({ team_id: null })
      .eq('team_id', id);

    // Delete team
    const { error } = await supabase
      .from('teams')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: 'Failed to delete team' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/teams/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
