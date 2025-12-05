-- Wordmaster Database Schema
-- Run this in Supabase SQL Editor

-- Teams (persistent)
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Players (persistent across games)
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  display_name VARCHAR(50) NOT NULL,
  avatar VARCHAR(50),
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Games
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(6) UNIQUE NOT NULL,
  facilitator_name VARCHAR(100),
  status VARCHAR(20) DEFAULT 'lobby' CHECK (status IN ('lobby', 'active', 'judging', 'reflection', 'completed')),
  current_round INTEGER DEFAULT 0,
  total_rounds INTEGER DEFAULT 5,
  timer_seconds INTEGER DEFAULT 180,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Game Players (which players joined which game)
CREATE TABLE game_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  score INTEGER DEFAULT 0,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(game_id, player_id)
);

-- Tasks (pre-seeded)
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(50),
  suggested_time_seconds INTEGER DEFAULT 180,
  judging_criteria TEXT
);

-- Game Tasks (which tasks for which game)
CREATE TABLE game_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL
);

-- Submissions
CREATE TABLE submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_task_id UUID REFERENCES game_tasks(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ai_score INTEGER CHECK (ai_score >= 1 AND ai_score <= 5),
  greg_quote TEXT,
  alex_quote TEXT,
  UNIQUE(game_task_id, player_id)
);

-- Indexes for performance
CREATE INDEX idx_players_email ON players(email);
CREATE INDEX idx_players_team ON players(team_id);
CREATE INDEX idx_games_code ON games(code);
CREATE INDEX idx_games_status ON games(status);
CREATE INDEX idx_game_players_game ON game_players(game_id);
CREATE INDEX idx_game_players_player ON game_players(player_id);
CREATE INDEX idx_game_tasks_game ON game_tasks(game_id);
CREATE INDEX idx_submissions_game_task ON submissions(game_task_id);
CREATE INDEX idx_submissions_player ON submissions(player_id);

-- Enable Row Level Security
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies (permissive for now - can tighten later)
-- Everyone can read teams
CREATE POLICY "Teams are viewable by everyone" ON teams FOR SELECT USING (true);
CREATE POLICY "Teams can be created by anyone" ON teams FOR INSERT WITH CHECK (true);

-- Everyone can read players
CREATE POLICY "Players are viewable by everyone" ON players FOR SELECT USING (true);
CREATE POLICY "Players can be created by anyone" ON players FOR INSERT WITH CHECK (true);
CREATE POLICY "Players can update themselves" ON players FOR UPDATE USING (true);

-- Games are public
CREATE POLICY "Games are viewable by everyone" ON games FOR SELECT USING (true);
CREATE POLICY "Games can be created by anyone" ON games FOR INSERT WITH CHECK (true);
CREATE POLICY "Games can be updated by anyone" ON games FOR UPDATE USING (true);

-- Game players
CREATE POLICY "Game players are viewable by everyone" ON game_players FOR SELECT USING (true);
CREATE POLICY "Anyone can join a game" ON game_players FOR INSERT WITH CHECK (true);
CREATE POLICY "Game players can be updated" ON game_players FOR UPDATE USING (true);
CREATE POLICY "Game players can be removed" ON game_players FOR DELETE USING (true);

-- Tasks are public (read-only for players)
CREATE POLICY "Tasks are viewable by everyone" ON tasks FOR SELECT USING (true);
CREATE POLICY "Tasks can be created by anyone" ON tasks FOR INSERT WITH CHECK (true);

-- Game tasks
CREATE POLICY "Game tasks are viewable by everyone" ON game_tasks FOR SELECT USING (true);
CREATE POLICY "Game tasks can be created by anyone" ON game_tasks FOR INSERT WITH CHECK (true);

-- Submissions
CREATE POLICY "Submissions are viewable by everyone" ON submissions FOR SELECT USING (true);
CREATE POLICY "Anyone can create submissions" ON submissions FOR INSERT WITH CHECK (true);
CREATE POLICY "Submissions can be updated" ON submissions FOR UPDATE USING (true);

-- Enable Realtime for relevant tables
ALTER PUBLICATION supabase_realtime ADD TABLE games;
ALTER PUBLICATION supabase_realtime ADD TABLE game_players;
ALTER PUBLICATION supabase_realtime ADD TABLE submissions;
