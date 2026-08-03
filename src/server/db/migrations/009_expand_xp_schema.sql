-- 009_expand_xp_schema.sql
-- Foundational XP Economy Engine Schema Enhancements

-- Ensure level column on users table
ALTER TABLE users ADD COLUMN level INTEGER DEFAULT 1;

-- Expand xp_history columns for reason and awarded_by if not present
ALTER TABLE xp_history ADD COLUMN reason TEXT;
ALTER TABLE xp_history ADD COLUMN awarded_by TEXT REFERENCES users(id) ON DELETE SET NULL;

-- Create indexes for xp_history queries
CREATE INDEX IF NOT EXISTS idx_xp_history_user ON xp_history(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_history_created_at ON xp_history(created_at);
