import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient, generateGameCode } from '@/lib/supabase';

// POST /api/games - Create a new game
export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const body = await request.json();
    const { facilitator_name, total_rounds = 5, timer_seconds = 180 } = body;

    // Generate unique game code
    let code = generateGameCode();
    let attempts = 0;

    // Make sure code is unique
    while (attempts < 10) {
      const { data: existing } = await supabase
        .from('games')
        .select('id')
        .eq('code', code)
        .single();

      if (!existing) break;
      code = generateGameCode();
      attempts++;
    }

    // Create the game
    const { data: game, error } = await supabase
      .from('games')
      .insert({
        code,
        facilitator_name,
        total_rounds,
        timer_seconds,
        status: 'lobby',
        current_round: 0,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating game:', error);
      return NextResponse.json({ error: 'Failed to create game' }, { status: 500 });
    }

    // Select random tasks for this game
    const { data: allTasks } = await supabase
      .from('tasks')
      .select('id');

    if (allTasks && allTasks.length >= total_rounds) {
      // Shuffle and pick tasks
      const shuffled = allTasks.sort(() => Math.random() - 0.5);
      const selectedTasks = shuffled.slice(0, total_rounds);

      // Create game_tasks entries
      const gameTasks = selectedTasks.map((task, index) => ({
        game_id: game.id,
        task_id: task.id,
        round_number: index + 1,
      }));

      await supabase.from('game_tasks').insert(gameTasks);
    }

    return NextResponse.json(game);
  } catch (error) {
    console.error('Error in POST /api/games:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/games - List recent games (for admin/debug)
export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');

    let query = supabase
      .from('games')
      .select(`
        *,
        game_players(count)
      `)
      .order('created_at', { ascending: false })
      .limit(Math.min(limit, 100));

    // Filter by status if provided
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: games, error } = await query;

    if (error) {
      console.error('Error fetching games:', error);
      return NextResponse.json({ error: 'Failed to fetch games' }, { status: 500 });
    }

    // Transform to include player count
    const gamesWithCounts = games?.map(game => ({
      ...game,
      player_count: game.game_players?.[0]?.count || 0,
      game_players: undefined, // Remove the raw data
    })) || [];

    return NextResponse.json(gamesWithCounts);
  } catch (error) {
    console.error('Error in GET /api/games:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
