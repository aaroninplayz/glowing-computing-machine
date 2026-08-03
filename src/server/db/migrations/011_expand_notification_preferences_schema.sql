-- Migration 011: Notification Preferences Schema

CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  email_enabled INTEGER NOT NULL DEFAULT 1,
  task_alerts INTEGER NOT NULL DEFAULT 1,
  review_alerts INTEGER NOT NULL DEFAULT 1,
  system_alerts INTEGER NOT NULL DEFAULT 1,
  social_alerts INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
