import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { generateReflection } from '@/lib/reflection';

// GET /api/games/[code]/reflection - Get stored reflection
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const supabase = createServiceClient();

    // Get game with reflection - select all to avoid column issues
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('*')
      .eq('code', code.toUpperCase())
      .single();

    if (gameError) {
      console.error('Error fetching game for reflection:', gameError);
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    if (!game.reflection) {
      return NextResponse.json({ error: 'No reflection available' }, { status: 404 });
    }

    return NextResponse.json(game.reflection);
  } catch (error) {
    console.error('Error in GET /api/games/[code]/reflection:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/games/[code]/reflection - Trigger Opus reflection analysis
export async function POST(
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

    // Update game status to reflection
    await supabase
      .from('games')
      .update({ status: 'reflection' })
      .eq('id', game.id);

    // Get all game tasks with task details
    const { data: gameTasks } = await supabase
      .from('game_tasks')
      .select(`
        *,
        task:tasks(*)
      `)
      .eq('game_id', game.id)
      .order('round_number', { ascending: true });

    // Get all submissions with player info
    const { data: allSubmissions } = await supabase
      .from('submissions')
      .select(`
        *,
        player:players(*)
      `)
      .in('game_task_id', (gameTasks || []).map(gt => gt.id));

    // Get player count
    const { count: playerCount } = await supabase
      .from('game_players')
      .select('*', { count: 'exact', head: true })
      .eq('game_id', game.id);

    // Build reflection payload
    const submissions = [];

    for (const submission of allSubmissions || []) {
      const gameTask = gameTasks?.find(gt => gt.id === submission.game_task_id);
      if (gameTask?.task && submission.player) {
        submissions.push({
          task: gameTask.task,
          submission,
          player: submission.player,
        });
      }
    }

    const reflection = await generateReflection({
      player_count: playerCount || 0,
      rounds_played: game.current_round,
      submissions,
    });

    // Store reflection in database
    const { error: updateError } = await supabase
      .from('games')
      .update({ reflection })
      .eq('id', game.id);

    if (updateError) {
      console.error('Error storing reflection in database:', updateError);
      // Still return the reflection even if storage fails
      // The facilitator will have it, but other views won't
    } else {
      console.log('Reflection stored successfully for game:', game.id);
    }

    return NextResponse.json(reflection);
  } catch (error) {
    console.error('Error in POST /api/games/[code]/reflection:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
