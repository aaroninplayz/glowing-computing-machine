-- 006_expand_submissions_schema.sql
-- Expand task_submissions table and add submission_attachments for multi-proof deliverables and review workflows

ALTER TABLE task_submissions ADD COLUMN version INTEGER DEFAULT 1;
ALTER TABLE task_submissions ADD COLUMN review_notes TEXT;

CREATE TABLE IF NOT EXISTS submission_attachments (
  id TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL REFERENCES task_submissions(id) ON DELETE CASCADE,
  attachment_type TEXT NOT NULL,
  content TEXT NOT NULL,
  file_name TEXT,
  file_size INTEGER,
  mime_type TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sub_attach_sub_id ON submission_attachments(submission_id);
CREATE INDEX IF NOT EXISTS idx_task_submissions_task ON task_submissions(task_id);
