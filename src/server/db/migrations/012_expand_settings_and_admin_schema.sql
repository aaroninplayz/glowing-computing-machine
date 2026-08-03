-- Migration 012: System Config and Feature Toggles Schema

CREATE TABLE IF NOT EXISTS system_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS feature_toggles (
  key TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_enabled INTEGER NOT NULL DEFAULT 1,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Seed default system config values
INSERT OR IGNORE INTO system_config (key, value) VALUES
  ('site_title', 'Forge Platform'),
  ('allow_user_registration', 'true'),
  ('max_task_submissions_per_day', '10');

-- Seed default feature toggles
INSERT OR IGNORE INTO feature_toggles (key, name, description, is_enabled) VALUES
  ('leaderboard', 'Community Leaderboard', 'Enable or disable the XP and honors leaderboard page', 1),
  ('marketplace', 'Points Marketplace', 'Enable or disable points marketplace and rewards', 1),
  ('submissions', 'Task Submissions', 'Allow students to submit completed tasks', 1),
  ('challenges', 'Weekly Challenges', 'Enable interactive coding challenges', 1),
  ('xp_economy', 'XP Economy Engine', 'Enable automatic experience points awarding', 1);

-- Add is_suspended column to users table if missing
ALTER TABLE users ADD COLUMN is_suspended INTEGER DEFAULT 0;
