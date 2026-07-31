import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import fs from 'fs';
import { db, initSchema } from './db/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize DB schema on start
initSchema();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Setup file upload storage in uploads/ directory
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

// 1. Auth Endpoint & Active User Lookup
app.get('/api/auth/users', (req, res) => {
  const users = db.prepare('SELECT id, name, email, role FROM users').all();
  res.json(users);
});

// 2. Learning Activities Endpoints
app.get('/api/activities', (req, res) => {
  const activities = db.prepare('SELECT * FROM learning_activities ORDER BY created_at DESC').all();
  res.json(activities);
});

app.post('/api/activities/:id/complete', (req, res) => {
  const { id } = req.params;
  const { user_id, proof_url, proof_notes } = req.body;

  const activity = db.prepare('SELECT * FROM learning_activities WHERE id = ?').get(id);
  if (!activity) return res.status(404).json({ error: 'Activity not found' });

  const status = activity.requires_approval ? 'PENDING_APPROVAL' : 'COMPLETED';
  const progressId = `p_${Date.now()}`;

  db.prepare(`
    INSERT INTO activity_progress (id, user_id, activity_id, status, proof_url, proof_notes, submitted_at)
    VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `).run(progressId, user_id, id, status, proof_url || null, proof_notes || null);

  res.json({ success: true, status, points: activity.points });
});

// 3. Teams & Auto-Randomizer Endpoint
app.get('/api/teams', (req, res) => {
  const teams = db.prepare(`
    SELECT t.*, u.name as captain_name 
    FROM teams t 
    LEFT JOIN users u ON t.captain_id = u.id
  `).all();

  const teamsWithMembers = teams.map(team => {
    const members = db.prepare(`
      SELECT u.id, u.name, u.role 
      FROM team_memberships tm 
      JOIN users u ON tm.user_id = u.id 
      WHERE tm.team_id = ?
    `).all(team.id);
    return { ...team, members };
  });

  res.json(teamsWithMembers);
});

// Admin 1-Click Auto-Randomize Teams (ADR 0007)
app.post('/api/teams/auto-randomize', (req, res) => {
  const { team_size = 4 } = req.body;
  const operatives = db.prepare("SELECT id FROM users WHERE role IN ('OPERATIVE', 'VANGUARD')").all();

  // Shuffle operatives
  const shuffled = operatives.sort(() => 0.5 - Math.random());
  
  db.exec('DELETE FROM team_memberships');

  const teams = db.prepare('SELECT id FROM teams').all();
  if (teams.length === 0) return res.status(400).json({ error: 'No teams created to assign into' });

  let teamIndex = 0;
  shuffled.forEach(user => {
    const teamId = teams[teamIndex % teams.length].id;
    db.prepare('INSERT INTO team_memberships (id, user_id, team_id) VALUES (?, ?, ?)')
      .run(`tm_${Date.now()}_${Math.random()}`, user.id, teamId);
    teamIndex++;
  });

  res.json({ success: true, message: 'Teams auto-randomized and rebalanced!' });
});

// 4. Collaborative Challenges Endpoint
app.get('/api/challenges', (req, res) => {
  const challenges = db.prepare('SELECT * FROM collaborative_challenges').all();
  res.json(challenges);
});

// 5. Resource Repository & File Upload Streaming
app.get('/api/resources', (req, res) => {
  const resources = db.prepare(`
    SELECT r.*, u.name as uploader_name 
    FROM resources r 
    JOIN users u ON r.uploaded_by = u.id 
    ORDER BY r.created_at DESC
  `).all();
  res.json(resources);
});

app.post('/api/resources/upload', upload.single('file'), (req, res) => {
  const { title, category, uploaded_by } = req.body;
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const resourceId = `r_${Date.now()}`;
  const fileUrl = `/uploads/${req.file.filename}`;

  db.prepare(`
    INSERT INTO resources (id, title, url, category, file_type, uploaded_by)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(resourceId, title || req.file.originalname, fileUrl, category || 'General', req.file.mimetype.split('/')[1] || 'file', uploaded_by || 'u1');

  res.json({ success: true, resourceId, fileUrl });
});

// 6. Dual-View Leaderboards Endpoint (ADR 0010)
app.get('/api/leaderboard', (req, res) => {
  // Individual Leaderboard
  const individual = db.prepare(`
    SELECT u.id, u.name, u.role, COALESCE(SUM(la.points), 0) as total_points
    FROM users u
    LEFT JOIN activity_progress ap ON u.id = ap.user_id AND ap.status = 'COMPLETED'
    LEFT JOIN learning_activities la ON ap.activity_id = la.id
    GROUP BY u.id
    ORDER BY total_points DESC
  `).all();

  // Team Leaderboard
  const team = db.prepare(`
    SELECT t.id, t.name, COALESCE(SUM(la.points), 0) as team_points
    FROM teams t
    LEFT JOIN team_memberships tm ON t.id = tm.team_id
    LEFT JOIN activity_progress ap ON tm.user_id = ap.user_id AND ap.status = 'COMPLETED'
    LEFT JOIN learning_activities la ON ap.activity_id = la.id
    GROUP BY t.id
    ORDER BY team_points DESC
  `).all();

  res.json({ individual, team });
});

app.listen(PORT, () => {
  console.log(`⚡ Forge Backend Express Server running on http://localhost:${PORT}`);
});
