import { db } from '../db/database.js';

export const AdminModel = {
  // System Configuration
  getConfig() {
    const rows = db.prepare(`SELECT key, value FROM system_config`).all();
    const config = {};
    for (const r of rows) {
      config[r.key] = r.value;
    }
    return config;
  },

  updateConfig(configObj = {}) {
    const stmt = db.prepare(`
      INSERT INTO system_config (key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = CURRENT_TIMESTAMP
    `);

    const updateMany = db.transaction((obj) => {
      for (const [key, val] of Object.entries(obj)) {
        stmt.run(key, String(val));
      }
    });

    updateMany(configObj);
    return this.getConfig();
  },

  // Feature Toggles
  getFeatures() {
    const rows = db.prepare(`SELECT key, name, description, is_enabled, updated_at FROM feature_toggles ORDER BY key ASC`).all();
    return rows.map(r => ({
      key: r.key,
      name: r.name,
      description: r.description,
      is_enabled: !!r.is_enabled,
      updated_at: r.updated_at
    }));
  },

  isFeatureEnabled(key) {
    const row = db.prepare(`SELECT is_enabled FROM feature_toggles WHERE key = ?`).get(key);
    return row ? !!row.is_enabled : true;
  },

  updateFeature(key, isEnabled) {
    const is_enabled = isEnabled ? 1 : 0;
    const stmt = db.prepare(`
      UPDATE feature_toggles
      SET is_enabled = ?, updated_at = CURRENT_TIMESTAMP
      WHERE key = ?
    `);
    const result = stmt.run(is_enabled, key);
    if (result.changes === 0) {
      db.prepare(`
        INSERT INTO feature_toggles (key, name, description, is_enabled, updated_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).run(key, key.toUpperCase(), 'Custom Feature Toggle', is_enabled);
    }
    return this.getFeatures();
  },

  // User Management
  getUsers({ limit = 50, offset = 0, role = null } = {}) {
    let sql = `SELECT id, name, username, email, role, is_suspended, xp, level, created_at FROM users`;
    const params = [];

    if (role) {
      sql += ` WHERE role = ?`;
      params.push(role);
    }

    sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    return db.prepare(sql).all(...params);
  },

  updateUserStatus(id, { role, is_suspended }) {
    const updates = [];
    const params = [];

    if (role !== undefined) {
      updates.push('role = ?');
      params.push(role);
    }
    if (is_suspended !== undefined) {
      updates.push('is_suspended = ?');
      params.push(is_suspended ? 1 : 0);
    }

    if (updates.length > 0) {
      params.push(id);
      db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    }

    return db.prepare(`SELECT id, name, username, email, role, is_suspended, xp, level FROM users WHERE id = ?`).get(id);
  },

  // Audit Log Viewer (Queries activity_log for system & admin events)
  getAuditLog({ limit = 50, offset = 0, actionType = null } = {}) {
    let sql = `
      SELECT a.*, u.name as user_name, u.username as user_username, u.role as user_role
      FROM activity_log a
      LEFT JOIN users u ON a.user_id = u.id
    `;
    const params = [];

    if (actionType) {
      sql += ` WHERE a.action = ? OR a.action_type = ?`;
      params.push(actionType, actionType);
    }

    sql += ` ORDER BY a.created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit, 10) || 50, parseInt(offset, 10) || 0);

    const rows = db.prepare(sql).all(...params);
    return rows.map(r => ({
      ...r,
      action_type: r.action || r.action_type || 'SYSTEM',
      action_details: typeof r.details === 'string' ? r.details : JSON.stringify(r.details)
    }));
  }
};
