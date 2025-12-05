import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

// GET /api/leaderboards/teams - All-time team leaderboard
export async function GET() {
  try {
    const supabase = createServiceClient();

    // Get all teams
    const { data: teams } = await supabase
      .from('teams')
      .select('id, name');

    if (!teams || teams.length === 0) {
      return NextResponse.json([]);
    }

    // Get all players with their teams
    const { data: players } = await supabase
      .from('players')
      .select('id, team_id');

    // Get all game scores
    const { data: gameScores } = await supabase
      .from('game_players')
      .select(`
        player_id,
        score,
        game_id
      `);

    // Get all games to check status
    const { data: games } = await supabase
      .from('games')
      .select('id, status');

    const completedGameIds = new Set(
      (games || []).filter(g => g.status === 'completed').map(g => g.id)
    );

    // Calculate stats for each team
    const teamStats = teams.map(team => {
      const teamPlayers = (players || []).filter(p => p.team_id === team.id);
      const teamPlayerIds = teamPlayers.map(p => p.id);

      const teamGameScores = (gameScores || []).filter(
        gs => teamPlayerIds.includes(gs.player_id) && completedGameIds.has(gs.game_id)
      );

      const totalScore = teamGameScores.reduce((sum, g) => sum + g.score, 0);

      // Count unique games
      const uniqueGameIds = new Set(teamGameScores.map(gs => gs.game_id));
      const gamesPlayed = uniqueGameIds.size;

      const averageScore = teamGameScores.length > 0
        ? totalScore / teamGameScores.length
        : 0;

      return {
        team_id: team.id,
        team_name: team.name,
        total_score: totalScore,
        games_played: gamesPlayed,
        player_count: teamPlayers.length,
        average_score: Math.round(averageScore * 100) / 100,
      };
    });

    // Sort by total score descending
    const sorted = teamStats
      .filter(t => t.games_played > 0)
      .sort((a, b) => b.total_score - a.total_score);

    // Add ranks
    const leaderboard = sorted.map((team, index) => ({
      rank: index + 1,
      ...team,
    }));

    return NextResponse.json(leaderboard);
  } catch (error) {
    console.error('Error in GET /api/leaderboards/teams:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
