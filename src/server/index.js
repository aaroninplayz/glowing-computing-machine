import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import fs from 'fs';
import dotenv from 'dotenv';
import { db, initSchema } from './db/database.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize database schema on startup
initSchema();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Serve static frontend assets from src/public
const publicDir = path.join(__dirname, '../public');
app.use(express.static(publicDir));

// File uploads directory setup
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });
app.use('/uploads', express.static(uploadsDir));

// Helper to calculate Hall of Fame rankings
function getHallOfFameLeaderboard() {
  const users = db.prepare(`
    SELECT id, name, username, email, phone, role, tag 
    FROM users 
    WHERE role != 'DEV_STEALTH'
  `).all();

  const leaderboard = users.map(user => {
    // Team completed tasks points
    const teamTasks = db.prepare(`
      SELECT t.total_points, tm.custom_point_share, tm.team_id,
        (SELECT SUM(sub_tm.custom_point_share) FROM team_memberships sub_tm WHERE sub_tm.team_id = tm.team_id) as total_team_weight
      FROM team_memberships tm
      JOIN tasks t ON tm.team_id = t.assigned_team_id
      WHERE tm.user_id = ? AND t.status = 'COMPLETED'
    `).all(user.id);

    let teamPoints = 0;
    for (const tt of teamTasks) {
      if (tt.total_team_weight > 0) {
        teamPoints += (tt.total_points * (tt.custom_point_share / tt.total_team_weight));
      }
    }

    // Individual completed tasks points
    const indivTasks = db.prepare(`
      SELECT SUM(total_points) as total
      FROM tasks
      WHERE assigned_user_id = ? AND status = 'COMPLETED'
    `).get(user.id);

    const indivPoints = (indivTasks && indivTasks.total) ? indivTasks.total : 0;
    const totalPoints = Math.round(teamPoints + indivPoints);

    return {
      id: user.id,
      name: user.name,
      username: user.username,
      tag: user.tag,
      role: user.role === 'DEV_STEALTH' ? 'OPERATIVE' : user.role,
      public_role: user.role === 'DEV_STEALTH' ? 'OPERATIVE' : user.role,
      points: totalPoints
    };
  });

  return leaderboard.sort((a, b) => b.points - a.points);
}

// --- REST API ENDPOINTS ---

// 1. Flexible Authentication Endpoint (Email / Username / Phone + Password)
app.post('/api/auth/login', (req, res) => {
  const { identifier, password } = req.body;
  if (!identifier || !password) return res.status(400).json({ error: 'Identifier and password required' });

  const user = db.prepare(`
    SELECT id, name, username, email, phone, role, tag 
    FROM users 
    WHERE (email = ? OR username = ? OR phone = ?) AND password_hash = ?
  `).get(identifier, identifier, identifier, password);

  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  // Stealth Developer Role: Map DEV_STEALTH to OPERATIVE in public_role payload
  const publicRole = user.role === 'DEV_STEALTH' ? 'OPERATIVE' : user.role;

  res.json({ success: true, user: { ...user, public_role: publicRole } });
});

// 1b. Current User Profile Endpoint (/api/auth/me)
app.get('/api/auth/me', (req, res) => {
  const userId = req.headers['x-user-id'] || req.query.user_id || 'u_dev';
  const user = db.prepare(`
    SELECT id, name, username, email, phone, role, tag 
    FROM users 
    WHERE id = ? OR username = ?
  `).get(userId, userId);

  if (!user) return res.status(404).json({ error: 'User profile not found' });

  const publicRole = user.role === 'DEV_STEALTH' ? 'OPERATIVE' : user.role;
  res.json({ user: { ...user, public_role: publicRole } });
});

// 1c. User Management Endpoints
app.get('/api/users', (req, res) => {
  const { role } = req.query;
  let users;
  if (role) {
    users = db.prepare('SELECT id, name, username, email, phone, role, tag, created_at FROM users WHERE role = ?').all(role);
  } else {
    users = db.prepare('SELECT id, name, username, email, phone, role, tag, created_at FROM users').all();
  }

  const sanitized = users.map(u => {
    const maskedRole = u.role === 'DEV_STEALTH' ? 'OPERATIVE' : u.role;
    return {
      ...u,
      role: maskedRole,
      public_role: maskedRole
    };
  });
  res.json(sanitized);
});

