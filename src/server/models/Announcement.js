import { db } from '../db/database.js';

export const AnnouncementModel = {
  getById(id, userId = null) {
    const announcement = db.prepare(`
      SELECT a.*,
             COALESCE(a.author_id, 'system') as created_by,
             u.name as author_name, u.username as author_username,
             CASE WHEN ar.read_at IS NOT NULL THEN 1 ELSE 0 END as is_read
      FROM announcements a
      LEFT JOIN users u ON a.author_id = u.id
      LEFT JOIN announcement_reads ar ON a.id = ar.announcement_id AND ar.user_id = ?
      WHERE a.id = ?
    `).get(userId || '', id);

    if (announcement) {
      announcement.priority = (announcement.priority || 'normal').toLowerCase();
    }

    return announcement || null;
  },

  getAll({ category, priority, pinnedOnly, userId = null } = {}) {
    let sql = `
      SELECT a.*,
             COALESCE(a.author_id, 'system') as created_by,
             u.name as author_name, u.username as author_username,
             CASE WHEN ar.read_at IS NOT NULL THEN 1 ELSE 0 END as is_read
      FROM announcements a
      LEFT JOIN users u ON a.author_id = u.id
      LEFT JOIN announcement_reads ar ON a.id = ar.announcement_id AND ar.user_id = ?
    `;

    const where = [];
    const params = [userId || ''];

    if (category && category !== 'ALL') {
      where.push('LOWER(a.category) = LOWER(?)');
      params.push(category);
    }

    if (priority && priority !== 'ALL') {
      where.push('LOWER(a.priority) = LOWER(?)');
      params.push(priority);
    }

    if (pinnedOnly === true || pinnedOnly === 'true') {
      where.push('a.pinned = 1');
    }

    if (where.length > 0) {
      sql += ' WHERE ' + where.join(' AND ');
    }

    sql += `
      ORDER BY a.pinned DESC,
               CASE LOWER(a.priority)
                 WHEN 'urgent' THEN 1
                 WHEN 'high' THEN 2
                 WHEN 'normal' THEN 3
                 ELSE 4
               END,
               a.created_at DESC
    `;

    const rows = db.prepare(sql).all(...params);
    return rows.map(r => ({
      ...r,
      priority: (r.priority || 'normal').toLowerCase()
    }));
  },

  create({ title, content, category = 'General', priority = 'normal', pinned = 0, created_by }) {
    const id = `ann_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const normCategory = category || 'General';
    const normPriority = (priority || 'normal').toUpperCase();
    const isPinned = pinned ? 1 : 0;

    db.prepare(`
      INSERT INTO announcements (id, title, content, category, priority, pinned, author_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, title, content, normCategory, normPriority, isPinned, created_by || null);

    return this.getById(id, created_by);
  },

  update(id, fields) {
    const allowed = ['title', 'content', 'category', 'priority', 'pinned'];
    const updates = [];
    const params = [];

    for (const key of allowed) {
      if (fields[key] !== undefined) {
        if (key === 'priority') {
          updates.push('priority = ?');
          params.push(fields[key].toUpperCase());
        } else if (key === 'pinned') {
          updates.push('pinned = ?');
          params.push(fields[key] ? 1 : 0);
        } else {
          updates.push(`${key} = ?`);
          params.push(fields[key]);
        }
      }
    }

    if (updates.length === 0) return this.getById(id);

    params.push(id);
    db.prepare(`UPDATE announcements SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    return this.getById(id);
  },

  delete(id) {
    return db.prepare('DELETE FROM announcements WHERE id = ?').run(id);
  },

  markAsRead(announcementId, userId) {
    if (!announcementId || !userId) return false;
    db.prepare(`
      INSERT OR IGNORE INTO announcement_reads (announcement_id, user_id)
      VALUES (?, ?)
    `).run(announcementId, userId);
    return true;
  },

  markAllAsRead(userId) {
    if (!userId) return 0;
    const unread = db.prepare(`
      SELECT id FROM announcements
      WHERE id NOT IN (SELECT announcement_id FROM announcement_reads WHERE user_id = ?)
    `).all(userId);

    const stmt = db.prepare('INSERT OR IGNORE INTO announcement_reads (announcement_id, user_id) VALUES (?, ?)');
    const markTx = db.transaction(() => {
      unread.forEach(row => stmt.run(row.id, userId));
    });

    markTx();
    return unread.length;
  },

  getUnreadCount(userId) {
    if (!userId) return 0;
    const res = db.prepare(`
      SELECT COUNT(*) as cnt FROM announcements
      WHERE id NOT IN (SELECT announcement_id FROM announcement_reads WHERE user_id = ?)
    `).get(userId);
    return res ? res.cnt : 0;
  }
};
