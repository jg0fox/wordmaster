import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

// GET /api/games/[code] - Get game state with players and current task
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

    // Get players with their player info
    const { data: gamePlayers } = await supabase
      .from('game_players')
      .select(`
        *,
        player:players(*)
      `)
      .eq('game_id', game.id)
      .order('joined_at', { ascending: true });

    // Get current task if game is active
    let currentTask = null;
    if (game.current_round > 0) {
      const { data: gameTask } = await supabase
        .from('game_tasks')
        .select(`
          *,
          task:tasks(*)
        `)
        .eq('game_id', game.id)
        .eq('round_number', game.current_round)
        .single();

      currentTask = gameTask;
    }

    // Get all game tasks for this game
    const { data: allGameTasks } = await supabase
      .from('game_tasks')
      .select(`
        *,
        task:tasks(*)
      `)
      .eq('game_id', game.id)
      .order('round_number', { ascending: true });

    return NextResponse.json({
      ...game,
      game_players: gamePlayers || [],
      current_task: currentTask,
      game_tasks: allGameTasks || [],
    });
  } catch (error) {
    console.error('Error in GET /api/games/[code]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/games/[code] - Update game state
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const supabase = createServiceClient();
    const body = await request.json();

    // Get game first
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('*')
      .eq('code', code.toUpperCase())
      .single();

    if (gameError || !game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    // Allowed updates
    const allowedFields = ['status', 'current_round', 'timer_seconds', 'timer_started_at', 'timer_paused_remaining'];
    const updates: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    // Update game
    const { data: updatedGame, error: updateError } = await supabase
      .from('games')
      .update(updates)
      .eq('id', game.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating game:', updateError);
      return NextResponse.json({ error: 'Failed to update game' }, { status: 500 });
    }

    return NextResponse.json(updatedGame);
  } catch (error) {
    console.error('Error in PATCH /api/games/[code]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/games/[code] - End/delete game
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const supabase = createServiceClient();

    const { error } = await supabase
      .from('games')
      .delete()
      .eq('code', code.toUpperCase());

    if (error) {
      return NextResponse.json({ error: 'Failed to delete game' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/games/[code]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
