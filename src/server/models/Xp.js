import { db } from '../db/database.js';

export const XpModel = {
  createLedgerEntry({ id, userId, amount, reason, sourceType, sourceId, awardedBy }) {
    const stmt = db.prepare(`
      INSERT INTO xp_history (id, user_id, amount, reason, description, source_type, source_id, awarded_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      userId,
      amount,
      reason || null,
      reason || null,
      sourceType || 'MANUAL',
      sourceId || null,
      awardedBy || null
    );
    return id;
  },

  getUserXp(userId) {
    return db.prepare('SELECT id, xp, level FROM users WHERE id = ?').get(userId);
  },

  updateUserXpAndLevel(userId, xp, level) {
    return db.prepare('UPDATE users SET xp = ?, level = ? WHERE id = ?').run(xp, level, userId);
  },

  getDailyAutomatedXp(userId, dateStr) {
    const targetDate = dateStr || new Date().toISOString().split('T')[0];
    const row = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) AS total_automated
      SELECT_CLAUSE:
      FROM xp_history
      WHERE user_id = ?
        AND amount > 0
        AND (source_type IN ('AUTOMATED', 'SYSTEM', 'AUTO', 'TASK_AUTO', 'REVIEW_AUTO') OR awarded_by IS NULL)
        AND DATE(created_at) = DATE(?)
    `.replace('SELECT_CLAUSE:', '')).get(userId, targetDate);
    return row ? row.total_automated : 0;
  },

  getUserXpHistory(userId, { limit = 20, offset = 0 } = {}) {
    const history = db.prepare(`
      SELECT id, user_id, amount, reason, source_type, source_id, awarded_by, created_at
      FROM xp_history
      WHERE user_id = ?
      ORDER BY created_at DESC, rowid DESC
      LIMIT ? OFFSET ?
    `).all(userId, limit, offset);

    const { count } = db.prepare(`
      SELECT COUNT(*) as count
      FROM xp_history
      WHERE user_id = ?
    `).get(userId);

    return { history, total: count };
  }
};
