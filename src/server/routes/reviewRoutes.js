import { Router } from 'express';
import { ReviewService } from '../services/reviewService.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { validate, reviewSchemas } from '../middleware/validation.js';

const router = Router();

// Create review evaluation for a submission (approving, requesting revision, or rejecting)
router.post('/submissions/:id/reviews', requirePermission('TEAM_MANAGE'), validate(reviewSchemas.create), (req, res, next) => {
  try {
    const result = ReviewService.createReview(req.params.id, req.body, req.user);
    res.status(201).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

// Fetch all reviews for a submission
router.get('/submissions/:id/reviews', requireAuth, (req, res, next) => {
  try {
    const reviews = ReviewService.getSubmissionReviews(req.params.id);
    res.json({ success: true, reviews });
  } catch (err) {
    next(err);
  }
});

// Fetch specific review details
router.get('/reviews/:id', requireAuth, (req, res, next) => {
  try {
    const review = ReviewService.getReviewById(req.params.id);
    res.json({ success: true, review });
  } catch (err) {
    next(err);
  }
});

// Update review evaluation
router.put('/reviews/:id', requirePermission('TEAM_MANAGE'), validate(reviewSchemas.update), (req, res, next) => {
  try {
    const review = ReviewService.updateReview(req.params.id, req.body, req.user);
    res.json({ success: true, review });
  } catch (err) {
    next(err);
  }
});

// Delete review
router.delete('/reviews/:id', requirePermission('TEAM_MANAGE'), (req, res, next) => {
  try {
    ReviewService.deleteReview(req.params.id, req.user);
    res.json({ success: true, message: 'Review deleted successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;
