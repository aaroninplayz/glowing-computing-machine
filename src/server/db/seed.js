import { db, initSchema } from './database.js';

console.log('🌱 Initializing database schema & seeding demo data...');

initSchema();

// Clear existing demo data
db.exec(`
  DELETE FROM activity_progress;
  DELETE FROM team_memberships;
  DELETE FROM resources;
  DELETE FROM collaborative_challenges;
  DELETE FROM learning_activities;
  DELETE FROM teams;
  DELETE FROM users;
`);

// Insert Demo Users (Operation Overthink Role Codenames)
const insertUser = db.prepare(`
  INSERT INTO users (id, name, email, password_hash, role)
  VALUES (?, ?, ?, ?, ?)
`);

insertUser.run('u1', 'Aaron (Creator)', 'aaron@forge.local', 'pass123', 'SHADOW_LEAD');
insertUser.run('u2', 'Dr. Vance (Lead Mentor)', 'vance@forge.local', 'pass123', 'OVERSEER');
insertUser.run('u3', 'Sarah (Team Alpha Lead)', 'sarah@forge.local', 'pass123', 'VANGUARD');
insertUser.run('u4', 'Alex (Operative 01)', 'alex@forge.local', 'pass123', 'OPERATIVE');
insertUser.run('u5', 'Elena (Operative 02)', 'elena@forge.local', 'pass123', 'OPERATIVE');

// Insert Demo Teams
const insertTeam = db.prepare(`
  INSERT INTO teams (id, name, description, captain_id)
  VALUES (?, ?, ?, ?)
`);

insertTeam.run('t1', 'Team Cyber (Alpha)', 'Focusing on modular architecture and frontend engineering', 'u3');
insertTeam.run('t2', 'Team Quantum (Beta)', 'Specializing in backend algorithms and data pipelines', 'u4');

// Insert Team Memberships
const insertMember = db.prepare(`
  INSERT INTO team_memberships (id, user_id, team_id)
  VALUES (?, ?, ?)
`);

insertMember.run('tm1', 'u3', 't1');
insertMember.run('tm2', 'u4', 't2');
insertMember.run('tm3', 'u5', 't1');

// Insert Learning Activities
const insertActivity = db.prepare(`
  INSERT INTO learning_activities (id, title, description, points, requires_proof, requires_approval)
  VALUES (?, ?, ?, ?, ?, ?)
`);

insertActivity.run('a1', 'Modular Architecture Setup', 'Setup feature-based folder hierarchy and document principles.', 50, 0, 0);
insertActivity.run('a2', 'React Component Animation Challenge', 'Build a Framer Motion card component and upload proof file or video link.', 100, 1, 1);
insertActivity.run('a3', 'API Contract Specification', 'Document backend REST routes in docs/architecture/backend.md.', 30, 0, 0);

// Insert Collaborative Challenge
const insertChallenge = db.prepare(`
  INSERT INTO collaborative_challenges (id, title, description, points, start_date, end_date)
  VALUES (?, ?, ?, ?, ?, ?)
`);

insertChallenge.run('c1', 'Sprint 01: Community OS Launch', 'Collaborate as a team to submit all module specifications and baseline code.', 250, '2026-08-01', '2026-08-15');

// Insert Resources
const insertResource = db.prepare(`
  INSERT INTO resources (id, title, url, category, file_type, uploaded_by)
  VALUES (?, ?, ?, ?, ?, ?)
`);

insertResource.run('r1', 'Reactor Bytes Animation Snippets', 'https://reactorbytes.dev', 'UI & Motion', 'link', 'u1');
insertResource.run('r2', 'Forge Architecture Blueprint (PDF)', '/uploads/forge-blueprint.pdf', 'Documentation', 'pdf', 'u2');

console.log('✅ Seeding completed successfully!');
