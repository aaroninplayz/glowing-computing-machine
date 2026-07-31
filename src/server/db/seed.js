import { db, initSchema } from './database.js';

export function seedDatabase() {
  console.log('🌱 Initializing Forge database schema & testing seed...');

  // Create tables FIRST, then clear data
  initSchema();

  // Now safe to delete — tables exist
  db.pragma('foreign_keys = OFF');
  const tables = ['hall_of_fame_titles', 'task_submissions', 'team_memberships', 'task_upvotes', 'tasks', 'teams', 'student_leader_rotations', 'users'];
  for (const table of tables) {
    db.exec(`DELETE FROM ${table};`);
  }
  db.pragma('foreign_keys = ON');

  // --- Seed Users ---
  const insertUser = db.prepare(`
    INSERT INTO users (id, name, username, email, phone, password_hash, role, tag)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertUser.run('u_dev', 'Aaron (Dev)', 'aaron_dev', 'aaron@forge.local', '+1000000000', 'devpass123', 'DEV_STEALTH', 'System Ops');
  insertUser.run('u_leader1', 'Sarah Jenkins', 'sarah_j', 'sarah@forge.local', '+1000000001', 'pass123', 'STUDENT_LEADER', 'Leader');
  insertUser.run('u_leader2', 'David Kim', 'david_k', 'david@forge.local', '+1000000002', 'pass123', 'STUDENT_LEADER', 'Leader');
  insertUser.run('u_teacher', 'Prof. Vance', 'prof_vance', 'vance@forge.local', '+1000000003', 'adminpass', 'TEACHER', 'Instructor');
  insertUser.run('u_op1', 'Alex Rivera', 'alex_r', 'alex@forge.local', '+1000000004', 'pass123', 'OPERATIVE', 'Code Ninja');
  insertUser.run('u_op2', 'Elena Rostova', 'elena_r', 'elena@forge.local', '+1000000005', 'pass123', 'OPERATIVE', 'UI Craftsman');
  insertUser.run('u_op3', 'Marcus Chen', 'marcus_c', 'marcus@forge.local', '+1000000006', 'pass123', 'OPERATIVE', 'Backend Pro');
  insertUser.run('u_op4', 'Chloe Bennet', 'chloe_b', 'chloe@forge.local', '+1000000007', 'pass123', 'OPERATIVE', 'Data Architect');

  // --- Seed Student Leader Rotations ---
  const insertRotation = db.prepare(`
    INSERT INTO student_leader_rotations (id, user_id, term_start, term_end, is_active)
    VALUES (?, ?, ?, ?, 1)
  `);
  const termStart = new Date().toISOString();
  const termEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  insertRotation.run('slr_1', 'u_leader1', termStart, termEnd);
  insertRotation.run('slr_2', 'u_leader2', termStart, termEnd);

  // --- Seed Teams ---
  const insertTeam = db.prepare(`
    INSERT INTO teams (id, name, captain_id, is_active, status)
    VALUES (?, ?, ?, 1, 'ACTIVE')
  `);
  insertTeam.run('t_alpha', 'Alpha Squad', 'u_op1');
  insertTeam.run('t_beta', 'Beta Innovators', 'u_op3');

  // --- Seed Team Memberships ---
  const insertMembership = db.prepare(`
    INSERT INTO team_memberships (id, user_id, team_id, custom_point_share)
    VALUES (?, ?, ?, ?)
  `);
  insertMembership.run('tm_1', 'u_op1', 't_alpha', 1.0);
  insertMembership.run('tm_2', 'u_op2', 't_alpha', 1.0);
  insertMembership.run('tm_3', 'u_op3', 't_beta', 1.2);
  insertMembership.run('tm_4', 'u_op4', 't_beta', 0.8);

  // --- Seed Tasks (TEAM_TASK) and Challenges (CHALLENGE) ---
  const insertTask = db.prepare(`
    INSERT INTO tasks (id, title, description, total_points, task_type, mode, is_marketplace, assigned_team_id, assigned_user_id, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Team Task: assigned to Alpha Squad
  insertTask.run('task_1', 'Build Responsive Navigation & Token System', 'Implement CSS custom properties and responsive header layout.', 60, 'TEAM_TASK', 'TEAM', 0, 't_alpha', null, 'IN_PROGRESS');

  // Challenge: open for solo or team (individual assigned for now)
  insertTask.run('task_2', 'Master CSS Grid Layouts & Micro-Animations', 'Create an interactive CSS Grid demonstration card with hover transitions.', 40, 'CHALLENGE', 'CHOICE', 0, null, 'u_op2', 'IN_PROGRESS');

  // Marketplace Suggestion
  insertTask.run('task_market_1', 'Implement Dark Mode Marble Hall of Fame', 'Design an interactive stone-themed Leaderboard widget.', 50, 'CHALLENGE', 'CHOICE', 1, null, null, 'MARKETPLACE');

  // --- Seed Upvotes ---
  const insertUpvote = db.prepare('INSERT INTO task_upvotes (task_id, user_id) VALUES (?, ?)');
  insertUpvote.run('task_market_1', 'u_op1');
  insertUpvote.run('task_market_1', 'u_op2');
  insertUpvote.run('task_market_1', 'u_op3');

  // --- Seed Hall of Fame Titles ---
  const insertTitle = db.prepare(`
    INSERT INTO hall_of_fame_titles (id, title_name, category, awarded_to_user_id, awarded_to_team_id, season)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  insertTitle.run('hof_1', 'Best Developer 2026', 'Engineering', 'u_op1', null, 'Season 1');
  insertTitle.run('hof_2', 'Master UI Craftsperson', 'Design', 'u_op2', null, 'Season 1');
  insertTitle.run('hof_3', 'Top Squad Sprint 01', 'Collaboration', null, 't_alpha', 'Season 1');

  console.log('✅ Forge 8-table database seed completed successfully!');
}

if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  seedDatabase();
}
