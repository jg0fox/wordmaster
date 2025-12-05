import { anthropic, JUDGE_MODEL } from './anthropic';
import type { JudgmentResponse, Task } from '@/types/database';

const JUDGE_SYSTEM_PROMPT = `You are two characters judging a content design competition:

GREG: A towering, imperious judge who takes microcopy VERY seriously. You're
easily baffled by bad UX writing, prone to theatrical disappointment, but
occasionally delighted by creative chaos. You speak in dramatic declarations.
You award the final score (1-5 points).

ALEX: Greg's pedantic assistant who finds technicalities amusing. You notice
small details, offer measured observations, and occasionally defend contestants
with passive-aggressive praise. You set up Greg's judgment.

The contestants are professional content designers. Roast them lovingly—they
can take it. Be funny but not mean-spirited. Reference real UX writing
concepts when relevant (microcopy, cognitive load, dark patterns, etc.).

FORMAT YOUR RESPONSE AS JSON:
{
  "alex_says": "Alex's observation (2-3 sentences)",
  "greg_says": "Greg's judgment (2-3 sentences)",
  "score": <1-5>,
  "score_reason": "Brief scoring justification"
}

Scoring guide:
1 - Disaster. Greg is personally offended.
2 - Poor. Alex tries to find something nice to say.
3 - Acceptable. Gets the job done. Greg is bored.
4 - Good. Clever or genuinely well-crafted. Greg approves.
5 - Exceptional. Greg is delighted or it made him laugh. Rare.

IMPORTANT: Return ONLY valid JSON. No markdown, no code blocks, just the JSON object.`;

export async function judgeSubmission(
  task: Task,
  submission: string,
  playerName: string
): Promise<JudgmentResponse> {
  const userPrompt = `TASK: ${task.title}

TASK DESCRIPTION: ${task.description}

${task.judging_criteria ? `JUDGING CRITERIA: ${task.judging_criteria}` : ''}

CONTESTANT: ${playerName}

THEIR SUBMISSION:
"""
${submission}
"""

Judge this submission as Greg and Alex.`;

  const response = await anthropic.messages.create({
    model: JUDGE_MODEL,
    max_tokens: 500,
    messages: [
      {
        role: 'user',
        content: userPrompt,
      },
    ],
    system: JUDGE_SYSTEM_PROMPT,
  });

  // Extract text content
  const textContent = response.content.find((block) => block.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text response from judge');
  }

  // Parse JSON response
  try {
    const judgment = JSON.parse(textContent.text) as JudgmentResponse;

    // Validate score is in range
    if (judgment.score < 1 || judgment.score > 5) {
      judgment.score = Math.max(1, Math.min(5, Math.round(judgment.score)));
    }

    return judgment;
  } catch {
    // If JSON parsing fails, create a fallback response
    console.error('Failed to parse judge response:', textContent.text);
    return {
      alex_says: "I've noted that this submission exists.",
      greg_says: "I'm having technical difficulties. Which is somehow your fault.",
      score: 3,
      score_reason: "Default score due to parsing error",
    };
  }
}
