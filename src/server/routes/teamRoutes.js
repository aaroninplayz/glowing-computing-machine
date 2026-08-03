import { Router } from 'express';
import { TeamService } from '../services/teamService.js';
import { requirePermission, verifyTeamAccess, requireAuth } from '../middleware/auth.js';
import { validate, teamSchemas } from '../middleware/validation.js';

const router = Router();

router.get('/teams', requireAuth, validate({}), (_req, res, next) => {
  try {
    res.json(TeamService.getTeams());
  } catch (err) {
    next(err);
  }
});

router.get('/teams/history', requireAuth, (req, res, next) => {
  try {
    res.json({ success: true, history: TeamService.getTeamHistory() });
  } catch (err) {
    next(err);
  }
});

router.get('/teams/:id/history', requireAuth, (req, res, next) => {
  try {
    res.json({ success: true, history: TeamService.getTeamHistory(req.params.id) });
  } catch (err) {
    next(err);
  }
});

function createTeamHandler(req, res, next) {
  try {
    const teamId = TeamService.createTeam(req.body, req.user);
    res.json({ success: true, teamId });
  } catch (err) {
    next(err);
  }
}

router.post('/teams', requirePermission('TEAM_MANAGE'), validate(teamSchemas.create), createTeamHandler);
router.post('/teams/create', requirePermission('TEAM_MANAGE'), validate(teamSchemas.create), createTeamHandler);

router.post('/teams/generate-random', requirePermission('TEAM_MANAGE'), validate(teamSchemas.generateRandom), (req, res, next) => {
  try {
    const result = TeamService.generateRandomTeams(req.body, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

function swapMembersHandler(req, res, next) {
  try {
    const payload = {
      ...req.body,
      team1_id: req.params.id || req.body.team1_id
    };
    const result = TeamService.swapMembers(payload, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

router.post('/teams/swap', requirePermission('TEAM_MANAGE'), validate(teamSchemas.swap), swapMembersHandler);
router.post('/teams/:id/swap', requirePermission('TEAM_MANAGE'), validate(teamSchemas.swap), swapMembersHandler);

function lockMemberHandler(req, res, next) {
  try {
    const payload = {
      ...req.body,
      team_id: req.params.id || req.body.team_id
    };
    const result = TeamService.toggleMemberLock(payload, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

router.post('/teams/members/lock', requirePermission('TEAM_MANAGE'), validate(teamSchemas.lock), lockMemberHandler);
router.post('/teams/:id/lock', requirePermission('TEAM_MANAGE'), validate(teamSchemas.lock), lockMemberHandler);

router.put('/teams/:id', requirePermission('TEAM_MANAGE'), (req, res, next) => {
  try {
    const { name, task_id } = req.body;
    let nameResult = null;
    let taskResult = null;

    if (name) {
      nameResult = TeamService.renameTeam(req.params.id, name, req.user);
    }
    if (task_id !== undefined) {
      taskResult = TeamService.reassignTask(req.params.id, task_id, req.user);
    }

    res.json({ success: true, teamId: req.params.id, nameResult, taskResult });
  } catch (err) {
    next(err);
  }
});

router.post('/teams/:id/rename', requirePermission('TEAM_MANAGE'), validate(teamSchemas.rename), (req, res, next) => {
  try {
    const result = TeamService.renameTeam(req.params.id, req.body.name, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/teams/:id/reassign-task', requirePermission('TEAM_MANAGE'), validate(teamSchemas.reassignTask), (req, res, next) => {
  try {
    const result = TeamService.reassignTask(req.params.id, req.body.task_id, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/teams/:id/points/override', validate(teamSchemas.pointOverride), verifyTeamAccess('id'), (req, res, next) => {
  try {
    const { user_id, custom_point_share } = req.body;
    TeamService.overridePoints(req.params.id, user_id, custom_point_share, req.user);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.post('/teams/redistribute-points', validate(teamSchemas.pointOverride), verifyTeamAccess('team_id'), (req, res, next) => {
  try {
    const { team_id, user_id, custom_point_share } = req.body;
    TeamService.overridePoints(team_id, user_id, custom_point_share, req.user);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.post('/teams/:id/dissolve', requirePermission('TEAM_MANAGE'), validate(teamSchemas.dissolve), (req, res, next) => {
  try {
    const teamId = TeamService.dissolveTeam(req.params.id, req.body.reason, req.user);
    res.json({ success: true, teamId, is_active: 0 });
  } catch (err) {
    next(err);
  }
});

export default router;
