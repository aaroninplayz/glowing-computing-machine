-- 008_expand_announcements_schema.sql
-- Expand announcements table with category, pinned status, and add announcement_reads table for tracking read state

ALTER TABLE announcements ADD COLUMN category TEXT DEFAULT 'General';
ALTER TABLE announcements ADD COLUMN pinned INTEGER DEFAULT 0;

CREATE TABLE IF NOT EXISTS announcement_reads (
  announcement_id TEXT NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (announcement_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_announcements_category ON announcements(category);
CREATE INDEX IF NOT EXISTS idx_announcements_pinned ON announcements(pinned);
CREATE INDEX IF NOT EXISTS idx_announcement_reads_user ON announcement_reads(user_id);
