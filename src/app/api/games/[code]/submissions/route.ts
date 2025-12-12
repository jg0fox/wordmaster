import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

// POST /api/games/[code]/submissions - Submit a response
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const supabase = createServiceClient();
    const body = await request.json();
    const { player_id, content } = body;

    // Validate inputs
    if (!player_id || typeof player_id !== 'string') {
      return NextResponse.json({ error: 'Valid player_id is required' }, { status: 400 });
    }

    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: 'content is required' }, { status: 400 });
    }

    // Sanitize and validate content
    const trimmedContent = content.trim();
    if (trimmedContent.length === 0) {
      return NextResponse.json({ error: 'content cannot be empty' }, { status: 400 });
    }

    if (trimmedContent.length > 5000) {
      return NextResponse.json({ error: 'content exceeds maximum length of 5000 characters' }, { status: 400 });
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

    // Get current game task
    const { data: gameTask, error: taskError } = await supabase
      .from('game_tasks')
      .select('*')
      .eq('game_id', game.id)
      .eq('round_number', game.current_round)
      .single();

    if (taskError || !gameTask) {
      return NextResponse.json({ error: 'No active task' }, { status: 400 });
    }

    // Check if player already submitted (use maybeSingle to avoid error when no match)
    const { data: existingSubmission } = await supabase
      .from('submissions')
      .select('*')
      .eq('game_task_id', gameTask.id)
      .eq('player_id', player_id)
      .maybeSingle();

    if (existingSubmission) {
      // Update existing submission (use trimmed content)
      const { data: updated, error: updateError } = await supabase
        .from('submissions')
        .update({ content: trimmedContent })
        .eq('id', existingSubmission.id)
        .select()
        .single();

      if (updateError) {
        return NextResponse.json({ error: 'Failed to update submission' }, { status: 500 });
      }

      return NextResponse.json(updated);
    }

    // Create new submission (use trimmed content)
    const { data: submission, error: submitError } = await supabase
      .from('submissions')
      .insert({
        game_task_id: gameTask.id,
        player_id,
        content: trimmedContent,
      })
      .select()
      .single();

    if (submitError) {
      console.error('Error creating submission:', submitError);
      return NextResponse.json({ error: 'Failed to submit' }, { status: 500 });
    }

    return NextResponse.json(submission);
  } catch (error) {
    console.error('Error in POST /api/games/[code]/submissions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/games/[code]/submissions - Get submissions for current round or all rounds
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);
    const round = searchParams.get('round');
    const all = searchParams.get('all') === 'true';

    // Get game
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('*')
      .eq('code', code.toUpperCase())
      .single();

    if (gameError || !game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    // If all=true, fetch all submissions grouped by round
    if (all) {
      // Get all game tasks with task details
      const { data: gameTasks } = await supabase
        .from('game_tasks')
        .select(`
          *,
          task:tasks(*)
        `)
        .eq('game_id', game.id)
        .order('round_number', { ascending: true });

      if (!gameTasks || gameTasks.length === 0) {
        return NextResponse.json({ rounds: [] });
      }

      // Get all submissions for all tasks
      const { data: allSubmissions } = await supabase
        .from('submissions')
        .select(`
          *,
          player:players(*)
        `)
        .in('game_task_id', gameTasks.map(gt => gt.id))
        .order('submitted_at', { ascending: true });

      // Group submissions by round
      const rounds = gameTasks.map(gameTask => ({
        round_number: gameTask.round_number,
        task: gameTask.task,
        submissions: (allSubmissions || []).filter(s => s.game_task_id === gameTask.id)
      }));

      return NextResponse.json({ rounds });
    }

    // Single round logic (existing behavior)
    const roundNumber = round ? parseInt(round) : game.current_round;

    // Get game task for the round (use maybeSingle for safe handling)
    const { data: gameTask } = await supabase
      .from('game_tasks')
      .select('*')
      .eq('game_id', game.id)
      .eq('round_number', roundNumber)
      .maybeSingle();

    if (!gameTask) {
      return NextResponse.json({ submissions: [] });
    }

    // Get submissions with player info
    const { data: submissions } = await supabase
      .from('submissions')
      .select(`
        *,
        player:players(*)
      `)
      .eq('game_task_id', gameTask.id)
      .order('submitted_at', { ascending: true });

    return NextResponse.json({ submissions: submissions || [] });
  } catch (error) {
    console.error('Error in GET /api/games/[code]/submissions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
