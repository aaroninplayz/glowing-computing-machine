import { db } from '../db/database.js';

export const TeamModel = {
  teamById: db.prepare('SELECT * FROM teams WHERE id = ?'),
  membershipCheck: db.prepare('SELECT id, is_locked FROM team_memberships WHERE team_id = ? AND user_id = ?'),

  getById(id) {
    const team = this.teamById.get(id);
    if (!team) return null;
    const members = db.prepare(`
      SELECT u.id, u.name, u.username, u.role, u.tag, tm.custom_point_share, tm.is_locked
      FROM team_memberships tm JOIN users u ON tm.user_id = u.id
      WHERE tm.team_id = ? AND u.role != 'DEV_STEALTH'
    `).all(id);
    return { ...team, members };
  },

  checkMembership(teamId, userId) {
    return !!this.membershipCheck.get(teamId, userId);
  },

  isMemberLocked(userId, teamId = null) {
    if (teamId) {
      const res = db.prepare('SELECT is_locked FROM team_memberships WHERE team_id = ? AND user_id = ?').get(teamId, userId);
      return res ? Number(res.is_locked) === 1 : false;
    }
    const res = db.prepare('SELECT is_locked FROM team_memberships WHERE user_id = ? AND is_locked = 1').get(userId);
    return !!res;
  },

  getAllActive() {
    const teams = db.prepare(`
      SELECT t.*, u.name as captain_name, tk.title as task_title
      FROM teams t LEFT JOIN users u ON t.captain_id = u.id LEFT JOIN tasks tk ON t.task_id = tk.id
      WHERE t.is_active = 1
    `).all();

    const getMembersStmt = db.prepare(`
      SELECT u.id, u.name, u.username, u.role, u.tag, tm.custom_point_share, tm.is_locked
      FROM team_memberships tm JOIN users u ON tm.user_id = u.id
      WHERE tm.team_id = ? AND u.role != 'DEV_STEALTH'
    `);

    return teams.map(team => ({
      ...team,
      members: getMembersStmt.all(team.id)
    }));
  },

  create({ id, name, captain_id, task_id, member_ids }) {
    db.prepare("INSERT INTO teams (id, name, captain_id, task_id, is_active, status) VALUES (?, ?, ?, ?, 1, 'ACTIVE')")
      .run(id, name, captain_id || null, task_id || null);

    if (Array.isArray(member_ids) && member_ids.length > 0) {
      const ins = db.prepare('INSERT INTO team_memberships (id, user_id, team_id, custom_point_share, is_locked) VALUES (?, ?, ?, 1.0, 0)');
      member_ids.forEach((uid, i) => ins.run(`tm_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 4)}`, uid, id));
    }
  },

  updateName(teamId, name) {
    return db.prepare('UPDATE teams SET name = ? WHERE id = ?').run(name, teamId);
  },

  updateTask(teamId, taskId) {
    db.prepare('UPDATE teams SET task_id = ? WHERE id = ?').run(taskId || null, teamId);
  },

  updateCustomPointShare(teamId, userId, customPointShare) {
    return db.prepare('UPDATE team_memberships SET custom_point_share = ? WHERE team_id = ? AND user_id = ?')
      .run(customPointShare, teamId, userId);
  },

  setMemberLock(teamId, userId, isLocked) {
    return db.prepare('UPDATE team_memberships SET is_locked = ? WHERE team_id = ? AND user_id = ?')
      .run(isLocked ? 1 : 0, teamId, userId);
  },

  swapMembers(user1Id, team1Id, user2Id, team2Id) {
    const swapTx = db.transaction(() => {
      // Update team1 membership to user2
      db.prepare('UPDATE team_memberships SET user_id = ? WHERE team_id = ? AND user_id = ?')
        .run(user2Id, team1Id, user1Id);
      // Update team2 membership to user1
      db.prepare('UPDATE team_memberships SET user_id = ? WHERE team_id = ? AND user_id = ?')
        .run(user1Id, team2Id, user2Id);
    });
    swapTx();
  },

  dissolve(teamId, reason = 'MANUAL') {
    return db.prepare(`
      UPDATE teams SET is_active = 0, status = 'DISSOLVED', dissolved_at = CURRENT_TIMESTAMP, dissolution_reason = ?
      WHERE id = ?
    `).run(reason, teamId);
  },

  tryAutoDissolve(teamId) {
    if (!teamId) return false;
    const activeTasks = db.prepare("SELECT COUNT(*) as cnt FROM tasks WHERE assigned_team_id = ? AND status != 'completed' AND status != 'archived'").get(teamId);
    if (activeTasks && activeTasks.cnt === 0) {
      this.dissolve(teamId, 'COMPLETED_ALL_TASKS');
      return true;
    }
    return false;
  },

  getMemberCount(teamId) {
    if (!teamId) return 0;
    const res = db.prepare('SELECT COUNT(*) as cnt FROM team_memberships WHERE team_id = ?').get(teamId);
    return res ? res.cnt : 0;
  },

  recordHistory({ team_id, team_name, captain_id, action, details }) {
    const id = `th_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const detailsJson = typeof details === 'object' ? JSON.stringify(details) : (details || null);
    db.prepare(`
      INSERT INTO team_history (id, team_id, team_name, captain_id, action, details)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, team_id || null, team_name || 'System Action', captain_id || null, action, detailsJson);
    return id;
  },

  getHistory(teamId = null) {
    if (teamId) {
      const rows = db.prepare('SELECT * FROM team_history WHERE team_id = ? ORDER BY created_at DESC').all(teamId);
      return rows.map(r => ({ ...r, details: r.details ? JSON.parse(r.details) : null }));
    }
    const rows = db.prepare('SELECT * FROM team_history ORDER BY created_at DESC LIMIT 100').all();
    return rows.map(r => ({ ...r, details: r.details ? JSON.parse(r.details) : null }));
  }
};
