import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { generateReflection } from '@/lib/reflection';

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

    return NextResponse.json(reflection);
  } catch (error) {
    console.error('Error in POST /api/games/[code]/reflection:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
