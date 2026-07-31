import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'forge.db');

export const db = new Database(dbPath);

// Enable Foreign Key constraints and WAL mode
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'OPERATIVE',
      tag TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS student_leader_rotations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      term_start DATETIME NOT NULL,
      term_end DATETIME NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      total_points INTEGER NOT NULL DEFAULT 10,
      is_marketplace INTEGER NOT NULL DEFAULT 0,
      assigned_team_id TEXT,
      assigned_user_id TEXT,
      assigned_by TEXT,
      requires_proof INTEGER NOT NULL DEFAULT 0,
      due_date DATETIME,
      status TEXT NOT NULL DEFAULT 'AVAILABLE',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (assigned_team_id) REFERENCES teams (id) ON DELETE SET NULL,
      FOREIGN KEY (assigned_user_id) REFERENCES users (id) ON DELETE SET NULL,
      FOREIGN KEY (assigned_by) REFERENCES users (id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      captain_id TEXT,
      task_id TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      dissolved_at DATETIME,
      dissolution_reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (captain_id) REFERENCES users (id) ON DELETE SET NULL,
      FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS team_memberships (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      team_id TEXT NOT NULL,
      custom_point_share REAL NOT NULL DEFAULT 1.0,
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (team_id) REFERENCES teams (id) ON DELETE CASCADE,
      UNIQUE(user_id, team_id)
    );

    CREATE TABLE IF NOT EXISTS task_upvotes (
      task_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (task_id, user_id),
      FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS task_submissions (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      submitted_by TEXT NOT NULL,
      proof_url TEXT,
      proof_notes TEXT,
      status TEXT NOT NULL DEFAULT 'PENDING',
      reviewed_by TEXT,
      reviewed_at DATETIME,
      submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE,
      FOREIGN KEY (submitted_by) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (reviewed_by) REFERENCES users (id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS hall_of_fame_titles (
      id TEXT PRIMARY KEY,
      title_name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'Academics',
      awarded_to_user_id TEXT,
      awarded_to_team_id TEXT,
      season TEXT NOT NULL DEFAULT 'Season 1',
      awarded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (awarded_to_user_id) REFERENCES users (id) ON DELETE SET NULL,
      FOREIGN KEY (awarded_to_team_id) REFERENCES teams (id) ON DELETE SET NULL
    );
  `);
}
