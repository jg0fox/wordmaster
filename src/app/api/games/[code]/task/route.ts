import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

// POST /api/games/[code]/task - Set task for current/next round
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const supabase = createServiceClient();
    const body = await request.json();
    const { task_id, round_number } = body;

    if (!task_id) {
      return NextResponse.json({ error: 'task_id is required' }, { status: 400 });
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

    // Determine round number (use provided or current + 1)
    const targetRound = round_number || game.current_round + 1;

    // Check if a game_task already exists for this round
    const { data: existingTask } = await supabase
      .from('game_tasks')
      .select('id')
      .eq('game_id', game.id)
      .eq('round_number', targetRound)
      .single();

    if (existingTask) {
      // Update existing
      const { error: updateError } = await supabase
        .from('game_tasks')
        .update({ task_id })
        .eq('id', existingTask.id);

      if (updateError) {
        console.error('Error updating game task:', updateError);
        return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
      }
    } else {
      // Create new
      const { error: insertError } = await supabase
        .from('game_tasks')
        .insert({
          game_id: game.id,
          task_id,
          round_number: targetRound,
        });

      if (insertError) {
        console.error('Error creating game task:', insertError);
        return NextResponse.json({ error: 'Failed to set task' }, { status: 500 });
      }
    }

    // Fetch the task details to return
    const { data: task } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', task_id)
      .single();

    return NextResponse.json({
      success: true,
      round_number: targetRound,
      task,
    });
  } catch (error) {
    console.error('Error in POST /api/games/[code]/task:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
