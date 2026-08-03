import { ReviewModel } from '../models/Review.js';
import { SubmissionModel } from '../models/Submission.js';
import { TaskModel } from '../models/Task.js';
import { TeamModel } from '../models/Team.js';
import { NotificationService } from './notification.js';
import { ActivityService } from './activity.js';

const ALLOWED_STATUSES = ['approved', 'revision_requested', 'rejected', 'under_review'];

export const ReviewService = {
  createReview(submissionId, { rating = 5, comments, suggestions, improvements, status = 'approved' }, currentUser) {
    if (!submissionId) {
      throw { status: 400, message: 'submission_id is required' };
    }

    const sub = SubmissionModel.getById(submissionId);
    if (!sub) {
      throw { status: 404, message: 'Submission not found' };
    }

    const normStatus = (status || 'approved').toLowerCase();
    if (!ALLOWED_STATUSES.includes(normStatus)) {
      throw { status: 400, message: `Invalid review status '${status}'. Allowed statuses: ${ALLOWED_STATUSES.join(', ')}` };
    }

    const reviewerId = currentUser ? currentUser.id : null;

    // Create persistent detailed review entry
    const review = ReviewModel.create({
      submission_id: submissionId,
      reviewer_id: reviewerId,
      rating,
      comments,
      suggestions,
      improvements,
      status: normStatus
    });

    // Update submission status and sync parent task state
    const updatedSub = SubmissionModel.updateReviewStatus(submissionId, {
      status: normStatus,
      review_notes: comments || suggestions || improvements || `Status set to ${normStatus}`,
      reviewed_by: reviewerId
    });

    const task = TaskModel.getById(sub.task_id) || {};
    const reviewerName = currentUser ? currentUser.name : 'Reviewer';

    let xpAwarded = 0;

    // On Approval: Award XP to submitter and team members
    if (normStatus === 'approved') {
      xpAwarded = task.xp_reward || task.total_points || 100;
      
      // Award XP to primary submitter
      if (sub.submitted_by) {
        ReviewModel.awardXpToUser(
          sub.submitted_by,
          xpAwarded,
          task.id || sub.task_id,
          `Awarded ${xpAwarded} XP for approved task "${task.title || 'Mission'}"`
        );
      }

      // If team task, also award XP to all squad team members
      if (task.assigned_team_id) {
        const team = TeamModel.getById(task.assigned_team_id);
        if (team && Array.isArray(team.members)) {
          team.members.forEach(member => {
            if (member.id && member.id !== sub.submitted_by) {
              ReviewModel.awardXpToUser(
                member.id,
                xpAwarded,
                task.id || sub.task_id,
                `Awarded ${xpAwarded} XP for squad task approval "${task.title || 'Mission'}"`
              );
            }
          });
        }
      }
    }

    // Trigger Notification Engine to alert member
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
        message: `Your deliverable (v${sub.version}) for "${task.title || 'Task'}" was reviewed by ${reviewerName}. Rating: ${rating}/5.${comments ? ` Comments: ${comments}` : ''}${xpAwarded > 0 ? ` (+${xpAwarded} XP Awarded!)` : ''}`,
        type: typeMap[normStatus] || 'INFO',
        link: `/tasks/${sub.task_id}`
      });
    }

    // Audit logging
    ActivityService.logTaskReview(currentUser, sub.task_id, submissionId, normStatus);

    return {
      review,
      submission: updatedSub,
      task,
      xp_awarded: xpAwarded
    };
  },

  getSubmissionReviews(submissionId) {
    const sub = SubmissionModel.getById(submissionId);
    if (!sub) {
      throw { status: 404, message: 'Submission not found' };
    }
    return ReviewModel.getBySubmissionId(submissionId);
  },

  getReviewById(reviewId) {
    const review = ReviewModel.getById(reviewId);
    if (!review) {
      throw { status: 404, message: 'Review not found' };
    }
    return review;
  },

  updateReview(reviewId, fields, currentUser) {
    const review = ReviewModel.getById(reviewId);
    if (!review) {
      throw { status: 404, message: 'Review not found' };
    }
    return ReviewModel.update(reviewId, fields);
  },

  deleteReview(reviewId, currentUser) {
    const review = ReviewModel.getById(reviewId);
    if (!review) {
      throw { status: 404, message: 'Review not found' };
    }
    return ReviewModel.delete(reviewId);
  }
};
