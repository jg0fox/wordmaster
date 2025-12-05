import Anthropic from '@anthropic-ai/sdk';

// Initialize Anthropic client
export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

// Model constants
export const JUDGE_MODEL = 'claude-sonnet-4-20250514'; // Fast, theatrical judging
export const REFLECTION_MODEL = 'claude-opus-4-20250514'; // Deep analysis
