-- Migration: Remove Teams
-- Teams are being removed - players play individually

-- Drop the index on team_id first
DROP INDEX IF EXISTS idx_players_team;

-- Remove the team_id column from players
ALTER TABLE players DROP COLUMN IF EXISTS team_id;

-- Drop team-related RLS policies
DROP POLICY IF EXISTS "Teams are viewable by everyone" ON teams;
DROP POLICY IF EXISTS "Teams can be created by anyone" ON teams;

-- Drop the teams table
DROP TABLE IF EXISTS teams;

-- Also add the 'leaderboard' status to games (if not already added)
ALTER TABLE games DROP CONSTRAINT IF EXISTS games_status_check;
ALTER TABLE games ADD CONSTRAINT games_status_check
  CHECK (status IN ('lobby', 'active', 'judging', 'leaderboard', 'reflection', 'completed'));

-- Add timer columns if they don't exist (for pause/resume functionality)
ALTER TABLE games ADD COLUMN IF NOT EXISTS timer_started_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE games ADD COLUMN IF NOT EXISTS timer_paused_remaining INTEGER;
