import { db } from '../db/database.js';

export const TaskModel = {
  getById(id) {
    const task = db.prepare(`
      SELECT t.*,
             tm.name as assigned_team_name,
             u.name as assigned_user_name,
             creator.name as assigned_by_name
      FROM tasks t
      LEFT JOIN teams tm ON t.assigned_team_id = tm.id
      LEFT JOIN users u ON t.assigned_user_id = u.id
      LEFT JOIN users creator ON t.assigned_by = creator.id
      WHERE t.id = ?
    `).get(id);

    if (!task) return null;

    const submissions = db.prepare(`
      SELECT ts.*, u.name as submitter_name, r.name as reviewer_name
      FROM task_submissions ts
      LEFT JOIN users u ON ts.submitted_by = u.id
      LEFT JOIN users r ON ts.reviewed_by = r.id
      WHERE ts.task_id = ?
      ORDER BY ts.created_at DESC
    `).all(id);

    const subtaskRows = db.prepare(`
      SELECT st.*, u.name as assigned_to_name, c.name as created_by_name
      FROM subtasks st
      LEFT JOIN users u ON st.assigned_to = u.id
      LEFT JOIN users c ON st.created_by = c.id
      WHERE st.task_id = ?
      ORDER BY st.created_at ASC
    `).all(id);

    const subtasks = subtaskRows.map(row => {
      let attachments = [];
      let comments = [];
      if (row.attachments) {
        try { attachments = JSON.parse(row.attachments); } catch (_) { attachments = [row.attachments]; }
      }
      if (row.comments) {
        try { comments = JSON.parse(row.comments); } catch (_) { comments = []; }
      }
      return { ...row, attachments, comments };
    });

    const totalSubtasks = subtasks.length;
    const completedSubtasks = subtasks.filter(s => (s.status || '').toLowerCase() === 'done' || s.is_completed === 1).length;
    const progressPercentage = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

    task.submissions = submissions;
    task.subtasks = subtasks;
    task.subtask_summary = { total: totalSubtasks, completed: completedSubtasks, percentage: progressPercentage };
    task.progress_percentage = progressPercentage;
    return task;
  },

  formatTaskRowWithProgress(task) {
    if (!task) return task;
    const subtaskCount = task.subtask_count || 0;
    const completedCount = task.completed_subtasks_count || 0;
    const progressPercentage = subtaskCount > 0 ? Math.round((completedCount / subtaskCount) * 100) : 0;
    return {
      ...task,
      subtask_summary: { total: subtaskCount, completed: completedCount, percentage: progressPercentage },
      progress_percentage: progressPercentage
    };
  },

  getAllGrouped() {
    const selectClause = `
      t.*, tm.name as assigned_team_name, u.name as assigned_user_name,
      (SELECT COUNT(*) FROM subtasks st WHERE st.task_id = t.id) as subtask_count,
      (SELECT COUNT(*) FROM subtasks st WHERE st.task_id = t.id AND st.is_completed = 1) as completed_subtasks_count
    `;

    const official = db.prepare(`
      SELECT ${selectClause}
      FROM tasks t
      LEFT JOIN teams tm ON t.assigned_team_id = tm.id
      LEFT JOIN users u ON t.assigned_user_id = u.id
      WHERE t.is_marketplace = 0
      ORDER BY t.created_at DESC
    `).all().map(t => this.formatTaskRowWithProgress(t));

    const teamTasks = db.prepare(`
      SELECT ${selectClause}
      FROM tasks t
      LEFT JOIN teams tm ON t.assigned_team_id = tm.id
      LEFT JOIN users u ON t.assigned_user_id = u.id
      WHERE t.is_marketplace = 0 AND t.task_type = 'TEAM_TASK'
      ORDER BY t.created_at DESC
    `).all().map(t => this.formatTaskRowWithProgress(t));

    const challenges = db.prepare(`
      SELECT ${selectClause}
      FROM tasks t
      LEFT JOIN teams tm ON t.assigned_team_id = tm.id
      LEFT JOIN users u ON t.assigned_user_id = u.id
      WHERE t.is_marketplace = 0 AND t.task_type = 'CHALLENGE'
      ORDER BY t.created_at DESC
    `).all().map(t => this.formatTaskRowWithProgress(t));

    const marketplace = db.prepare(`
      SELECT ${selectClause}, (SELECT COUNT(*) FROM task_upvotes tu WHERE tu.task_id = t.id) as upvotes
      FROM tasks t
      LEFT JOIN teams tm ON t.assigned_team_id = tm.id
      LEFT JOIN users u ON t.assigned_user_id = u.id
      WHERE t.is_marketplace = 1
      ORDER BY upvotes DESC
    `).all().map(t => this.formatTaskRowWithProgress(t));

    return { official, marketplace, teamTasks, challenges };
  },

  queryTasks({ status, difficulty, task_type, assigned_to, search }) {
    const selectClause = `
      t.*, tm.name as assigned_team_name, u.name as assigned_user_name,
      (SELECT COUNT(*) FROM subtasks st WHERE st.task_id = t.id) as subtask_count,
      (SELECT COUNT(*) FROM subtasks st WHERE st.task_id = t.id AND st.is_completed = 1) as completed_subtasks_count
    `;
    let sql = `
      SELECT ${selectClause}
      FROM tasks t
      LEFT JOIN teams tm ON t.assigned_team_id = tm.id
      LEFT JOIN users u ON t.assigned_user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      sql += ` AND LOWER(t.status) = LOWER(?)`;
      params.push(status);
    }
    if (difficulty) {
      sql += ` AND LOWER(t.difficulty) = LOWER(?)`;
      params.push(difficulty);
    }
    if (task_type) {
      sql += ` AND LOWER(t.task_type) = LOWER(?)`;
      params.push(task_type);
    }
    if (assigned_to) {
      sql += ` AND (t.assigned_user_id = ? OR t.assigned_team_id = ?)`;
      params.push(assigned_to, assigned_to);
    }
    if (search) {
      sql += ` AND (t.title LIKE ? OR t.description LIKE ? OR t.instructions LIKE ?)`;
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    sql += ` ORDER BY t.created_at DESC`;
    const rows = db.prepare(sql).all(...params);
    return rows.map(t => this.formatTaskRowWithProgress(t));
  },

  create({ id, title, description, instructions, resources, total_points, xp_reward, badge_reward, difficulty, task_type, mode, is_marketplace, assigned_team_id, assigned_user_id, assigned_by, proof_requirements, deadline, status }) {
    db.prepare(`
      INSERT INTO tasks (
        id, title, description, instructions, resources, total_points, xp_reward, badge_reward,
        difficulty, task_type, mode, is_marketplace, assigned_team_id, assigned_user_id,
        assigned_by, proof_requirements, deadline, due_date, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      title,
      description,
      instructions || null,
      resources || null,
      total_points !== undefined ? total_points : 50,
      xp_reward || 0,
      badge_reward || null,
      difficulty || 'MEDIUM',
      task_type || 'TEAM_TASK',
      mode || 'CHOICE',
      is_marketplace ? 1 : 0,
      assigned_team_id || null,
      assigned_user_id || null,
      assigned_by || null,
      proof_requirements || null,
      deadline || null,
      deadline || null,
      status || 'active'
    );
    return this.getById(id);
  },

  update(id, fields) {
    const allowedMap = {
      title: 'title',
      description: 'description',
      instructions: 'instructions',
      resources: 'resources',
      total_points: 'total_points',
      xp_reward: 'xp_reward',
      badge_reward: 'badge_reward',
      difficulty: 'difficulty',
      task_type: 'task_type',
      mode: 'mode',
      is_marketplace: 'is_marketplace',
      assigned_team_id: 'assigned_team_id',
      assigned_user_id: 'assigned_user_id',
      assigned_by: 'assigned_by',
      proof_requirements: 'proof_requirements',
      deadline: 'deadline',
      status: 'status'
    };

    const updates = [];
    const params = [];

    for (const [key, dbCol] of Object.entries(allowedMap)) {
      if (fields[key] !== undefined) {
        updates.push(`${dbCol} = ?`);
        params.push(fields[key]);
      }
    }

    if (fields.deadline !== undefined) {
      updates.push(`due_date = ?`);
      params.push(fields.deadline);
    }

    if (updates.length === 0) return this.getById(id);

    params.push(id);
    db.prepare(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    return this.getById(id);
  },

  delete(id) {
    return db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
  },

  updateStatus(id, status) {
    db.prepare('UPDATE tasks SET status = ? WHERE id = ?').run(status, id);
    return this.getById(id);
  },

  suggest({ taskId, title, description, totalPoints, taskType, mode, userId }) {
    db.prepare(`
      INSERT INTO tasks (id, title, description, total_points, task_type, mode, is_marketplace, status)
      VALUES (?, ?, ?, ?, ?, ?, 1, 'MARKETPLACE')
    `).run(taskId, title, description, totalPoints || 20, taskType || 'CHALLENGE', mode || 'CHOICE');

    db.prepare('INSERT OR IGNORE INTO task_upvotes (task_id, user_id) VALUES (?, ?)').run(taskId, userId);
  },

  getUnvotedUser(taskId) {
    return db.prepare('SELECT id FROM users WHERE id NOT IN (SELECT user_id FROM task_upvotes WHERE task_id = ?) LIMIT 1').get(taskId);
  },

  upvote(taskId, userId) {
    db.prepare('INSERT OR IGNORE INTO task_upvotes (task_id, user_id) VALUES (?, ?)').run(taskId, userId);
    return this.getUpvoteCount(taskId);
  },

  removeUpvote(taskId, userId) {
    db.prepare('DELETE FROM task_upvotes WHERE task_id = ? AND user_id = ?').run(taskId, userId);
    return this.getUpvoteCount(taskId);
  },

  getUpvoteCount(taskId) {
    const res = db.prepare('SELECT COUNT(*) as upvotes FROM task_upvotes WHERE task_id = ?').get(taskId);
    return res ? res.upvotes : 0;
  },

  assign(taskId, { team_id, user_id, assigned_by, task_type }) {
    db.prepare(`
      UPDATE tasks SET is_marketplace = 0, assigned_team_id = ?, assigned_user_id = ?, assigned_by = ?, task_type = ?, status = 'in_progress'
      WHERE id = ?
    `).run(team_id || null, user_id || null, assigned_by, task_type, taskId);
  },

  createSubmission({ id, taskId, userId, proofUrl, proofNotes }) {
    db.prepare("INSERT INTO task_submissions (id, task_id, submitted_by, proof_url, proof_notes, status) VALUES (?, ?, ?, ?, ?, 'PENDING')")
      .run(id, taskId, userId, proofUrl, proofNotes || '');
    db.prepare("UPDATE tasks SET status = 'pending_review' WHERE id = ?").run(taskId);
  },

  complete(taskId, submissionId, reviewerId) {
    db.prepare("UPDATE tasks SET status = 'completed' WHERE id = ?").run(taskId);
    if (submissionId) {
      db.prepare("UPDATE task_submissions SET status = 'APPROVED', reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP WHERE id = ?")
        .run(reviewerId, submissionId);
    }
  }
};
