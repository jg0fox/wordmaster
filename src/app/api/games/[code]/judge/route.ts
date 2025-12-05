import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { judgeSubmission } from '@/lib/judges';

// POST /api/games/[code]/judge - Trigger AI judgment for current round
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

    // Update game status to judging
    await supabase
      .from('games')
      .update({ status: 'judging' })
      .eq('id', game.id);

    // Get current game task with task details
    const { data: gameTask, error: taskError } = await supabase
      .from('game_tasks')
      .select(`
        *,
        task:tasks(*)
      `)
      .eq('game_id', game.id)
      .eq('round_number', game.current_round)
      .single();

    if (taskError || !gameTask || !gameTask.task) {
      return NextResponse.json({ error: 'No active task' }, { status: 400 });
    }

    // Get all submissions for this task that haven't been judged yet
    const { data: submissions, error: submissionsError } = await supabase
      .from('submissions')
      .select(`
        *,
        player:players(*)
      `)
      .eq('game_task_id', gameTask.id);

    if (submissionsError) {
      return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 500 });
    }

    const results = [];

    // Judge each submission
    for (const submission of submissions || []) {
      // Skip if already judged
      if (submission.ai_score !== null) {
        results.push(submission);
        continue;
      }

      try {
        const judgment = await judgeSubmission(
          gameTask.task,
          submission.content,
          submission.player?.display_name || 'Anonymous'
        );

        // Update submission with judgment
        const { data: updated } = await supabase
          .from('submissions')
          .update({
            ai_score: judgment.score,
            greg_quote: judgment.greg_says,
            alex_quote: judgment.alex_says,
          })
          .eq('id', submission.id)
          .select(`
            *,
            player:players(*)
          `)
          .single();

        // Update player's game score
        if (updated) {
          const { data: gamePlayer } = await supabase
            .from('game_players')
            .select('score')
            .eq('game_id', game.id)
            .eq('player_id', submission.player_id)
            .single();

          if (gamePlayer) {
            await supabase
              .from('game_players')
              .update({ score: gamePlayer.score + judgment.score })
              .eq('game_id', game.id)
              .eq('player_id', submission.player_id);
          }

          results.push(updated);
        }
      } catch (judgeError) {
        console.error('Error judging submission:', judgeError);
        // Continue with other submissions
        results.push({
          ...submission,
          ai_score: 3,
          greg_quote: "Technical difficulties have rendered me temporarily speechless.",
          alex_quote: "I've noted that this submission exists.",
        });
      }
    }

    // Update game status back to active (or keep judging for facilitator to display)
    await supabase
      .from('games')
      .update({ status: 'active' })
      .eq('id', game.id);

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Error in POST /api/games/[code]/judge:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
