import { Router } from 'express';
import { LeaderboardService } from '../services/leaderboard.js';
import { AdminService } from '../services/admin.js';

const router = Router();

// GET /api/leaderboard - Dynamic multi-category leaderboard endpoint
router.get('/leaderboard', (req, res, next) => {
  try {
    if (!AdminService.isFeatureEnabled('leaderboard')) {
      return res.status(403).json({
        success: false,
        disabled: true,
        message: 'Community Leaderboard feature is currently disabled by administrator.'
      });
    }

    const { category, period, limit, page } = req.query;
    const result = LeaderboardService.getLeaderboard({
      category: category ? String(category).toLowerCase() : 'xp',
      period: period ? String(period).toLowerCase() : 'all_time',
      limit: limit ? parseInt(limit, 10) : 50,
      page: page ? parseInt(page, 10) : 1
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
