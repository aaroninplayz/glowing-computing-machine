import { SubmissionModel } from '../models/Submission.js';
import { TaskModel } from '../models/Task.js';
import { ActivityService } from './activity.js';
import { NotificationService } from './notification.js';

const ALLOWED_STATUSES = ['draft', 'submitted', 'under_review', 'revision_requested', 'approved', 'rejected'];

export const SubmissionService = {
  validateStatus(status) {
    const s = (status || '').toLowerCase();
    if (!ALLOWED_STATUSES.includes(s)) {
      throw { status: 400, message: `Invalid submission status '${status}'. Allowed statuses: ${ALLOWED_STATUSES.join(', ')}` };
    }
    return s;
  },

  createSubmission({ task_id, submitted_by, proof_notes, proof_url, status = 'submitted', attachments = [] }, currentUser) {
    if (!task_id) {
      throw { status: 400, message: 'task_id is required for submission' };
    }

    const task = TaskModel.getById(task_id);
    if (!task) {
      throw { status: 404, message: 'Target task not found' };
    }

    const userId = submitted_by || (currentUser ? currentUser.id : null);
    if (!userId) {
      throw { status: 400, message: 'submitted_by user is required' };
    }

    const normStatus = this.validateStatus(status);

    const submission = SubmissionModel.create({
      task_id,
      submitted_by: userId,
      proof_notes,
      proof_url,
      status: normStatus,
      attachments
    });

    const user = currentUser || { id: userId, name: 'Member' };
    ActivityService.logTaskSubmit(user, task_id, submission.id);

    return submission;
  },

  getTaskSubmissions(taskId) {
    const task = TaskModel.getById(taskId);
    if (!task) {
      throw { status: 404, message: 'Task not found' };
    }
    const submissions = SubmissionModel.getByTaskId(taskId);
    const latest = SubmissionModel.getLatestByTask(taskId);
    return {
      task_id: taskId,
      submissions,
      latest_version: latest ? latest.version : 0,
      current_status: latest ? latest.status : (task.status || 'open')
    };
  },

  getSubmissionById(submissionId) {
    const sub = SubmissionModel.getById(submissionId);
    if (!sub) {
      throw { status: 404, message: 'Submission not found' };
    }
    return sub;
  },

  reviewSubmission(submissionId, { status, review_notes }, currentUser) {
    if (!status) {
      throw { status: 400, message: 'Review status is required' };
    }

    const sub = SubmissionModel.getById(submissionId);
    if (!sub) {
      throw { status: 404, message: 'Submission not found' };
    }

    const normStatus = this.validateStatus(status);
    const reviewerId = currentUser ? currentUser.id : null;

    // Enforce transition rules
    if (sub.status === 'draft' && normStatus === 'approved') {
      throw { status: 400, message: 'Cannot approve a draft submission. Must be submitted first.' };
    }

    const updated = SubmissionModel.updateReviewStatus(submissionId, {
      status: normStatus,
      review_notes,
      reviewed_by: reviewerId
    });

    // Notify submitter of review decision
    if (sub.submitted_by) {
      const typeMap = {
        approved: 'SUCCESS',
        revision_requested: 'WARNING',
        rejected: 'ALERT',
        under_review: 'INFO'
      };
      NotificationService.createNotification({
        userId: sub.submitted_by,
        title: `Submission ${normStatus.replace('_', ' ').toUpperCase()}`,
        message: `Your task submission (v${sub.version}) status was updated to ${normStatus.replace('_', ' ')}.${review_notes ? ` Notes: ${review_notes}` : ''}`,
        type: typeMap[normStatus] || 'INFO',
        link: `/tasks/${sub.task_id}`
      });
    }

    ActivityService.logTaskReview(currentUser, sub.task_id, submissionId, normStatus);

    return updated;
  },

  resubmitSubmission(taskId, { proof_notes, proof_url, attachments = [] }, currentUser) {
    if (!taskId) {
      throw { status: 400, message: 'task_id is required' };
    }

    const task = TaskModel.getById(taskId);
    if (!task) {
      throw { status: 404, message: 'Task not found' };
    }

    const latest = SubmissionModel.getLatestByTask(taskId);
    const newVersion = (latest ? latest.version : 0) + 1;
    const userId = currentUser ? currentUser.id : (latest ? latest.submitted_by : null);

    const submission = SubmissionModel.create({
      task_id: taskId,
      submitted_by: userId,
      proof_notes,
      proof_url,
      status: 'submitted',
      version: newVersion,
      attachments
    });

    ActivityService.logTaskSubmit(currentUser, taskId, submission.id);

    return submission;
  }
};
