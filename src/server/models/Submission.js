import { db } from '../db/database.js';

export const SubmissionModel = {
  getById(id) {
    const submission = db.prepare(`
      SELECT ts.*, u.name as submitter_name, u.username as submitter_username,
             r.name as reviewer_name
      FROM task_submissions ts
      LEFT JOIN users u ON ts.submitted_by = u.id
      LEFT JOIN users r ON ts.reviewed_by = r.id
      WHERE ts.id = ?
    `).get(id);

    if (!submission) return null;

    const attachments = db.prepare(`
      SELECT * FROM submission_attachments WHERE submission_id = ? ORDER BY created_at ASC
    `).all(id);

    return {
      ...submission,
      attachments
    };
  },

  getByTaskId(taskId) {
    const submissions = db.prepare(`
      SELECT ts.*, u.name as submitter_name, u.username as submitter_username,
             r.name as reviewer_name
      FROM task_submissions ts
      LEFT JOIN users u ON ts.submitted_by = u.id
      LEFT JOIN users r ON ts.reviewed_by = r.id
      WHERE ts.task_id = ?
      ORDER BY ts.version DESC, ts.created_at DESC
    `).all(taskId);

    const getAttachmentsStmt = db.prepare(`
      SELECT * FROM submission_attachments WHERE submission_id = ? ORDER BY created_at ASC
    `);

    return submissions.map(sub => ({
      ...sub,
      attachments: getAttachmentsStmt.all(sub.id)
    }));
  },

  getLatestByTask(taskId) {
    const latest = db.prepare(`
      SELECT ts.*, u.name as submitter_name, u.username as submitter_username,
             r.name as reviewer_name
      FROM task_submissions ts
      LEFT JOIN users u ON ts.submitted_by = u.id
      LEFT JOIN users r ON ts.reviewed_by = r.id
      WHERE ts.task_id = ?
      ORDER BY ts.version DESC, ts.created_at DESC
      LIMIT 1
    `).get(taskId);

    if (!latest) return null;

    const attachments = db.prepare(`
      SELECT * FROM submission_attachments WHERE submission_id = ? ORDER BY created_at ASC
    `).all(latest.id);

    return {
      ...latest,
      attachments
    };
  },

  create({ task_id, submitted_by, proof_notes, proof_url, status = 'submitted', version, attachments = [] }) {
    let nextVersion = version;
    if (!nextVersion) {
      const maxRow = db.prepare('SELECT MAX(version) as max_v FROM task_submissions WHERE task_id = ?').get(task_id);
      nextVersion = (maxRow && maxRow.max_v) ? maxRow.max_v + 1 : 1;
    }

    const id = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

    db.prepare(`
      INSERT INTO task_submissions (id, task_id, submitted_by, proof_url, proof_notes, version, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, task_id, submitted_by, proof_url || null, proof_notes || null, nextVersion, (status || 'submitted').toLowerCase());

    if (Array.isArray(attachments) && attachments.length > 0) {
      const insertAttach = db.prepare(`
        INSERT INTO submission_attachments (id, submission_id, attachment_type, content, file_name, file_size, mime_type)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      attachments.forEach((att, idx) => {
        const attId = `att_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 4)}`;
        insertAttach.run(
          attId,
          id,
          att.attachment_type || att.type || 'text',
          att.content || att.url || '',
          att.file_name || att.name || null,
          att.file_size || att.size || null,
          att.mime_type || null
        );
      });
    }

    // Also update parent task status if active/open to pending_review
    const task = db.prepare('SELECT status FROM tasks WHERE id = ?').get(task_id);
    if (task && ['active', 'open', 'in_progress', 'draft'].includes((task.status || '').toLowerCase())) {
      db.prepare("UPDATE tasks SET status = 'pending_review' WHERE id = ?").run(task_id);
    }

    return this.getById(id);
  },

  updateReviewStatus(id, { status, review_notes, reviewed_by }) {
    const normStatus = (status || '').toLowerCase();
    db.prepare(`
      UPDATE task_submissions
      SET status = ?, review_notes = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(normStatus, review_notes || null, reviewed_by || null, id);

    const sub = this.getById(id);

    // Sync parent task status based on review status
    if (sub && sub.task_id) {
      if (normStatus === 'approved') {
        db.prepare("UPDATE tasks SET status = 'completed' WHERE id = ?").run(sub.task_id);
      } else if (normStatus === 'revision_requested' || normStatus === 'rejected') {
        db.prepare("UPDATE tasks SET status = 'in_progress' WHERE id = ?").run(sub.task_id);
      } else if (normStatus === 'under_review') {
        db.prepare("UPDATE tasks SET status = 'pending_review' WHERE id = ?").run(sub.task_id);
      }
    }

    return sub;
  },

  addAttachment(submissionId, { attachment_type, content, file_name, file_size, mime_type }) {
    const id = `att_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    db.prepare(`
      INSERT INTO submission_attachments (id, submission_id, attachment_type, content, file_name, file_size, mime_type)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, submissionId, attachment_type || 'text', content || '', file_name || null, file_size || null, mime_type || null);
    return id;
  }
};
