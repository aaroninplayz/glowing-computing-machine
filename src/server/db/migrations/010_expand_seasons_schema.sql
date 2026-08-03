-- Migration 010: Seasons & Expanded Hall of Fame Schema

CREATE TABLE IF NOT EXISTS seasons (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  is_current INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert default Season 1 if empty
INSERT OR IGNORE INTO seasons (id, name, start_date, end_date, status, is_current)
VALUES ('season_1', 'Season 1: Foundation', '2026-01-01', '2026-12-31', 'ACTIVE', 1);

-- Add season_id column to hall_of_fame_titles
ALTER TABLE hall_of_fame_titles ADD COLUMN season_id TEXT REFERENCES seasons(id);
