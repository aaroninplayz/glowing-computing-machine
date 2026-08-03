import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getXpProgress } from '../services/xp.js';
import { db } from '../db/database.js';
import { AnnouncementService } from '../services/announcementService.js';
import { NotificationService } from '../services/notification.js';
import { TeamModel } from '../models/Team.js';
import { UserModel } from '../models/User.js';

const router = Router();

// GET /api/dashboard - Combined backend aggregation endpoint
router.get('/dashboard', requireAuth, (req, res, next) => {
  try {
    const user = req.user;
    const userId = user.id;

    // 1. XP Summary & Level progress
    const xpSummary = getXpProgress(user.xp || 0);

    // 2. User's Team Status
    const allActiveTeams = TeamModel.getAllActive();
    const myTeam = allActiveTeams.find(t => t.members && t.members.some(m => m.id === userId)) || null;

    let teamStatus = null;
    if (myTeam) {
      const captain = myTeam.captain_id ? UserModel.getByIdOrUsername(myTeam.captain_id) : null;
      const memberIds = myTeam.members.map(m => m.id);
      const teamXpRow = memberIds.length > 0
        ? db.prepare(`SELECT COALESCE(SUM(xp), 0) as total FROM users WHERE id IN (${memberIds.map(() => '?').join(',')})`).get(...memberIds)
        : { total: 0 };

      teamStatus = {
        id: myTeam.id,
        name: myTeam.name,
        captainName: captain ? captain.name : 'Unassigned',
        captainId: myTeam.captain_id,
        memberCount: myTeam.members.length,
        members: myTeam.members.map(m => ({ id: m.id, name: m.name, role: m.role, tag: m.tag })),
        totalPoints: teamXpRow ? teamXpRow.total : 0,
        status: myTeam.status || 'ACTIVE'
      };
    }

    // 3. Active / Assigned Tasks
    const activeTasks = db.prepare(`
      SELECT t.id, t.title, t.description, t.total_points, t.xp_reward, t.task_type, t.mode, t.status, t.due_date, t.assigned_user_id, t.assigned_team_id, t.created_at
      FROM tasks t
      WHERE t.status NOT IN ('COMPLETED', 'CLOSED', 'ARCHIVED')
        AND (
          t.assigned_user_id = ?
          ${myTeam ? 'OR t.assigned_team_id = ?' : ''}
          OR t.status = 'OPEN'
        )
      ORDER BY t.created_at DESC
      LIMIT 10
    `).all(...(myTeam ? [userId, myTeam.id] : [userId]));

    // 4. Recent Notifications
    const notifications = NotificationService.getUserNotifications(userId, { limit: 5 }) || [];

    // 5. Recent Announcements
    const announcements = AnnouncementService.getAllAnnouncements({}, user).slice(0, 3);

    // 6. Community Top 5 Leaderboard Preview
    const leaderboardRows = db.prepare(`
      SELECT id, name, username, role, tag, level, xp
      FROM users
      WHERE role != 'DEV_STEALTH'
      ORDER BY xp DESC, level DESC, name ASC
      LIMIT 5
    `).all();

    const leaderboard = leaderboardRows.map((u, idx) => ({
      rank: idx + 1,
      id: u.id,
      name: u.name,
      username: u.username,
      role: u.role,
      tag: u.tag,
      level: u.level || 1,
      xp: u.xp || 0
    }));

    // 7. Upcoming Deadlines
    const upcomingDeadlines = db.prepare(`
      SELECT id, title, due_date, status, task_type, total_points
      FROM tasks
      WHERE due_date IS NOT NULL
        AND status NOT IN ('COMPLETED', 'CLOSED', 'ARCHIVED')
      ORDER BY due_date ASC
      LIMIT 5
    `).all();

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          username: user.username,
          role: user.role,
          public_role: user.public_role || user.role,
          tag: user.tag
        },
        xpSummary,
        activeTasks,
        notifications,
        announcements,
        teamStatus,
        leaderboard,
        upcomingDeadlines
      }
    });
  } catch (err) {
    next(err);
  }
});

export default router;