app.post('/api/users', (req, res) => {
  const { id, name, username, email, phone, password_hash, role, tag } = req.body;
  if (!name || !username || !email) return res.status(400).json({ error: 'Name, username, and email required' });

  const userId = id || `u_${Date.now()}`;
  db.prepare(`
    INSERT INTO users (id, name, username, email, phone, password_hash, role, tag)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(userId, name, username, email, phone || null, password_hash || 'pass123', role || 'OPERATIVE', tag || null);

  res.json({ success: true, userId });
});

// 1d. Student Leader Rotation Endpoints
app.get('/api/student-leaders', (req, res) => {
  const leaders = db.prepare(`
    SELECT slr.id, slr.user_id, u.name, u.username, slr.term_start, slr.term_end
    FROM student_leader_rotations slr
    JOIN users u ON slr.user_id = u.id
    WHERE slr.is_active = 1
  `).all();
  res.json(leaders);
});

app.post('/api/student-leaders/rotate', (req, res) => {
  const { leader_ids } = req.body;
  if (!Array.isArray(leader_ids) || leader_ids.length === 0) {
    return res.status(400).json({ error: 'leader_ids array required' });
  }

  // Deactivate current rotations
  db.prepare('UPDATE student_leader_rotations SET is_active = 0 WHERE is_active = 1').run();

  const termStart = new Date().toISOString();
  const termEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const insertStmt = db.prepare(`
    INSERT INTO student_leader_rotations (id, user_id, term_start, term_end, is_active)
    VALUES (?, ?, ?, ?, 1)
  `);

  const updateRoleStmt = db.prepare(`UPDATE users SET role = 'STUDENT_LEADER' WHERE id = ?`);

  leader_ids.forEach((uid, idx) => {
    insertStmt.run(`slr_${Date.now()}_${idx}`, uid, termStart, termEnd);
    updateRoleStmt.run(uid);
  });

  const activeLeaders = db.prepare(`
    SELECT slr.id, slr.user_id, u.name, u.username, slr.term_start, slr.term_end
    FROM student_leader_rotations slr
    JOIN users u ON slr.user_id = u.id
    WHERE slr.is_active = 1
  `).all();

  res.json({ success: true, active_leaders: activeLeaders });
});

// 2. Tasks & Task Marketplace Endpoints
app.get('/api/tasks', (req, res) => {
  const official = db.prepare(`
    SELECT t.*, tm.name as assigned_team_name, u.name as assigned_user_name
    FROM tasks t
    LEFT JOIN teams tm ON t.assigned_team_id = tm.id
    LEFT JOIN users u ON t.assigned_user_id = u.id
    WHERE t.is_marketplace = 0
    ORDER BY t.created_at DESC
  `).all();

  const marketplace = db.prepare(`
    SELECT t.*, (SELECT COUNT(*) FROM task_upvotes tu WHERE tu.task_id = t.id) as upvotes
    FROM tasks t
    WHERE t.is_marketplace = 1
    ORDER BY upvotes DESC
  `).all();

  res.json({ official, marketplace });
});

// Suggest a Task (Task Marketplace)
app.post('/api/tasks/suggest', (req, res) => {
  const { title, description, total_points, user_id } = req.body;
  if (!title || !description) return res.status(400).json({ error: 'Title and description required' });

  const taskId = `market_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  db.prepare(`
    INSERT INTO tasks (id, title, description, total_points, is_marketplace, status)
    VALUES (?, ?, ?, ?, 1, 'MARKETPLACE')
  `).run(taskId, title, description, total_points || 20);

  const suggestorId = user_id || req.headers['x-user-id'] || 'u_o1';
  db.prepare('INSERT OR IGNORE INTO task_upvotes (task_id, user_id) VALUES (?, ?)').run(taskId, suggestorId);

  res.json({ success: true, taskId });
});

// Upvote Task Marketplace Idea
app.post('/api/tasks/:id/upvote', (req, res) => {
  const { id } = req.params;
  const userId = req.body.user_id || req.headers['x-user-id'] || 'u_o1';

  try {
    const task = db.prepare('SELECT id FROM tasks WHERE id = ?').get(id);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    db.prepare('INSERT OR IGNORE INTO task_upvotes (task_id, user_id) VALUES (?, ?)').run(id, userId);

    const countRow = db.prepare('SELECT COUNT(*) as upvotes FROM task_upvotes WHERE task_id = ?').get(id);
    res.json({ success: true, upvotes: countRow ? countRow.upvotes : 0 });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Remove Upvote from Task Marketplace Idea
app.delete('/api/tasks/:id/upvote', (req, res) => {
  const { id } = req.params;
  const userId = req.body.user_id || req.query.user_id || req.headers['x-user-id'] || 'u_o1';

  try {
    const task = db.prepare('SELECT id FROM tasks WHERE id = ?').get(id);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    db.prepare('DELETE FROM task_upvotes WHERE task_id = ? AND user_id = ?').run(id, userId);

    const countRow = db.prepare('SELECT COUNT(*) as upvotes FROM task_upvotes WHERE task_id = ?').get(id);
    res.json({ success: true, upvotes: countRow ? countRow.upvotes : 0 });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Student Leader Assign Marketplace Task to Team or Individual
app.post('/api/tasks/:id/assign', (req, res) => {
  const { id } = req.params;
  const { team_id, user_id, assigned_by } = req.body;

  if (team_id) {
    const team = db.prepare('SELECT id FROM teams WHERE id = ?').get(team_id);
    if (!team) return res.status(404).json({ error: 'Team not found' });
  }

  db.prepare(`
    UPDATE tasks 
    SET is_marketplace = 0, assigned_team_id = ?, assigned_user_id = ?, assigned_by = ?, status = 'IN_PROGRESS' 
    WHERE id = ?
  `).run(team_id || null, user_id || null, assigned_by || null, id);

  if (team_id) {
    db.prepare('UPDATE teams SET task_id = ? WHERE id = ?').run(id, team_id);
  }

  res.json({ success: true });
});

// Team Captain Submit Task Proof
app.post('/api/tasks/:id/submit', upload.single('proof_file'), (req, res) => {
  const { id } = req.params;
  const { submitted_by, proof_notes } = req.body;

  const proofUrl = req.file ? `/uploads/${req.file.filename}` : null;
  const subId = `sub_${Date.now()}`;

  db.prepare(`
    INSERT INTO task_submissions (id, task_id, submitted_by, proof_url, proof_notes, status)
    VALUES (?, ?, ?, ?, ?, 'PENDING')
  `).run(subId, id, submitted_by || 'u_o1', proofUrl, proof_notes || '');

  db.prepare("UPDATE tasks SET status = 'PENDING_APPROVAL' WHERE id = ?").run(id);

  res.json({ success: true, submissionId: subId });
});

// Complete Task & Trigger Team Auto-Dissolution (4-member team rule)
app.post('/api/tasks/:id/approve', (req, res) => {
  const { id } = req.params;
  const { submission_id, reviewed_by } = req.body;
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  db.prepare("UPDATE tasks SET status = 'COMPLETED' WHERE id = ?").run(id);

  if (submission_id) {
    db.prepare(`
      UPDATE task_submissions 
      SET status = 'APPROVED', reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(reviewed_by || 'u_teacher', submission_id);
  }

  let dissolved = false;
  if (task.assigned_team_id) {
    const memberCount = db.prepare('SELECT COUNT(*) as cnt FROM team_memberships WHERE team_id = ?').get(task.assigned_team_id).cnt;
    // Auto-dissolve 4-member teams upon task completion back into general cohort pool
    if (memberCount >= 4) { // Auto-dissolve team on task completion
      db.prepare(`
        UPDATE teams 
        SET is_active = 0, status = 'DISSOLVED', dissolved_at = CURRENT_TIMESTAMP, dissolution_reason = 'TASK_COMPLETED' 
        WHERE id = ?
      `).run(task.assigned_team_id);
      dissolved = true;
    }
  }

  res.json({ success: true, taskId: id, status: 'COMPLETED', team_dissolved: dissolved });
});

// Alias endpoint for task completion
app.post('/api/tasks/:id/complete', (req, res) => {
  const { id } = req.params;
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  db.prepare("UPDATE tasks SET status = 'COMPLETED' WHERE id = ?").run(id);

  let dissolved = false;
  if (task.assigned_team_id) {
    const memberCount = db.prepare('SELECT COUNT(*) as cnt FROM team_memberships WHERE team_id = ?').get(task.assigned_team_id).cnt;
    if (memberCount >= 4) {
      db.prepare(`
        UPDATE teams 
        SET is_active = 0, status = 'DISSOLVED', dissolved_at = CURRENT_TIMESTAMP, dissolution_reason = 'TASK_COMPLETED' 
        WHERE id = ?
      `).run(task.assigned_team_id);
      dissolved = true;
    }
  }

  res.json({ success: true, taskId: id, status: 'COMPLETED', auto_dissolved: dissolved });
});

// 3. Teams & Dynamic Point Share Endpoints
app.get('/api/teams', (req, res) => {
  const teams = db.prepare(`
    SELECT t.*, u.name as captain_name, tk.title as task_title 
    FROM teams t 
    LEFT JOIN users u ON t.captain_id = u.id 
    LEFT JOIN tasks tk ON t.task_id = tk.id
    WHERE t.is_active = 1
  `).all();

  const teamsWithMembers = teams.map(team => {
    const members = db.prepare(`
      SELECT u.id, u.name, u.username, u.role, u.tag, tm.custom_point_share 
      FROM team_memberships tm 
      JOIN users u ON tm.user_id = u.id 
      WHERE tm.team_id = ?
    `).all(team.id);

    const sanitizedMembers = members.map(m => {
      const maskedRole = m.role === 'DEV_STEALTH' ? 'OPERATIVE' : m.role;
      return {
        ...m,
        role: maskedRole,
        public_role: maskedRole
      };
    });

    return { ...team, members: sanitizedMembers };
  });

  res.json(teamsWithMembers);
});

// Create New Team
app.post('/api/teams', (req, res) => {
  const { name, captain_id, member_ids, task_id } = req.body;
  if (!name) return res.status(400).json({ error: 'Team name required' });

  const teamId = `t_${Date.now()}`;
  db.prepare("INSERT INTO teams (id, name, captain_id, task_id, is_active, status) VALUES (?, ?, ?, ?, 1, 'ACTIVE')").run(teamId, name, captain_id || null, task_id || null);

  if (Array.isArray(member_ids)) {
    const insertMember = db.prepare('INSERT INTO team_memberships (id, user_id, team_id, custom_point_share) VALUES (?, ?, ?, 1.0)');
    member_ids.forEach((uid, idx) => {
      insertMember.run(`tm_${Date.now()}_${idx}`, uid, teamId);
    });
  }

  res.json({ success: true, teamId });
});

// Create New Team (Alias route)
app.post('/api/teams/create', (req, res) => {
  const { name, captain_id, member_ids, task_id } = req.body;
  if (!name) return res.status(400).json({ error: 'Team name required' });

  const teamId = `t_${Date.now()}`;
  db.prepare("INSERT INTO teams (id, name, captain_id, task_id, is_active, status) VALUES (?, ?, ?, ?, 1, 'ACTIVE')").run(teamId, name, captain_id || null, task_id || null);

  if (Array.isArray(member_ids)) {
    const insertMember = db.prepare('INSERT INTO team_memberships (id, user_id, team_id, custom_point_share) VALUES (?, ?, ?, 1.0)');
    member_ids.forEach((uid, idx) => {
      insertMember.run(`tm_${Date.now()}_${idx}`, uid, teamId);
    });
  }

  res.json({ success: true, teamId });
});

// Point Override for Team Member (/api/teams/:id/points/override)
app.post('/api/teams/:id/points/override', (req, res) => {
  const { id } = req.params;
  const { user_id, custom_point_share } = req.body;

  if (typeof custom_point_share !== 'number' || isNaN(custom_point_share) || custom_point_share < 0 || !isFinite(custom_point_share)) {
    return res.status(400).json({ error: 'Invalid custom point share' });
  }

  const team = db.prepare('SELECT id FROM teams WHERE id = ?').get(id);
  if (!team) return res.status(404).json({ error: 'Team not found' });

  db.prepare(`
    UPDATE team_memberships 
    SET custom_point_share = ? 
    WHERE team_id = ? AND user_id = ?
  `).run(custom_point_share, id, user_id);

  res.json({ success: true });
});

// Point Redistribution (Alias route /api/teams/redistribute-points)
app.post('/api/teams/redistribute-points', (req, res) => {
  const { team_id, user_id, custom_point_share } = req.body;
  if (!team_id || !user_id || typeof custom_point_share !== 'number' || isNaN(custom_point_share) || custom_point_share < 0 || !isFinite(custom_point_share)) {
    return res.status(400).json({ error: 'Team ID, User ID, and valid custom_point_share required' });
  }

  const team = db.prepare('SELECT id FROM teams WHERE id = ?').get(team_id);
  if (!team) return res.status(404).json({ error: 'Team not found' });

  db.prepare(`
    UPDATE team_memberships 
    SET custom_point_share = ? 
    WHERE team_id = ? AND user_id = ?
  `).run(custom_point_share, team_id, user_id);

  res.json({ success: true });
});

// Dissolve Team (/api/teams/:id/dissolve)
app.post('/api/teams/:id/dissolve', (req, res) => {
  const { id } = req.params;
  const { reason } = req.body || {};

  db.prepare(`
    UPDATE teams 
    SET is_active = 0, status = 'DISSOLVED', dissolved_at = CURRENT_TIMESTAMP, dissolution_reason = ? 
    WHERE id = ?
  `).run(reason || 'MANUAL', id);

  res.json({ success: true, teamId: id, is_active: 0 });
});

// 4. The Hall of Fame Endpoints (All-Time, Season 1, Awarded Titles Wall)
app.get('/api/hall-of-fame', (req, res) => {
  const allTime = getHallOfFameLeaderboard();
  const season1 = getHallOfFameLeaderboard();

  const titles = db.prepare(`
    SELECT h.*, u.name as user_name, tm.name as team_name 
    FROM hall_of_fame_titles h 
    LEFT JOIN users u ON h.awarded_to_user_id = u.id 
    LEFT JOIN teams tm ON h.awarded_to_team_id = tm.id 
    ORDER BY h.awarded_at DESC
  `).all();

  res.json({ allTime, season1, titles });
});

// Award New Hall of Fame Title (/api/hall-of-fame/award)
app.post('/api/hall-of-fame/award', (req, res) => {
  const { title_name, category, awarded_to_user_id, awarded_to_team_id, season } = req.body;
  if (!title_name) return res.status(400).json({ error: 'Title name required' });

  const titleId = `hof_${Date.now()}`;
  db.prepare(`
    INSERT INTO hall_of_fame_titles (id, title_name, category, awarded_to_user_id, awarded_to_team_id, season)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(titleId, title_name, category || 'Academics', awarded_to_user_id || null, awarded_to_team_id || null, season || 'Season 1');

  res.json({ success: true, titleId });
});

// Award New Hall of Fame Title (Alias route /api/hall-of-fame/titles)
app.post('/api/hall-of-fame/titles', (req, res) => {
  const { title_name, category, awarded_to_user_id, awarded_to_team_id, season } = req.body;
  if (!title_name) return res.status(400).json({ error: 'Title name required' });

  const titleId = `hof_${Date.now()}`;
  db.prepare(`
    INSERT INTO hall_of_fame_titles (id, title_name, category, awarded_to_user_id, awarded_to_team_id, season)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(titleId, title_name, category || 'Academics', awarded_to_user_id || null, awarded_to_team_id || null, season || 'Season 1');

  res.json({ success: true, titleId });
});

// Serve frontend for all unmatched routes
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) {
    return res.status(404).json({ error: 'Resource not found' });
  }
  res.sendFile(path.join(publicDir, 'index.html'));
});

let serverInstance = null;
export function startServer(port = PORT) {
  return new Promise((resolve) => {
    serverInstance = app.listen(port, () => {
      console.log(`⚡ Forge Server running on http://localhost:${port}`);
      resolve(serverInstance);
    });
  });
}

export function stopServer() {
  if (serverInstance) {
    serverInstance.close();
  }
}

if (process.env.NODE_ENV !== 'test' && import.meta.url === `file://${process.argv[1]}`) {
  startServer(PORT);
}
