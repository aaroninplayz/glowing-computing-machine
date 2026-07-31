import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import fs from 'fs';
import { db, initSchema } from './db/database.js';

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

// --- REST API ENDPOINTS ---

// 1. Flexible Authentication Endpoint (Email / Username / Phone + Password)
app.post('/api/auth/login', (req, res) => {
  const { identifier, password } = req.body;
  if (!identifier || !password) return res.status(400).json({ error: 'Identifier and password required' });

  // Match email, username, or phone
  const user = db.prepare(`
    SELECT id, name, username, email, phone, role, tag 
    FROM users 
    WHERE (email = ? OR username = ? OR phone = ?) AND password_hash = ?
  `).get(identifier, identifier, identifier, password);

  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  // Stealth Developer Role: Map DEV_STEALTH to OPERATIVE in public payload
  const publicRole = user.role === 'DEV_STEALTH' ? 'OPERATIVE' : user.role;

  res.json({ success: true, user: { ...user, public_role: publicRole } });
});

// 2. Tasks & Task Marketplace Endpoints
app.get('/api/tasks', (req, res) => {
  const official = db.prepare('SELECT * FROM tasks WHERE is_marketplace = 0 ORDER BY created_at DESC').all();
  const marketplace = db.prepare('SELECT * FROM tasks WHERE is_marketplace = 1 ORDER BY upvotes DESC').all();
  res.json({ official, marketplace });
});

// Suggest a Task (Task Marketplace)
app.post('/api/tasks/suggest', (req, res) => {
  const { title, description, total_points } = req.body;
  if (!title || !description) return res.status(400).json({ error: 'Title and description required' });

  const taskId = `market_${Date.now()}`;
  db.prepare(`
    INSERT INTO tasks (id, title, description, total_points, is_marketplace, upvotes, status)
    VALUES (?, ?, ?, ?, 1, 1, 'MARKETPLACE')
  `).run(taskId, title, description, total_points || 20);

  res.json({ success: true, taskId });
});

// Upvote Task Marketplace Idea
app.post('/api/tasks/:id/upvote', (req, res) => {
  const { id } = req.params;
  db.prepare('UPDATE tasks SET upvotes = upvotes + 1 WHERE id = ?').run(id);
  const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  res.json({ success: true, upvotes: updated ? updated.upvotes : 0 });
});

// Student Leader Assign Marketplace Task to Team
app.post('/api/tasks/:id/assign', (req, res) => {
  const { id } = req.params;
  const { team_id } = req.body;
  db.prepare(`
    UPDATE tasks 
    SET is_marketplace = 0, assigned_team_id = ?, status = 'IN_PROGRESS' 
    WHERE id = ?
  `).run(team_id, id);

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
  `).run(subId, id, submitted_by, proofUrl, proof_notes || '');

  db.prepare("UPDATE tasks SET status = 'PENDING_APPROVAL' WHERE id = ?").run(id);

  res.json({ success: true, submissionId: subId });
});

// 3. Teams & Dynamic Point Share Endpoints
app.get('/api/teams', (req, res) => {
  const teams = db.prepare(`
    SELECT t.*, u.name as captain_name 
    FROM teams t 
    LEFT JOIN users u ON t.captain_id = u.id 
    WHERE t.is_active = 1
  `).all();

  const teamsWithMembers = teams.map(team => {
    const members = db.prepare(`
      SELECT u.id, u.name, u.role, u.tag, tm.custom_point_share 
      FROM team_memberships tm 
      JOIN users u ON tm.user_id = u.id 
      WHERE tm.team_id = ?
    `).all(team.id);
    return { ...team, members };
  });

  res.json(teamsWithMembers);
});

// Dynamic Point Share Redistribution (Leader / Captain adjustment)
app.post('/api/teams/redistribute-points', (req, res) => {
  const { team_id, user_id, custom_point_share } = req.body;
  db.prepare(`
    UPDATE team_memberships 
    SET custom_point_share = ? 
    WHERE team_id = ? AND user_id = ?
  `).run(custom_point_share, team_id, user_id);

  res.json({ success: true });
});

// 4. The Hall of Fame Endpoint (All-Time, Season 1, Awarded Titles Wall)
app.get('/api/hall-of-fame', (req, res) => {
  // All-Time Operative Leaderboard
  const allTime = db.prepare(`
    SELECT u.id, u.name, u.tag, u.role, COALESCE(SUM(t.total_points * tm.custom_point_share), 0) as points
    FROM users u
    LEFT JOIN team_memberships tm ON u.id = tm.user_id
    LEFT JOIN tasks t ON tm.team_id = t.assigned_team_id AND t.status = 'COMPLETED'
    WHERE u.role != 'DEV_STEALTH'
    GROUP BY u.id
    ORDER BY points DESC
  `).all();

  // Season 1 Leaderboard
  const season1 = db.prepare(`
    SELECT u.id, u.name, u.tag, COALESCE(SUM(t.total_points * tm.custom_point_share), 0) as points
    FROM users u
    LEFT JOIN team_memberships tm ON u.id = tm.user_id
    LEFT JOIN tasks t ON tm.team_id = t.assigned_team_id AND t.status = 'COMPLETED'
    WHERE u.role != 'DEV_STEALTH'
    GROUP BY u.id
    ORDER BY points DESC
  `).all();

  // Awarded Titles Wall
  const titles = db.prepare(`
    SELECT h.*, u.name as user_name, tm.name as team_name 
    FROM hall_of_fame_titles h 
    LEFT JOIN users u ON h.awarded_to_user_id = u.id 
    LEFT JOIN teams tm ON h.awarded_to_team_id = tm.id 
    ORDER BY h.awarded_at DESC
  `).all();

  res.json({ allTime, season1, titles });
});

// Serve frontend for all unmatched routes
app.get('*', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`⚡ Forge Server running on http://localhost:${PORT}`);
});
