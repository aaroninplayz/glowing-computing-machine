import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'forge.db');

export const db = new Database(dbPath);

// Enable WAL mode for performance
db.pragma('journal_mode = WAL');

// Initialize database schema
export function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'OPERATIVE',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      captain_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (captain_id) REFERENCES users (id)
    );

    CREATE TABLE IF NOT EXISTS team_memberships (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      team_id TEXT NOT NULL,
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id),
      FOREIGN KEY (team_id) REFERENCES teams (id),
      UNIQUE(user_id, team_id)
    );

    CREATE TABLE IF NOT EXISTS learning_activities (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      points INTEGER NOT NULL DEFAULT 10,
      requires_proof INTEGER NOT NULL DEFAULT 0,
      requires_approval INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS activity_progress (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      activity_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'NOT_STARTED',
      proof_url TEXT,
      proof_notes TEXT,
      submitted_at DATETIME,
      reviewed_by TEXT,
      reviewed_at DATETIME,
      FOREIGN KEY (user_id) REFERENCES users (id),
      FOREIGN KEY (activity_id) REFERENCES learning_activities (id),
      FOREIGN KEY (reviewed_by) REFERENCES users (id)
    );

    CREATE TABLE IF NOT EXISTS collaborative_challenges (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      points INTEGER NOT NULL DEFAULT 50,
      start_date DATETIME,
      end_date DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS resources (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'General',
      file_type TEXT NOT NULL DEFAULT 'link',
      uploaded_by TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (uploaded_by) REFERENCES users (id)
    );
  `);
}
