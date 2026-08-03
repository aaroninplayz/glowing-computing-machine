import { db } from '../db/database.js';

export const NotificationModel = {
  getPreferences(userId) {
    const row = db.prepare(`SELECT * FROM notification_preferences WHERE user_id = ?`).get(userId);
    if (row) {
      return {
        userId: row.user_id,
        emailEnabled: !!row.email_enabled,
        taskAlerts: !!row.task_alerts,
        reviewAlerts: !!row.review_alerts,
        systemAlerts: !!row.system_alerts,
        socialAlerts: !!row.social_alerts,
        email_enabled: row.email_enabled,
        task_alerts: row.task_alerts,
        review_alerts: row.review_alerts,
        system_alerts: row.system_alerts,
        social_alerts: row.social_alerts
      };
    }
    return {
      userId,
      emailEnabled: true,
      taskAlerts: true,
      reviewAlerts: true,
      systemAlerts: true,
      socialAlerts: true,
      email_enabled: 1,
      task_alerts: 1,
      review_alerts: 1,
      system_alerts: 1,
      social_alerts: 1
    };
  },

  updatePreferences(userId, prefs = {}) {
    const current = this.getPreferences(userId);
    const email_enabled = prefs.emailEnabled !== undefined ? (prefs.emailEnabled ? 1 : 0) : (prefs.email_enabled !== undefined ? (prefs.email_enabled ? 1 : 0) : current.email_enabled);
    const task_alerts = prefs.taskAlerts !== undefined ? (prefs.taskAlerts ? 1 : 0) : (prefs.task_alerts !== undefined ? (prefs.task_alerts ? 1 : 0) : current.task_alerts);
    const review_alerts = prefs.reviewAlerts !== undefined ? (prefs.reviewAlerts ? 1 : 0) : (prefs.review_alerts !== undefined ? (prefs.review_alerts ? 1 : 0) : current.review_alerts);
    const system_alerts = prefs.systemAlerts !== undefined ? (prefs.systemAlerts ? 1 : 0) : (prefs.system_alerts !== undefined ? (prefs.system_alerts ? 1 : 0) : current.system_alerts);
    const social_alerts = prefs.socialAlerts !== undefined ? (prefs.socialAlerts ? 1 : 0) : (prefs.social_alerts !== undefined ? (prefs.social_alerts ? 1 : 0) : current.social_alerts);

    db.prepare(`
      INSERT INTO notification_preferences (user_id, email_enabled, task_alerts, review_alerts, system_alerts, social_alerts, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id) DO UPDATE SET
        email_enabled = excluded.email_enabled,
        task_alerts = excluded.task_alerts,
        review_alerts = excluded.review_alerts,
        system_alerts = excluded.system_alerts,
        social_alerts = excluded.social_alerts,
        updated_at = CURRENT_TIMESTAMP
    `).run(userId, email_enabled, task_alerts, review_alerts, system_alerts, social_alerts);

    return this.getPreferences(userId);
  },

  create({ id, userId, title, message, type = 'INFO', link = null }) {
    const notifId = id || `n_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const stmt = db.prepare(`
      INSERT INTO notifications (id, user_id, title, message, type, link, is_read, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP)
    `);
    stmt.run(notifId, userId, title, message, type, link);
    return this.getById(notifId);
  },

  createBulk(notifications) {
    const stmt = db.prepare(`
      INSERT INTO notifications (id, user_id, title, message, type, link, is_read, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP)
    `);

    const insertMany = db.transaction((items) => {
      for (const item of items) {
        const notifId = item.id || `n_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        stmt.run(notifId, item.userId, item.title, item.message, item.type || 'INFO', item.link || null);
      }
    });

    insertMany(notifications);
    return true;
  },

  getById(id) {
    const stmt = db.prepare(`SELECT * FROM notifications WHERE id = ?`);
    return stmt.get(id);
  },

  getByUserId(userId, { limit = 20, offset = 0, unreadOnly = false, category = null } = {}) {
    let sql = `SELECT * FROM notifications WHERE user_id = ?`;
    const params = [userId];

    if (unreadOnly) {
      sql += ` AND is_read = 0`;
    }

    if (category) {
      const cat = String(category).toLowerCase();
      if (cat === 'system') {
        sql += ` AND type IN ('INFO', 'ALERT', 'WARNING', 'ANNOUNCEMENT')`;
      } else if (cat === 'tasks') {
        sql += ` AND type IN ('ASSIGNMENT', 'TASK', 'DEADLINE')`;
      } else if (cat === 'reviews') {
        sql += ` AND type IN ('REVIEW', 'RATING')`;
      } else if (cat === 'social') {
        sql += ` AND type IN ('MENTION', 'COMMUNITY', 'REWARD')`;
      }
    }

    sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    return db.prepare(sql).all(...params);
  },

  markAsRead(id, userId) {
    const stmt = db.prepare(`
      UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?
    `);
    const result = stmt.run(id, userId);
    return result.changes > 0;
  },

  markAllAsRead(userId) {
    const stmt = db.prepare(`
      UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0
    `);
    const result = stmt.run(userId);
    return result.changes;
  },

  getUnreadCount(userId) {
    const stmt = db.prepare(`
      SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0
    `);
    const row = stmt.get(userId);
    return row ? row.count : 0;
  }
};
