import { db } from '../db/database.js';

export const SubtaskModel = {
  getByTaskId(taskId) {
    const rows = db.prepare(`
      SELECT st.*,
             u.name as assigned_to_name,
             c.name as created_by_name
      FROM subtasks st
      LEFT JOIN users u ON st.assigned_to = u.id
      LEFT JOIN users c ON st.created_by = c.id
      WHERE st.task_id = ?
      ORDER BY st.created_at ASC
    `).all(taskId);

    return rows.map(row => this.formatSubtaskRow(row));
  },

  getById(id) {
    const row = db.prepare(`
      SELECT st.*,
             u.name as assigned_to_name,
             c.name as created_by_name
      FROM subtasks st
      LEFT JOIN users u ON st.assigned_to = u.id
      LEFT JOIN users c ON st.created_by = c.id
      WHERE st.id = ?
    `).get(id);

    if (!row) return null;
    return this.formatSubtaskRow(row);
  },

  formatSubtaskRow(row) {
    let attachments = [];
    let comments = [];

    if (row.attachments) {
      try {
        attachments = JSON.parse(row.attachments);
      } catch (_) {
        attachments = [row.attachments];
      }
    }

    if (row.comments) {
      try {
        comments = JSON.parse(row.comments);
      } catch (_) {
        comments = [];
      }
    }

    return {
      ...row,
      attachments,
      comments
    };
  },

  create({ id, task_id, title, description, assigned_to, priority, deadline, status, created_by, attachments, comments }) {
    const isCompleted = (status || 'todo').toLowerCase() === 'done' ? 1 : 0;
    const attStr = attachments ? (typeof attachments === 'string' ? attachments : JSON.stringify(attachments)) : null;
    const commStr = comments ? (typeof comments === 'string' ? comments : JSON.stringify(comments)) : null;

    db.prepare(`
      INSERT INTO subtasks (
        id, task_id, title, description, assigned_to, priority, deadline, status, is_completed, created_by, attachments, comments
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      task_id,
      title,
      description || null,
      assigned_to || null,
      (priority || 'medium').toLowerCase(),
      deadline || null,
      (status || 'todo').toLowerCase(),
      isCompleted,
      created_by || null,
      attStr,
      commStr
    );

    return this.getById(id);
  },

  update(id, fields) {
    const existing = this.getById(id);
    if (!existing) return null;

    const allowedMap = {
      title: 'title',
      description: 'description',
      assigned_to: 'assigned_to',
      priority: 'priority',
      deadline: 'deadline',
      status: 'status',
      attachments: 'attachments',
      comments: 'comments'
    };

    const updates = [];
    const params = [];

    for (const [key, dbCol] of Object.entries(allowedMap)) {
      if (fields[key] !== undefined) {
        let val = fields[key];
        if (key === 'priority' || key === 'status') {
          val = val ? val.toLowerCase() : val;
        } else if ((key === 'attachments' || key === 'comments') && typeof val !== 'string') {
          val = JSON.stringify(val);
        }
        updates.push(`${dbCol} = ?`);
        params.push(val);
      }
    }

    if (fields.status !== undefined) {
      const isCompleted = fields.status.toLowerCase() === 'done' ? 1 : 0;
      updates.push('is_completed = ?');
      params.push(isCompleted);
    }

    if (updates.length === 0) return existing;

    params.push(id);
    db.prepare(`UPDATE subtasks SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    return this.getById(id);
  },

  delete(id) {
    return db.prepare('DELETE FROM subtasks WHERE id = ?').run(id);
  },

  addComment(id, commentObj) {
    const subtask = this.getById(id);
    if (!subtask) return null;

    const comments = subtask.comments || [];
    comments.push(commentObj);

    return this.update(id, { comments: JSON.stringify(comments) });
  }
};
