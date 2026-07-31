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

initSchema();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const publicDir = path.join(__dirname, '../public');
app.use(express.static(publicDir));

// ── File Uploads ──────────────────────────────────────────────────────────────

const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.txt', '.zip', '.md', '.json', '.csv', '.doc', '.docx']);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const safeName = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${safeName}`);
  }
});

const fileFilter = (_req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  cb(ALLOWED_EXTENSIONS.has(ext) ? null : new Error('Invalid file type.'), ALLOWED_EXTENSIONS.has(ext));
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } });
app.use('/uploads', express.static(uploadsDir));

// ── Shared Helpers ────────────────────────────────────────────────────────────

const PRIVILEGED_ROLES = ['STUDENT_LEADER', 'TEACHER', 'DEV_STEALTH'];
const ADMIN_ROLES = ['TEACHER', 'DEV_STEALTH'];

// Hardcoded owner — this account cannot be deleted, modified, or have its role changed via any API.
// It is completely invisible in all public-facing endpoints (user lists, team members, leaderboards).
const OWNER_ID = 'u_dev';

/** Mask DEV_STEALTH to OPERATIVE in any user-facing payload */
function maskRole(role) {
  return role === 'DEV_STEALTH' ? 'OPERATIVE' : role;
}

/** Sanitize a user row for public API responses */
function sanitizeUser(u) {
  const publicRole = maskRole(u.role);
  return { ...u, role: publicRole, public_role: publicRole };
}

/** Auto-dissolve a team (≥4 members) after task completion */
function tryAutoDissolve(teamId) {
  if (!teamId) return false;
  const { cnt } = db.prepare('SELECT COUNT(*) as cnt FROM team_memberships WHERE team_id = ?').get(teamId);
  if (cnt >= 4) {
    db.prepare(`
      UPDATE teams SET is_active = 0, status = 'DISSOLVED', dissolved_at = CURRENT_TIMESTAMP, dissolution_reason = 'TASK_COMPLETED'
      WHERE id = ?
    `).run(teamId);
    return true;
  }
  return false;
}

// ── Prepared Statements (avoid re-parsing on every request) ───────────────────

const stmts = {
  userByIdOrUsername: db.prepare('SELECT id, name, username, email, phone, role, tag FROM users WHERE id = ? OR username = ?'),
  stealthUser: db.prepare("SELECT id, name, username, email, phone, role, tag FROM users WHERE role = 'DEV_STEALTH'"),
  loginUser: db.prepare(`
    SELECT id, name, username, email, phone, role, tag FROM users
    WHERE (email = ? OR username = ? OR phone = ?) AND password_hash = ?
  `),
  allUsers: db.prepare("SELECT id, name, username, email, phone, role, tag, created_at FROM users WHERE role != 'DEV_STEALTH'"),
  usersByRole: db.prepare("SELECT id, name, username, email, phone, role, tag, created_at FROM users WHERE role = ? AND role != 'DEV_STEALTH'"),
  activeLeaders: db.prepare(`
    SELECT slr.id, slr.user_id, u.name, u.username, slr.term_start, slr.term_end
    FROM student_leader_rotations slr JOIN users u ON slr.user_id = u.id
    WHERE slr.is_active = 1
  `),
  taskById: db.prepare('SELECT * FROM tasks WHERE id = ?'),
  teamById: db.prepare('SELECT * FROM teams WHERE id = ?'),
  membershipCheck: db.prepare('SELECT id FROM team_memberships WHERE team_id = ? AND user_id = ?'),
  upvoteCount: db.prepare('SELECT COUNT(*) as upvotes FROM task_upvotes WHERE task_id = ?'),
};

// ── Leaderboard (single-pass SQL instead of N+1 loop) ─────────────────────────

