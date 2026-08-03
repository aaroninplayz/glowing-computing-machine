-- 004_expand_subtasks_schema.sql
-- Expand subtasks table schema to support detailed subtask management and tracking

ALTER TABLE subtasks ADD COLUMN description TEXT;
ALTER TABLE subtasks ADD COLUMN priority TEXT DEFAULT 'medium';
ALTER TABLE subtasks ADD COLUMN deadline DATETIME;
ALTER TABLE subtasks ADD COLUMN status TEXT DEFAULT 'todo';
ALTER TABLE subtasks ADD COLUMN created_by TEXT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE subtasks ADD COLUMN attachments TEXT;
ALTER TABLE subtasks ADD COLUMN comments TEXT;
