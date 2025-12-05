import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

// GET /api/leaderboards/players - All-time player leaderboard
export async function GET() {
  try {
    const supabase = createServiceClient();

    // Get all players with their game history
    const { data: players } = await supabase
      .from('players')
      .select(`
        id,
        display_name,
        avatar,
        team:teams(name)
      `);

    if (!players || players.length === 0) {
      return NextResponse.json([]);
    }

    // Get game scores for all players
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

    // Calculate stats for each player
    const playerStats = players.map(player => {
      const playerGames = (gameScores || []).filter(
        gs => gs.player_id === player.id && completedGameIds.has(gs.game_id)
      );

      const totalScore = playerGames.reduce((sum, g) => sum + g.score, 0);
      const gamesPlayed = playerGames.length;
      const averageScore = gamesPlayed > 0 ? totalScore / gamesPlayed : 0;

      // Handle team which might be an array or single object
      const team = Array.isArray(player.team) ? player.team[0] : player.team;

      return {
        player_id: player.id,
        display_name: player.display_name,
        avatar: player.avatar,
        team_name: team?.name || null,
        total_score: totalScore,
        games_played: gamesPlayed,
        average_score: Math.round(averageScore * 100) / 100,
      };
    });

    // Sort by total score descending
    const sorted = playerStats
      .filter(p => p.games_played > 0)
      .sort((a, b) => b.total_score - a.total_score);

    // Add ranks
    const leaderboard = sorted.map((player, index) => ({
      rank: index + 1,
      ...player,
    }));

    return NextResponse.json(leaderboard);
  } catch (error) {
    console.error('Error in GET /api/leaderboards/players:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