function getHallOfFameLeaderboard() {
  // Team points: weighted share of completed team-task points
  const teamPoints = db.prepare(`
    SELECT tm.user_id,
      SUM(t.total_points * (tm.custom_point_share / team_weight.total_weight)) as points
    FROM team_memberships tm
    JOIN tasks t ON tm.team_id = t.assigned_team_id AND t.status = 'COMPLETED'
    JOIN (
      SELECT team_id, SUM(custom_point_share) as total_weight
      FROM team_memberships GROUP BY team_id
    ) team_weight ON team_weight.team_id = tm.team_id
    WHERE team_weight.total_weight > 0
    GROUP BY tm.user_id
  `).all();

  // Individual points: completed tasks assigned directly to a user
  const indivPoints = db.prepare(`
    SELECT assigned_user_id as user_id, SUM(total_points) as points
    FROM tasks WHERE assigned_user_id IS NOT NULL AND status = 'COMPLETED'
    GROUP BY assigned_user_id
  `).all();

  // Build lookup maps
  const pointMap = new Map();
  for (const r of teamPoints) pointMap.set(r.user_id, (pointMap.get(r.user_id) || 0) + r.points);
  for (const r of indivPoints) pointMap.set(r.user_id, (pointMap.get(r.user_id) || 0) + r.points);

  // Fetch all non-stealth users and attach points
  const users = db.prepare("SELECT id, name, username, tag, role FROM users WHERE role != 'DEV_STEALTH'").all();

  return users
    .map(u => ({
      id: u.id,
      name: u.name,
      username: u.username,
      tag: u.tag,
      role: maskRole(u.role),
      public_role: maskRole(u.role),
      points: Math.round(pointMap.get(u.id) || 0)
    }))
    .sort((a, b) => b.points - a.points);
}

// ── Auth Middleware ────────────────────────────────────────────────────────────

function authenticateUser(req, _res, next) {
  const userId = req.headers['x-user-id'] || 'u_dev';
  const user = stmts.userByIdOrUsername.get(userId, userId);
  req.user = user || stmts.stealthUser.get() || { id: 'u_dev', role: 'DEV_STEALTH', name: 'Aaron' };
  next();
}

function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: `Access denied: requires ${allowedRoles.filter(r => r !== 'DEV_STEALTH').join(' or ')} authority` });
    }
    next();
  };
}

const requireLeaderOrTeacher = requireRole(PRIVILEGED_ROLES);
const requireTeacher = requireRole(ADMIN_ROLES);

function verifyTeamAccess(teamIdParam = 'id') {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    if (PRIVILEGED_ROLES.includes(req.user.role)) return next();

    const teamId = req.params[teamIdParam] || req.body.team_id;
    if (!teamId) return res.status(400).json({ error: 'Team ID required' });

    const team = stmts.teamById.get(teamId);
    if (!team) return res.status(404).json({ error: 'Team not found' });

    if (team.captain_id !== req.user.id && !stmts.membershipCheck.get(teamId, req.user.id)) {
      return res.status(403).json({ error: 'Forbidden: you do not belong to this team.' });
    }
    next();
  };
}

app.use(authenticateUser);

// ── Auth Endpoints ────────────────────────────────────────────────────────────

app.post('/api/auth/login', (req, res) => {
  const { identifier, password } = req.body;
  if (!identifier || !password) return res.status(400).json({ error: 'Identifier and password required' });

  const user = stmts.loginUser.get(identifier, identifier, identifier, password);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  res.json({ success: true, user: sanitizeUser(user) });
});

app.get('/api/auth/me', (req, res) => {
  if (!req.user) return res.status(404).json({ error: 'User profile not found' });
  res.json({ user: sanitizeUser(req.user) });
});

// ── User Management ───────────────────────────────────────────────────────────

app.get('/api/users', (req, res) => {
  // DEV_STEALTH is excluded at the query level — completely invisible
  const users = req.query.role ? stmts.usersByRole.all(req.query.role) : stmts.allUsers.all();
  res.json(users.map(sanitizeUser));
});

