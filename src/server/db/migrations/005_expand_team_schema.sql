-- 005_expand_team_schema.sql
-- Expand team schema to support member locking and team history tracking

ALTER TABLE team_memberships ADD COLUMN is_locked INTEGER DEFAULT 0;

CREATE TABLE IF NOT EXISTS team_history (
  id TEXT PRIMARY KEY,
  team_id TEXT,
  team_name TEXT NOT NULL,
  captain_id TEXT,
  action TEXT NOT NULL,
  details TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_team_history_team ON team_history(team_id);
CREATE INDEX IF NOT EXISTS idx_team_history_created ON team_history(created_at);
