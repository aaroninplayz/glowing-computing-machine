import { Router } from 'express';
import { XpService } from '../services/xp.js';
import { requireAuth, hasRole } from '../middleware/auth.js';

const router = Router();

// GET /api/users/:id/xp-history
router.get('/users/:id/xp-history', requireAuth, (req, res, next) => {
  try {
    const targetUserId = req.params.id;
    const isOwner = req.user.id === targetUserId;
    const isPrivileged = hasRole(req.user, ['admin', 'teacher', 'DEV_STEALTH', 'TEACHER']);

    if (!isOwner && !isPrivileged) {
      return res.status(403).json({ error: 'Forbidden: You cannot view another user\'s XP history' });
    }

    const { page, limit } = req.query;
    const result = XpService.getUserXpHistory(targetUserId, { page, limit });

    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/xp/award (Admin / System endpoint for manual awards)
router.post('/xp/award', requireAuth, (req, res, next) => {
  try {
    const isPrivileged = hasRole(req.user, ['admin', 'teacher', 'DEV_STEALTH', 'TEACHER']);
    if (!isPrivileged) {
      return res.status(403).json({ error: 'Forbidden: Only admins and teachers can award XP' });
    }

    const { userId, amount, reason, sourceType, sourceId } = req.body;
    const result = XpService.awardXP({
      userId,
      amount,
      reason,
      sourceType: sourceType || 'MANUAL',
      sourceId,
      awardedBy: req.user.id
    });

    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/xp/deduct (Admin / System endpoint for XP spending/fees)
router.post('/xp/deduct', requireAuth, (req, res, next) => {
  try {
    const { userId, amount, reason, sourceType, sourceId } = req.body;
    const targetUserId = userId || req.user.id;
    const isOwner = req.user.id === targetUserId;
    const isPrivileged = hasRole(req.user, ['admin', 'teacher', 'DEV_STEALTH', 'TEACHER']);

    if (!isOwner && !isPrivileged) {
      return res.status(403).json({ error: 'Forbidden: You cannot deduct XP from another user' });
    }

    const result = XpService.deductXP({
      userId: targetUserId,
      amount,
      reason,
      sourceType: sourceType || 'SPEND',
      sourceId,
      deductedBy: req.user.id
    });

    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
});

export default router;
