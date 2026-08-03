import { db } from '../db/database.js';
import { XpService } from '../services/xp.js';

export const ReviewModel = {
  getById(id) {
    const review = db.prepare(`
      SELECT r.*, u.name as reviewer_name, u.username as reviewer_username
      FROM reviews r
      LEFT JOIN users u ON r.reviewer_id = u.id
      WHERE r.id = ?
    `).get(id);

    return review || null;
  },

  getBySubmissionId(submissionId) {
    return db.prepare(`
      SELECT r.*, u.name as reviewer_name, u.username as reviewer_username
      FROM reviews r
      LEFT JOIN users u ON r.reviewer_id = u.id
      WHERE r.submission_id = ?
      ORDER BY r.created_at DESC
    `).all(submissionId);
  },

  create({ submission_id, reviewer_id, rating = 5, comments, suggestions, improvements, status = 'approved' }) {
    const id = `rev_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const normStatus = (status || 'approved').toLowerCase();

    db.prepare(`
      INSERT INTO reviews (id, submission_id, reviewer_id, rating, comments, suggestions, improvements, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      submission_id,
      reviewer_id || null,
      parseInt(rating, 10) || 5,
      comments || null,
      suggestions || null,
      improvements || null,
      normStatus
    );

    return this.getById(id);
  },

  update(id, fields) {
    const allowed = ['rating', 'comments', 'suggestions', 'improvements', 'status'];
    const updates = [];
    const params = [];

    for (const key of allowed) {
      if (fields[key] !== undefined) {
        updates.push(`${key} = ?`);
        params.push(fields[key]);
      }
    }

    if (updates.length === 0) return this.getById(id);

    params.push(id);
    db.prepare(`UPDATE reviews SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    return this.getById(id);
  },

  delete(id) {
    return db.prepare('DELETE FROM reviews WHERE id = ?').run(id);
  },

  awardXpToUser(userId, amount, sourceId = null, description = 'Awarded XP for completed task') {
    if (!userId || !amount) return null;
    const numericAmount = parseInt(amount, 10) || 0;
    if (numericAmount <= 0) return null;

    try {
      XpService.awardXP({
        userId,
        amount: numericAmount,
        reason: description,
        sourceType: 'TASK_APPROVAL',
        sourceId
      });
    } catch (err) {
      console.error('Error in awardXpToUser:', err);
    }

    const userRow = db.prepare('SELECT id, name, username, xp, level FROM users WHERE id = ?').get(userId);
    return userRow;
  },

  getUserXp(userId) {
    const res = db.prepare('SELECT xp FROM users WHERE id = ?').get(userId);
    return res ? (res.xp || 0) : 0;
  }
};
