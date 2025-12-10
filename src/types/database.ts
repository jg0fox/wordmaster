// Database types for Wordwrangler

export type GameStatus = 'lobby' | 'active' | 'judging' | 'leaderboard' | 'reflection' | 'completed';

export interface Player {
  id: string;
  email: string | null;
  display_name: string;
  avatar: string | null;
  created_at: string;
}

export interface Game {
  id: string;
  code: string;
  facilitator_name: string | null;
  status: GameStatus;
  current_round: number;
  total_rounds: number;
  timer_seconds: number;
  timer_started_at: string | null;  // ISO timestamp when timer was started
  timer_paused_remaining: number | null;  // Seconds remaining when paused
  created_at: string;
}

export interface GamePlayer {
  id: string;
  game_id: string;
  player_id: string;
  score: number;
  joined_at: string;
  // Joined from players table
  player?: Player;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  category: string | null;
  suggested_time_seconds: number;
  judging_criteria: string | null;
}

export interface GameTask {
  id: string;
  game_id: string;
  task_id: string;
  round_number: number;
  // Joined from tasks table
  task?: Task;
}

export interface Submission {
  id: string;
  game_task_id: string;
  player_id: string;
  content: string;
  submitted_at: string;
  ai_score: number | null;
  greg_quote: string | null;
  alex_quote: string | null;
  // Joined from players table
  player?: Player;
}

// API Response types
export interface GameWithPlayers extends Game {
  game_players: (GamePlayer & { player: Player })[];
  current_task?: GameTask & { task: Task };
}

export interface LeaderboardEntry {
  player_id: string;
  display_name: string;
  avatar: string | null;
  total_score: number;
  games_played: number;
  average_score: number;
}

// AI Judge response types
export interface JudgmentResponse {
  alex_says: string;
  greg_says: string;
  score: number;
  score_reason: string;
}

// Reflection response types
export interface ReflectionInsight {
  title: string;
  observation: string;
  question_for_team: string;
}

export interface ReflectionSubmission {
  task_title: string;
  submission_excerpt: string;
  player: string;
  why_notable: string;
}

export interface ReflectionResponse {
  opening_observation: string;
  three_insights: ReflectionInsight[];
  the_ai_question: {
    observation: string;
    tension: string;
    reframe: string;
  };
  closing_provocation: string;
  top_submissions_to_discuss: ReflectionSubmission[];
}

// Real-time event types
export type GameEvent =
  | { type: 'player_joined'; player: GamePlayer & { player: Player } }
  | { type: 'player_left'; player_id: string }
  | { type: 'game_started' }
  | { type: 'round_started'; round: number; task: GameTask & { task: Task } }
  | { type: 'submission_received'; player_id: string }
  | { type: 'judgment_started' }
  | { type: 'judgment_complete'; submission: Submission }
  | { type: 'scores_updated'; scores: { player_id: string; score: number }[] }
  | { type: 'reflection_started' }
  | { type: 'reflection_complete'; reflection: ReflectionResponse }
  | { type: 'game_ended' };
