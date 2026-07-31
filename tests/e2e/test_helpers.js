import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { db, initSchema } from '../../src/server/db/database.js';
import { startServer, stopServer } from '../../src/server/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const TEST_PORT = 3999;
export const BASE_URL = `http://localhost:${TEST_PORT}`;

// Helper: Reset Database to Known Seed State
export function resetDatabase() {
  db.pragma('foreign_keys = OFF');
  db.exec(`
    DROP TABLE IF EXISTS hall_of_fame_titles;
    DROP TABLE IF EXISTS task_submissions;
    DROP TABLE IF EXISTS task_upvotes;
    DROP TABLE IF EXISTS team_memberships;
    DROP TABLE IF EXISTS teams;
    DROP TABLE IF EXISTS tasks;
    DROP TABLE IF EXISTS student_leader_rotations;
    DROP TABLE IF EXISTS users;
  `);
  db.pragma('foreign_keys = ON');

  initSchema();

  // Users
  const insertUser = db.prepare(`
    INSERT INTO users (id, name, username, email, phone, password_hash, role, tag)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertUser.run('u_dev', 'Aaron', 'aaron_dev', 'aaron@forge.local', '9990001111', 'pass123', 'DEV_STEALTH', 'Creator');
  insertUser.run('u_teacher', 'Prof. Vance', 'teacher_vance', 'teacher@forge.local', '9990000000', 'pass123', 'TEACHER', 'Instructor');
  insertUser.run('u_l1', 'Marcus (Leader 01)', 'marcus_lead', 'marcus@forge.local', '9990002222', 'pass123', 'STUDENT_LEADER', 'Student Leader');
  insertUser.run('u_l2', 'Sarah (Leader 02)', 'sarah_lead', 'sarah@forge.local', '9990003333', 'pass123', 'STUDENT_LEADER', 'Student Leader');
  insertUser.run('u_o1', 'Alex', 'alex_op', 'alex@forge.local', '9990004444', 'pass123', 'OPERATIVE', 'Code Ninja');
  insertUser.run('u_o2', 'Elena', 'elena_op', 'elena@forge.local', '9990005555', 'pass123', 'OPERATIVE', 'UI Craftsperson');
  insertUser.run('u_o3', 'Jordan', 'jordan_op', 'jordan@forge.local', '9990006666', 'pass123', 'OPERATIVE', 'Algorithm Master');
  insertUser.run('u_o4', 'Taylor', 'taylor_op', 'taylor@forge.local', '9990007777', 'pass123', 'OPERATIVE', 'Data Specialist');

  // Student Leader Rotations
  const insertRotation = db.prepare(`
    INSERT INTO student_leader_rotations (id, user_id, term_start, term_end, is_active)
    VALUES (?, ?, ?, ?, ?)
  `);
  insertRotation.run('slr1', 'u_l1', '2026-08-01 00:00:00', '2026-08-31 23:59:59', 1);
  insertRotation.run('slr2', 'u_l2', '2026-08-01 00:00:00', '2026-08-31 23:59:59', 1);

  // Teams
  const insertTeam = db.prepare(`
    INSERT INTO teams (id, name, captain_id, is_active)
    VALUES (?, ?, ?, 1)
  `);
  insertTeam.run('t1', 'Alpha Squad', 'u_o1');
  insertTeam.run('t2', 'Beta Innovators', 'u_o2');

  // Team Memberships
  const insertMember = db.prepare(`
    INSERT INTO team_memberships (id, user_id, team_id, custom_point_share)
    VALUES (?, ?, ?, ?)
  `);
  insertMember.run('tm1', 'u_o1', 't1', 1.2);
  insertMember.run('tm2', 'u_o3', 't1', 0.8);
  insertMember.run('tm3', 'u_o2', 't2', 1.0);

  // Tasks
  const insertTask = db.prepare(`
    INSERT INTO tasks (id, title, description, total_points, is_marketplace, assigned_team_id, requires_proof, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertTask.run('task1', 'Sprint 01: Core Architecture Setup', 'Implement modular server routing and database schemas.', 50, 0, 't1', 1, 'IN_PROGRESS');
  insertTask.run('task2', 'Vanilla HTML/CSS UI Styling', 'Style responsive components matching design tokens.', 30, 0, 't2', 0, 'AVAILABLE');
  insertTask.run('market1', 'Build Custom Canvas Animation Widget', 'Interactive particle animation widget for home dashboard.', 40, 1, null, 1, 'MARKETPLACE');
  insertTask.run('market2', 'Dark Mode Theme Switcher Performance Optimization', 'Refactor CSS variables for zero-latency theme toggling.', 25, 1, null, 0, 'MARKETPLACE');

  // Task Upvotes
  const insertUpvote = db.prepare(`
    INSERT INTO task_upvotes (task_id, user_id)
    VALUES (?, ?)
  `);
  insertUpvote.run('market1', 'u_o2');
  insertUpvote.run('market1', 'u_l1');
  insertUpvote.run('market2', 'u_o3');

  // Titles
  const insertTitle = db.prepare(`
    INSERT INTO hall_of_fame_titles (id, title_name, category, awarded_to_user_id, awarded_to_team_id)
    VALUES (?, ?, ?, ?, ?)
  `);
  insertTitle.run('hof1', 'Best Developer 2026', 'Academics', 'u_o1', null);
  insertTitle.run('hof2', 'Master UI Craftsperson', 'Design', 'u_o2', null);
  insertTitle.run('hof3', 'Top Squad Sprint 01', 'Collaboration', null, 't1');
}

// HTTP Helper Functions
export async function get(endpoint) {
  const res = await fetch(`${BASE_URL}${endpoint}`);
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch (_) {}
  return { status: res.status, headers: res.headers, text, json };
}

export async function post(endpoint, body = {}) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch (_) {}
  return { status: res.status, headers: res.headers, text, json };
}

// Custom Test Assertion Library
export class TestRunnerContext {
  constructor(name) {
    this.name = name;
    this.passed = 0;
    this.failed = 0;
    this.failures = [];
  }

  assert(condition, message) {
    if (condition) {
      this.passed++;
    } else {
      this.failed++;
      this.failures.push(message);
      throw new Error(`Assertion Failed: ${message}`);
    }
  }

  assertEqual(actual, expected, message) {
    this.assert(actual === expected, `${message || 'Equal check'} (Expected: ${expected}, Got: ${actual})`);
  }

  assertContains(str, substring, message) {
    this.assert(typeof str === 'string' && str.includes(substring), `${message || 'Contains check'} (Expected "${str}" to contain "${substring}")`);
  }

  assertNotContains(str, substring, message) {
    this.assert(typeof str === 'string' && !str.includes(substring), `${message || 'Not contains check'} (Expected "${str}" to NOT contain "${substring}")`);
  }
}
