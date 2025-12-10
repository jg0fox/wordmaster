import { anthropic, REFLECTION_MODEL } from './anthropic';
import type { ReflectionResponse, Submission, Task, Player } from '@/types/database';

const REFLECTION_SYSTEM_PROMPT = `You are Greg Davies, the Taskmaster—towering, theatrical, and magnificently
judgmental. You've just watched a team of content designers compete in a UX writing game, and now
you're delivering your sardonic observations in the style of the British TV show Taskmaster.

Your task: Provide a brief, entertaining reflection that captures what you witnessed.

CHANNEL GREG DAVIES:
- Theatrical disappointment at mediocrity, genuine delight at creativity
- Dry wit, occasional bewilderment at human choices
- Commanding presence—you're 6'8" and everyone knows it
- Reference specific submissions with mock outrage or surprised approval
- British humor: understated, ironic, occasionally cutting

OUTPUT FORMAT:

Return a JSON object with exactly this structure:
{
  "opening_observation": "A punchy 1-2 sentence Greg-style observation about what you witnessed.
                          Be specific about something that happened. Mock or praise accordingly.",

  "key_insight": {
    "title": "A short, punchy title (4-6 words)",
    "observation": "One specific thing you noticed about how the team approached the tasks.
                    Reference actual submissions if possible. 2-3 sentences max.",
    "question": "A single provocative question for the team to discuss, in Greg's voice"
  },

  "closing_provocation": "A single sentence send-off. Classic Greg: either a backhanded
                          compliment or a theatrical challenge for next time."
}

TONE:
- You ARE Greg Davies. Commit to the bit.
- Theatrical but not mean-spirited
- Find the humor in the specific submissions
- Keep it tight—this should feel like a quick awards-show speech, not a lecture

IMPORTANT: Return ONLY valid JSON. No markdown, no code blocks, just the JSON object.`;

interface SubmissionWithContext {
  task: Task;
  submission: Submission;
  player: Player;
}

interface ReflectionPayload {
  player_count: number;
  rounds_played: number;
  submissions: SubmissionWithContext[];
}

export async function generateReflection(
  payload: ReflectionPayload
): Promise<ReflectionResponse> {
  // Build the submission summary
  const submissionsSummary = payload.submissions.map((s) => ({
    task_title: s.task.title,
    task_description: s.task.description,
    player_name: s.player.display_name,
    content: s.submission.content,
    score: s.submission.ai_score,
    greg_feedback: s.submission.greg_quote,
    alex_feedback: s.submission.alex_quote,
  }));

  // Calculate some stats
  const scores = payload.submissions
    .map((s) => s.submission.ai_score)
    .filter((s): s is number => s !== null);
  const avgScore = scores.length > 0
    ? scores.reduce((a, b) => a + b, 0) / scores.length
    : 0;
  const scoreDistribution = [0, 0, 0, 0, 0];
  scores.forEach((s) => scoreDistribution[s - 1]++);

  const userPrompt = `GAME SESSION SUMMARY:
- Players: ${payload.player_count}
- Rounds played: ${payload.rounds_played}
- Total submissions: ${payload.submissions.length}
- Average score: ${avgScore.toFixed(2)}
- Score distribution: [1: ${scoreDistribution[0]}, 2: ${scoreDistribution[1]}, 3: ${scoreDistribution[2]}, 4: ${scoreDistribution[3]}, 5: ${scoreDistribution[4]}]

ALL SUBMISSIONS:
${JSON.stringify(submissionsSummary, null, 2)}

Analyze this session and generate insights for the team discussion.`;

  const response = await anthropic.messages.create({
    model: REFLECTION_MODEL,
    max_tokens: 2000,
    messages: [
      {
        role: 'user',
        content: userPrompt,
      },
    ],
    system: REFLECTION_SYSTEM_PROMPT,
  });

  // Extract text content
  const textContent = response.content.find((block) => block.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text response from reflection');
  }

  // Parse JSON response
  try {
    return JSON.parse(textContent.text) as ReflectionResponse;
  } catch {
    console.error('Failed to parse reflection response:', textContent.text);
    throw new Error('Failed to parse reflection response');
  }
}
