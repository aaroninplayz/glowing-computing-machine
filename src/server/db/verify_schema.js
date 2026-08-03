import { db, initSchema } from './database.js';

export function verifySchema() {
  console.log('🔍 Running Database Schema Verification...');
  initSchema();

  const expectedTables = [
    'users',
    'student_leader_rotations',
    'teams',
    'tasks',
    'task_upvotes',
    'team_memberships',
    'task_submissions',
    'hall_of_fame_titles',
    'system_settings',
    'schema_migrations',
    'channels',
    'messages',
    'forum_threads',
    'forum_posts',
    'calendar_events',
    'todos',
    'journal_entries',
    'badges',
    'user_badges',
    'notifications',
    'activity_log',
    'announcements',
    'votes',
    'subtasks',
    'xp_history',
    'streaks',
    'achievements',
    'marketplace_suggestions',
    'team_history',
    'submission_attachments',
    'reviews',
    'announcement_reads',
    'seasons',
    'notification_preferences',
    'feature_toggles'
  ];

  const actualTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
    .all()
    .map(row => row.name);

  console.log(`Found ${actualTables.length} tables in database.`);

  const missingTables = expectedTables.filter(table => !actualTables.includes(table));
  if (missingTables.length > 0) {
    console.error('❌ Missing tables:', missingTables);
    throw new Error(`Schema verification failed. Missing ${missingTables.length} tables.`);
  }

  // Verify migrations applied
  const migrations = db.prepare('SELECT name, applied_at FROM schema_migrations').all();
  console.log('Applied Migrations:', migrations);
  if (migrations.length < 12) {
    throw new Error(`Expected at least 12 migrations, found ${migrations.length}`);
  }

  // Verify users table columns
  const userColumns = db.prepare("PRAGMA table_info(users)").all().map(c => c.name);
  const requiredUserColumns = ['xp', 'level'];
  const missingUserCols = requiredUserColumns.filter(col => !userColumns.includes(col));
  if (missingUserCols.length > 0) {
    throw new Error(`Users table is missing required columns: ${missingUserCols.join(', ')}`);
  }

  // Verify xp_history table columns
  const xpHistoryColumns = db.prepare("PRAGMA table_info(xp_history)").all().map(c => c.name);
  const requiredXpHistoryColumns = ['id', 'user_id', 'amount', 'reason', 'source_type', 'source_id', 'awarded_by', 'created_at'];
  const missingXpHistoryCols = requiredXpHistoryColumns.filter(col => !xpHistoryColumns.includes(col));
  if (missingXpHistoryCols.length > 0) {
    throw new Error(`xp_history table is missing required columns: ${missingXpHistoryCols.join(', ')}`);
  }

  // Verify tasks table columns

  // Verify tasks table columns
  const taskColumns = db.prepare("PRAGMA table_info(tasks)").all().map(c => c.name);
  const requiredTaskColumns = ['instructions', 'resources', 'deadline', 'difficulty', 'xp_reward', 'badge_reward', 'proof_requirements'];
  const missingTaskCols = requiredTaskColumns.filter(col => !taskColumns.includes(col));
  if (missingTaskCols.length > 0) {
    throw new Error(`Tasks table is missing required columns: ${missingTaskCols.join(', ')}`);
  }

  // Verify subtasks table columns
  const subtaskColumns = db.prepare("PRAGMA table_info(subtasks)").all().map(c => c.name);
  const requiredSubtaskColumns = ['description', 'priority', 'deadline', 'status', 'created_by', 'attachments', 'comments'];
  const missingSubtaskCols = requiredSubtaskColumns.filter(col => !subtaskColumns.includes(col));
  if (missingSubtaskCols.length > 0) {
    throw new Error(`Subtasks table is missing required columns: ${missingSubtaskCols.join(', ')}`);
  }

  // Verify team_memberships table is_locked column
  const tmColumns = db.prepare("PRAGMA table_info(team_memberships)").all().map(c => c.name);
  if (!tmColumns.includes('is_locked')) {
    throw new Error('team_memberships table is missing required column: is_locked');
  }

  // Verify task_submissions table columns
  const subColumns = db.prepare("PRAGMA table_info(task_submissions)").all().map(c => c.name);
  const requiredSubCols = ['version', 'status', 'review_notes', 'reviewed_by', 'reviewed_at'];
  const missingSubCols = requiredSubCols.filter(col => !subColumns.includes(col));
  if (missingSubCols.length > 0) {
    throw new Error(`task_submissions table is missing required columns: ${missingSubCols.join(', ')}`);
  }

  // Verify submission_attachments table columns
  const attachColumns = db.prepare("PRAGMA table_info(submission_attachments)").all().map(c => c.name);
  const requiredAttachCols = ['submission_id', 'attachment_type', 'content'];
  const missingAttachCols = requiredAttachCols.filter(col => !attachColumns.includes(col));
  if (missingAttachCols.length > 0) {
    throw new Error(`submission_attachments table is missing required columns: ${missingAttachCols.join(', ')}`);
  }

  // Verify reviews table columns
  const reviewColumns = db.prepare("PRAGMA table_info(reviews)").all().map(c => c.name);
  const requiredReviewCols = ['submission_id', 'reviewer_id', 'rating', 'comments', 'suggestions', 'improvements', 'status'];
  const missingReviewCols = requiredReviewCols.filter(col => !reviewColumns.includes(col));
  if (missingReviewCols.length > 0) {
    throw new Error(`reviews table is missing required columns: ${missingReviewCols.join(', ')}`);
  }

  // Verify announcements expanded columns
  const annColumns = db.prepare("PRAGMA table_info(announcements)").all().map(c => c.name);
  const requiredAnnCols = ['category', 'pinned'];
  const missingAnnCols = requiredAnnCols.filter(col => !annColumns.includes(col));
  if (missingAnnCols.length > 0) {
    throw new Error(`announcements table is missing required columns: ${missingAnnCols.join(', ')}`);
  }

  // Verify announcement_reads table columns
  const readColumns = db.prepare("PRAGMA table_info(announcement_reads)").all().map(c => c.name);
  const requiredReadCols = ['announcement_id', 'user_id', 'read_at'];
  const missingReadCols = requiredReadCols.filter(col => !readColumns.includes(col));
  if (missingReadCols.length > 0) {
    throw new Error(`announcement_reads table is missing required columns: ${missingReadCols.join(', ')}`);
  }

  // Verify foreign key integrity
  const fkErrors = db.prepare('PRAGMA foreign_key_check').all();
  if (fkErrors.length > 0) {
    console.error('❌ Foreign key integrity errors found:', fkErrors);
    throw new Error('Foreign key integrity check failed.');
  }

  // Count indexes
  const indexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%'").all();
  console.log(`Found ${indexes.length} indexes in database.`);

  console.log('✅ ALL DATABASE SCHEMA CHECKS PASSED SUCCESSFULLY!');
}

if (process.argv[1] && process.argv[1].endsWith('verify_schema.js')) {
  verifySchema();
}