app.post('/api/users', requireTeacher, (req, res) => {
  const { id, name, username, email, phone, password_hash, role, tag } = req.body;
  if (!name || !username || !email) return res.status(400).json({ error: 'Name, username, and email required' });

  // Block privilege escalation to DEV_STEALTH — only the hardcoded owner has this role
  const safeRole = (role === 'DEV_STEALTH') ? 'OPERATIVE' : (role || 'OPERATIVE');
  const userId = id || `u_${Date.now()}`;

  // Block creating a user with the owner's reserved ID
  if (userId === OWNER_ID) return res.status(403).json({ error: 'Cannot create user with reserved owner ID' });

  db.prepare('INSERT INTO users (id, name, username, email, phone, password_hash, role, tag) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(userId, name, username, email, phone || null, password_hash || 'pass123', safeRole, tag || null);

  res.json({ success: true, userId });
});

// Delete User (Owner-protected)
app.delete('/api/users/:id', requireTeacher, (req, res) => {
  if (req.params.id === OWNER_ID) return res.status(403).json({ error: 'The owner account cannot be deleted.' });
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Update User (Owner role protection)
app.patch('/api/users/:id', requireTeacher, (req, res) => {
  const { name, username, email, phone, role, tag } = req.body;
  if (req.params.id === OWNER_ID && role && role !== 'DEV_STEALTH') {
    return res.status(403).json({ error: 'The owner role cannot be changed.' });
  }
  // Block anyone from granting DEV_STEALTH to other users
  const safeRole = (role === 'DEV_STEALTH' && req.params.id !== OWNER_ID) ? undefined : role;
  const updates = [];
  const values = [];
  if (name) { updates.push('name = ?'); values.push(name); }
  if (username) { updates.push('username = ?'); values.push(username); }
  if (email) { updates.push('email = ?'); values.push(email); }
  if (phone !== undefined) { updates.push('phone = ?'); values.push(phone); }
  if (safeRole) { updates.push('role = ?'); values.push(safeRole); }
  if (tag !== undefined) { updates.push('tag = ?'); values.push(tag); }
  if (!updates.length) return res.status(400).json({ error: 'No fields to update' });
  values.push(req.params.id);
  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  res.json({ success: true });
});

// ── Student Leader Rotation ───────────────────────────────────────────────────

app.get('/api/student-leaders', (_req, res) => res.json(stmts.activeLeaders.all()));

app.post('/api/student-leaders/rotate', requireTeacher, (req, res) => {
  const { leader_ids } = req.body;
  if (!Array.isArray(leader_ids) || !leader_ids.length) {
    return res.status(400).json({ error: 'leader_ids array required' });
  }

  const rotate = db.transaction(() => {
    db.prepare('UPDATE student_leader_rotations SET is_active = 0 WHERE is_active = 1').run();
    const termStart = new Date().toISOString();
    const termEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const insertStmt = db.prepare('INSERT INTO student_leader_rotations (id, user_id, term_start, term_end, is_active) VALUES (?, ?, ?, ?, 1)');
    const updateRole = db.prepare("UPDATE users SET role = 'STUDENT_LEADER' WHERE id = ? AND role != 'DEV_STEALTH'");
    leader_ids.forEach((uid, i) => {
      insertStmt.run(`slr_${Date.now()}_${i}`, uid, termStart, termEnd);
      updateRole.run(uid);
    });
  });
  rotate();

  res.json({ success: true, active_leaders: stmts.activeLeaders.all() });
});

// ── Tasks & Challenges ────────────────────────────────────────────────────────

app.get('/api/tasks', (_req, res) => {
  const teamTasks = db.prepare(`
    SELECT t.*, tm.name as assigned_team_name, u.name as assigned_user_name
    FROM tasks t LEFT JOIN teams tm ON t.assigned_team_id = tm.id LEFT JOIN users u ON t.assigned_user_id = u.id
    WHERE t.is_marketplace = 0 AND t.task_type = 'TEAM_TASK' ORDER BY t.created_at DESC
  `).all();

  const challenges = db.prepare(`
    SELECT t.*, tm.name as assigned_team_name, u.name as assigned_user_name
    FROM tasks t LEFT JOIN teams tm ON t.assigned_team_id = tm.id LEFT JOIN users u ON t.assigned_user_id = u.id
    WHERE t.is_marketplace = 0 AND t.task_type = 'CHALLENGE' ORDER BY t.created_at DESC
  `).all();

  const marketplace = db.prepare(`
    SELECT t.*, (SELECT COUNT(*) FROM task_upvotes tu WHERE tu.task_id = t.id) as upvotes
    FROM tasks t WHERE t.is_marketplace = 1 ORDER BY upvotes DESC
  `).all();

  res.json({ teamTasks, challenges, marketplace });
});

app.post('/api/tasks/suggest', (req, res) => {
  const { title, description, total_points, task_type, mode } = req.body;
  if (!title || !description) return res.status(400).json({ error: 'Title and description required' });

  const taskId = `market_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  db.prepare(`INSERT INTO tasks (id, title, description, total_points, task_type, mode, is_marketplace, status) VALUES (?, ?, ?, ?, ?, ?, 1, 'MARKETPLACE')`)
    .run(taskId, title, description, total_points || 20, task_type || 'CHALLENGE', mode || 'CHOICE');

  db.prepare('INSERT OR IGNORE INTO task_upvotes (task_id, user_id) VALUES (?, ?)').run(taskId, req.user.id);
  res.json({ success: true, taskId });
});

app.post('/api/tasks/:id/upvote', (req, res) => {
  const task = stmts.taskById.get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  db.prepare('INSERT OR IGNORE INTO task_upvotes (task_id, user_id) VALUES (?, ?)').run(req.params.id, req.user.id);
  res.json({ success: true, upvotes: stmts.upvoteCount.get(req.params.id).upvotes });
});

app.delete('/api/tasks/:id/upvote', (req, res) => {
  const task = stmts.taskById.get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  db.prepare('DELETE FROM task_upvotes WHERE task_id = ? AND user_id = ?').run(req.params.id, req.user.id);
  res.json({ success: true, upvotes: stmts.upvoteCount.get(req.params.id).upvotes });
});

app.post('/api/tasks/:id/assign', requireLeaderOrTeacher, (req, res) => {
  const { team_id, user_id, task_type } = req.body;
  const task = stmts.taskById.get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  if (team_id) {
    const team = stmts.teamById.get(team_id);
    if (!team) return res.status(404).json({ error: 'Team not found' });
    db.prepare('UPDATE teams SET task_id = ? WHERE id = ?').run(req.params.id, team_id);
  }

  const resolvedType = task_type || (team_id ? 'TEAM_TASK' : task.task_type);

  db.prepare(`
    UPDATE tasks SET is_marketplace = 0, assigned_team_id = ?, assigned_user_id = ?, assigned_by = ?, task_type = ?, status = 'IN_PROGRESS'
    WHERE id = ?
  `).run(team_id || null, user_id || null, req.user.id, resolvedType, req.params.id);

  res.json({ success: true });
});

app.post('/api/tasks/:id/submit', upload.single('proof_file'), (req, res) => {
  const task = stmts.taskById.get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  // IDOR: verify submitter is assigned or on the team
  if (!PRIVILEGED_ROLES.includes(req.user.role)) {
    if (task.assigned_user_id && task.assigned_user_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden: you are not assigned to this task.' });
    }
    if (task.assigned_team_id && !stmts.membershipCheck.get(task.assigned_team_id, req.user.id)) {
      return res.status(403).json({ error: 'Forbidden: you are not a member of the assigned team.' });
    }
  }

  const proofUrl = req.file ? `/uploads/${req.file.filename}` : null;
  const subId = `sub_${Date.now()}`;
  db.prepare("INSERT INTO task_submissions (id, task_id, submitted_by, proof_url, proof_notes, status) VALUES (?, ?, ?, ?, ?, 'PENDING')")
    .run(subId, req.params.id, req.user.id, proofUrl, req.body.proof_notes || '');
  db.prepare("UPDATE tasks SET status = 'PENDING_APPROVAL' WHERE id = ?").run(req.params.id);

  res.json({ success: true, submissionId: subId });
});

function completeTask(req, res) {
  const task = stmts.taskById.get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  db.prepare("UPDATE tasks SET status = 'COMPLETED' WHERE id = ?").run(req.params.id);

  if (req.body.submission_id) {
    db.prepare("UPDATE task_submissions SET status = 'APPROVED', reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP WHERE id = ?")
      .run(req.user.id, req.body.submission_id);
  }

  const dissolved = tryAutoDissolve(task.assigned_team_id);
  res.json({ success: true, taskId: req.params.id, status: 'COMPLETED', team_dissolved: dissolved });
}

app.post('/api/tasks/:id/approve', requireLeaderOrTeacher, completeTask);
app.post('/api/tasks/:id/complete', requireLeaderOrTeacher, completeTask);

// ── Teams ─────────────────────────────────────────────────────────────────────

app.get('/api/teams', (_req, res) => {
  const teams = db.prepare(`
    SELECT t.*, u.name as captain_name, tk.title as task_title
    FROM teams t LEFT JOIN users u ON t.captain_id = u.id LEFT JOIN tasks tk ON t.task_id = tk.id
    WHERE t.is_active = 1
  `).all();

  const getMembersStmt = db.prepare(`
    SELECT u.id, u.name, u.username, u.role, u.tag, tm.custom_point_share
    FROM team_memberships tm JOIN users u ON tm.user_id = u.id
    WHERE tm.team_id = ? AND u.role != 'DEV_STEALTH'
  `);

  const result = teams.map(team => ({
    ...team,
    members: getMembersStmt.all(team.id).map(sanitizeUser)
  }));

  res.json(result);
});

function createTeam(req, res) {
  const { name, captain_id, member_ids, task_id } = req.body;
  if (!name) return res.status(400).json({ error: 'Team name required' });

  const teamId = `t_${Date.now()}`;
  db.prepare("INSERT INTO teams (id, name, captain_id, task_id, is_active, status) VALUES (?, ?, ?, ?, 1, 'ACTIVE')")
    .run(teamId, name, captain_id || null, task_id || null);

  if (Array.isArray(member_ids)) {
    const ins = db.prepare('INSERT INTO team_memberships (id, user_id, team_id, custom_point_share) VALUES (?, ?, ?, 1.0)');
    member_ids.forEach((uid, i) => ins.run(`tm_${Date.now()}_${i}`, uid, teamId));
  }

  res.json({ success: true, teamId });
}

app.post('/api/teams', requireLeaderOrTeacher, createTeam);
app.post('/api/teams/create', requireLeaderOrTeacher, createTeam);

app.post('/api/teams/:id/points/override', verifyTeamAccess('id'), (req, res) => {
  const { user_id, custom_point_share } = req.body;
  if (typeof custom_point_share !== 'number' || !isFinite(custom_point_share) || custom_point_share < 0) {
    return res.status(400).json({ error: 'Invalid custom point share' });
  }

  const team = stmts.teamById.get(req.params.id);
  if (!team) return res.status(404).json({ error: 'Team not found' });

  db.prepare('UPDATE team_memberships SET custom_point_share = ? WHERE team_id = ? AND user_id = ?')
    .run(custom_point_share, req.params.id, user_id);
  res.json({ success: true });
});

app.post('/api/teams/redistribute-points', verifyTeamAccess('team_id'), (req, res) => {
  const { team_id, user_id, custom_point_share } = req.body;
  if (!team_id || !user_id || typeof custom_point_share !== 'number' || !isFinite(custom_point_share) || custom_point_share < 0) {
    return res.status(400).json({ error: 'Team ID, User ID, and valid custom_point_share required' });
  }

  if (!stmts.teamById.get(team_id)) return res.status(404).json({ error: 'Team not found' });

  db.prepare('UPDATE team_memberships SET custom_point_share = ? WHERE team_id = ? AND user_id = ?')
    .run(custom_point_share, team_id, user_id);
  res.json({ success: true });
});

app.post('/api/teams/:id/dissolve', requireLeaderOrTeacher, (req, res) => {
  db.prepare(`
    UPDATE teams SET is_active = 0, status = 'DISSOLVED', dissolved_at = CURRENT_TIMESTAMP, dissolution_reason = ?
    WHERE id = ?
  `).run(req.body.reason || 'MANUAL', req.params.id);
  res.json({ success: true, teamId: req.params.id, is_active: 0 });
});

// ── Hall of Fame ──────────────────────────────────────────────────────────────

app.get('/api/hall-of-fame', (_req, res) => {
  const leaderboard = getHallOfFameLeaderboard();
  const titles = db.prepare(`
    SELECT h.*, u.name as user_name, tm.name as team_name
    FROM hall_of_fame_titles h LEFT JOIN users u ON h.awarded_to_user_id = u.id LEFT JOIN teams tm ON h.awarded_to_team_id = tm.id
    ORDER BY h.awarded_at DESC
  `).all();
  res.json({ allTime: leaderboard, season1: leaderboard, titles });
});

function awardTitle(req, res) {
  const { title_name, category, awarded_to_user_id, awarded_to_team_id, season } = req.body;
  if (!title_name) return res.status(400).json({ error: 'Title name required' });

  const titleId = `hof_${Date.now()}`;
  db.prepare('INSERT INTO hall_of_fame_titles (id, title_name, category, awarded_to_user_id, awarded_to_team_id, season) VALUES (?, ?, ?, ?, ?, ?)')
    .run(titleId, title_name, category || 'Academics', awarded_to_user_id || null, awarded_to_team_id || null, season || 'Season 1');
  res.json({ success: true, titleId });
}

app.post('/api/hall-of-fame/award', requireLeaderOrTeacher, awardTitle);
app.post('/api/hall-of-fame/titles', requireLeaderOrTeacher, awardTitle);

// ── Error Handling & SPA Fallback ─────────────────────────────────────────────

app.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError || (err.message && err.message.includes('Invalid file type'))) {
    return res.status(400).json({ error: err.message });
  }
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.get('*', (req, res) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) {
    return res.status(404).json({ error: 'Resource not found' });
  }
  res.sendFile(path.join(publicDir, 'index.html'));
});

// ── Server Lifecycle ──────────────────────────────────────────────────────────

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
  if (serverInstance) serverInstance.close();
}

if (process.env.NODE_ENV !== 'test' && import.meta.url === `file://${process.argv[1]}`) {
  startServer(PORT);
}
