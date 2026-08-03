-- 007_expand_reviews_schema.sql
-- Create reviews table for detailed evaluation, feedback, ratings, and XP awarding workflow

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL REFERENCES task_submissions(id) ON DELETE CASCADE,
  reviewer_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  rating INTEGER DEFAULT 5,
  comments TEXT,
  suggestions TEXT,
  improvements TEXT,
  status TEXT DEFAULT 'approved' CHECK(status IN ('approved', 'revision_requested', 'rejected', 'under_review')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reviews_submission_id ON reviews(submission_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_id ON reviews(reviewer_id);

ALTER TABLE users ADD COLUMN xp INTEGER DEFAULT 0;
