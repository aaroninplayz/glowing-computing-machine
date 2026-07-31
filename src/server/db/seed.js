import { db, initSchema } from './database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🌱 Initializing Forge database schema & testing data...');

// Drop tables if existing to reset schema
db.pragma('foreign_keys = OFF');
db.exec(`
  DROP TABLE IF EXISTS hall_of_fame_titles;
  DROP TABLE IF EXISTS task_submissions;
  DROP TABLE IF EXISTS tasks;
  DROP TABLE IF EXISTS team_memberships;
  DROP TABLE IF EXISTS teams;
  DROP TABLE IF EXISTS users;
`);
db.pragma('foreign_keys = ON');

// Re-initialize fresh schema
initSchema();

// Insert Seed Users (Flexible Auth: Email, Username, Phone)
const insertUser = db.prepare(`
  INSERT INTO users (id, name, username, email, phone, password_hash, role, tag)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

// Testing seed (Minimal cohort as requested for testing)
insertUser.run('u_dev', 'Aaron', 'aaron_dev', 'aaron@forge.local', '9990001111', 'pass123', 'DEV_STEALTH', 'Creator');
insertUser.run('u_l1', 'Marcus (Leader 01)', 'marcus_lead', 'marcus@forge.local', '9990002222', 'pass123', 'STUDENT_LEADER', 'Student Leader');
insertUser.run('u_l2', 'Sarah (Leader 02)', 'sarah_lead', 'sarah@forge.local', '9990003333', 'pass123', 'STUDENT_LEADER', 'Student Leader');
insertUser.run('u_o1', 'Alex', 'alex_op', 'alex@forge.local', '9990004444', 'pass123', 'OPERATIVE', 'Code Ninja');
insertUser.run('u_o2', 'Elena', 'elena_op', 'elena@forge.local', '9990005555', 'pass123', 'OPERATIVE', 'UI Craftsperson');
insertUser.run('u_o3', 'Jordan', 'jordan_op', 'jordan@forge.local', '9990006666', 'pass123', 'OPERATIVE', 'Algorithm Master');

// Insert Teams & Captains
const insertTeam = db.prepare(`
  INSERT INTO teams (id, name, captain_id)
  VALUES (?, ?, ?)
`);

insertTeam.run('t1', 'Alpha Squad', 'u_o1');
insertTeam.run('t2', 'Beta Innovators', 'u_o2');

// Insert Team Memberships
const insertMember = db.prepare(`
  INSERT INTO team_memberships (id, user_id, team_id, custom_point_share)
  VALUES (?, ?, ?, ?)
`);

insertMember.run('tm1', 'u_o1', 't1', 1.2);
insertMember.run('tm2', 'u_o3', 't1', 0.8);
insertMember.run('tm3', 'u_o2', 't2', 1.0);

// Insert Tasks (Official & Task Marketplace)
const insertTask = db.prepare(`
  INSERT INTO tasks (id, title, description, total_points, is_marketplace, upvotes, assigned_team_id, requires_proof, status)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

insertTask.run('task1', 'Sprint 01: Core Architecture Setup', 'Implement modular server routing and database schemas.', 50, 0, 0, 't1', 1, 'IN_PROGRESS');
insertTask.run('task2', 'Vanilla HTML/CSS UI Styling', 'Style responsive components matching design tokens.', 30, 0, 0, 't2', 0, 'AVAILABLE');

insertTask.run('market1', 'Build Custom Canvas Animation Widget', 'Interactive particle animation widget for home dashboard.', 40, 1, 14, null, 1, 'MARKETPLACE');
insertTask.run('market2', 'Dark Mode Theme Switcher Performance Optimization', 'Refactor CSS variables for zero-latency theme toggling.', 25, 1, 9, null, 0, 'MARKETPLACE');

// Insert Hall of Fame Awarded Titles
const insertTitle = db.prepare(`
  INSERT INTO hall_of_fame_titles (id, title_name, category, awarded_to_user_id, awarded_to_team_id)
  VALUES (?, ?, ?, ?, ?)
`);

insertTitle.run('hof1', 'Best Developer 2026', 'Academics', 'u_o1', null);
insertTitle.run('hof2', 'Master UI Craftsperson', 'Design', 'u_o2', null);
insertTitle.run('hof3', 'Top Squad Sprint 01', 'Collaboration', null, 't1');

console.log('✅ Forge testing seed completed successfully!');
