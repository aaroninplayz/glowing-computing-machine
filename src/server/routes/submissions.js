import { Router } from 'express';
import { SubmissionService } from '../services/submissionService.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { validate, submissionSchemas } from '../middleware/validation.js';

const router = Router();

// Create new submission for a task
router.post('/tasks/:id/submissions', requireAuth, validate(submissionSchemas.create), (req, res, next) => {
  try {
    const submission = SubmissionService.createSubmission({
      task_id: req.params.id,
      ...req.body
    }, req.user);
    res.status(201).json({ success: true, submission });
  } catch (err) {
    next(err);
  }
});

// Fetch all submission versions & history for a task
router.get('/tasks/:id/submissions', requireAuth, (req, res, next) => {
  try {
    const result = SubmissionService.getTaskSubmissions(req.params.id);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

// Resubmit a new version of a task submission
router.post('/tasks/:id/submissions/resubmit', requireAuth, validate(submissionSchemas.create), (req, res, next) => {
  try {
    const submission = SubmissionService.resubmitSubmission(req.params.id, req.body, req.user);
    res.status(201).json({ success: true, submission });
  } catch (err) {
    next(err);
  }
});

// Fetch specific submission version details
router.get('/submissions/:submissionId', requireAuth, (req, res, next) => {
  try {
    const submission = SubmissionService.getSubmissionById(req.params.submissionId);
    res.json({ success: true, submission });
  } catch (err) {
    next(err);
  }
});

// Review a submission (approve, request revision, reject, under_review)
function reviewHandler(req, res, next) {
  try {
    const submission = SubmissionService.reviewSubmission(req.params.submissionId, req.body, req.user);
    res.json({ success: true, submission });
  } catch (err) {
    next(err);
  }
}

router.put('/submissions/:submissionId/review', requirePermission('TEAM_MANAGE'), validate(submissionSchemas.review), reviewHandler);
router.post('/submissions/:submissionId/review', requirePermission('TEAM_MANAGE'), validate(submissionSchemas.review), reviewHandler);

export default router;
