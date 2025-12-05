import { anthropic, REFLECTION_MODEL } from './anthropic';
import type { ReflectionResponse, Submission, Task, Player } from '@/types/database';

const REFLECTION_SYSTEM_PROMPT = `You are facilitating a reflective discussion for a team of content designers who just
played a competitive UX writing game. You have access to all their submissions and scores.

Your task: Analyze the session and generate insights that help the team discuss this question:

"How do we make our real content design work as interesting, rewarding, and compelling
as playing this game—especially in an age when AI can both diminish and enhance our
ability to participate meaningfully in our craft?"

ANALYZE THESE DIMENSIONS:

1. CREATIVE RISK PATTERNS
- Which submissions took genuine creative risks vs. played it safe?
- Did risk-taking correlate with scores? With player satisfaction?
- What conditions made risk feel safe here that don't exist in daily work?

2. THE ENGAGEMENT GAP
- What made writing absurd error messages more engaging than real ones?
- Identify specific elements: time pressure, competition, humor permission,
  immediate feedback, low stakes, clear constraints, audience energy
- Which of these could realistically transfer to actual workflows?

3. CONSTRAINTS AS LIBERATION
- Analyze how arbitrary constraints (haiku, forbidden words, character limits)
  affected output quality and creativity
- Compare to how constraints function in real content work (brand guidelines,
  legal review, localization requirements)
- What's the difference between constraints that energize vs. constraints that drain?

4. FEEDBACK & RECOGNITION
- The AI judges gave immediate, theatrical feedback. Real feedback often takes days/weeks
  and comes as tracked changes.
- What elements of the game's feedback loop could inform better critique processes?
- How does personality in feedback (even artificial personality) affect reception?

5. THE AI PARADOX
- These designers just competed at tasks AI can technically perform.
- Yet they found it engaging. Why?
- What does this suggest about what humans actually need from creative work?
- How might AI collaboration be structured to preserve these needs rather than
  eliminate them?

6. MEANINGFUL WORK IN THE AGE OF AI
- Content design is increasingly AI-adjacent: AI drafts, humans refine, AI scales.
- What aspects of content work should humans fight to keep? What should we
  happily delegate?
- How do we maintain craft identity when the craft is changing?
- What would it look like to feel as engaged in AI-assisted work as in this game?

OUTPUT FORMAT:

Return a JSON object:
{
  "opening_observation": "A provocative 2-sentence observation that names what you saw
                          in the submissions—specific, not generic",

  "three_insights": [
    {
      "title": "Short punchy title",
      "observation": "What you noticed in the data (specific examples)",
      "question_for_team": "A discussion question this raises"
    },
    // ... two more
  ],

  "the_ai_question": {
    "observation": "What the session reveals about human vs. AI creative work",
    "tension": "The genuine tension content designers face",
    "reframe": "A more generative way to think about AI collaboration"
  },

  "closing_provocation": "A single sentence challenge or invitation for the team
                          to take back to their real work",

  "top_submissions_to_discuss": [
    {
      "task_title": "Which task",
      "submission_excerpt": "Brief quote (15 words max)",
      "player": "Who wrote it",
      "why_notable": "Why this one sparks discussion"
    },
    // 2-3 submissions worth discussing as a group
  ]
}

TONE:
- Intellectually honest, not cheerleader-y
- Acknowledge real tensions (AI might actually take some of this work)
- But also genuinely curious about what makes work meaningful
- Treat the team as smart professionals who can handle complexity
- Avoid corporate facilitation clichés ("let's unpack that", "lean in")

Remember: This is a real team having a real conversation about the future of their
profession. Make it count.

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
    team: s.player.team?.name || 'No team',
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
