import { Router } from 'express';
import { HallOfFameService } from '../services/hallOfFameService.js';
import { requirePermission, requireAuth } from '../middleware/auth.js';
import { validate, hallOfFameSchemas } from '../middleware/validation.js';

const router = Router();

// GET /api/hall-of-fame - Aggregated Hall of Fame Data
router.get('/hall-of-fame', (req, res, next) => {
  try {
    const data = HallOfFameService.getHallOfFameData(req.query.seasonId);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// GET /api/hall-of-fame/leaderboard - Explicit leaderboard endpoint
router.get('/hall-of-fame/leaderboard', (req, res, next) => {
  try {
    const leaderboard = HallOfFameService.getHallOfFameLeaderboard(req.query.seasonId);
    res.json({ success: true, leaderboard });
  } catch (err) {
    next(err);
  }
});

// GET /api/hall-of-fame/seasons - List all seasons
router.get('/hall-of-fame/seasons', (_req, res, next) => {
  try {
    const seasons = HallOfFameService.getSeasons();
    res.json({ success: true, seasons });
  } catch (err) {
    next(err);
  }
});

// POST /api/hall-of-fame/seasons - Admin: Create new competitive season
router.post('/hall-of-fame/seasons', requirePermission('SETTINGS_MANAGE'), (req, res, next) => {
  try {
    const season = HallOfFameService.createSeason(req.body, req.user);
    res.json({ success: true, season });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/hall-of-fame/seasons/:id - Admin: Update/archive or switch active season
router.patch('/hall-of-fame/seasons/:id', requirePermission('SETTINGS_MANAGE'), (req, res, next) => {
  try {
    const updated = HallOfFameService.updateSeason(req.params.id, req.body, req.user);
    res.json({ success: true, season: updated });
  } catch (err) {
    next(err);
  }
});

function awardTitleHandler(req, res, next) {
  try {
    const titleId = HallOfFameService.awardTitle(req.body);
    res.json({ success: true, titleId });
  } catch (err) {
    next(err);
  }
}

router.post('/hall-of-fame/award', requirePermission('HOF_AWARD'), validate(hallOfFameSchemas.award), awardTitleHandler);
router.post('/hall-of-fame/titles', requirePermission('HOF_AWARD'), validate(hallOfFameSchemas.award), awardTitleHandler);

export default router;
