import { Router } from 'express';
import { SubtaskService } from '../services/subtaskService.js';
import { requireAuth } from '../middleware/auth.js';
import { validate, subtaskSchemas } from '../middleware/validation.js';

const router = Router();

// GET /api/tasks/:id/subtasks - Retrieve all subtasks and progress for parent task
router.get('/tasks/:id/subtasks', requireAuth, validate({}), (req, res, next) => {
  try {
    const data = SubtaskService.getSubtasksForTask(req.params.id);
    res.json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
});

// POST /api/tasks/:id/subtasks - Create subtask under parent task
router.post('/tasks/:id/subtasks', requireAuth, validate(subtaskSchemas.create), (req, res, next) => {
  try {
    const result = SubtaskService.createSubtask(req.params.id, req.body, req.user);
    res.status(201).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

// GET /api/subtasks/:subtaskId or GET /api/tasks/:id/subtasks/:subtaskId
function getSubtaskHandler(req, res, next) {
  try {
    const subtaskId = req.params.subtaskId || req.params.id;
    const subtask = SubtaskService.getSubtaskDetails(subtaskId);
    res.json({ success: true, subtask });
  } catch (err) {
    next(err);
  }
}

router.get('/subtasks/:subtaskId', requireAuth, validate({}), getSubtaskHandler);
router.get('/tasks/:id/subtasks/:subtaskId', requireAuth, validate({}), getSubtaskHandler);

// PUT /api/subtasks/:subtaskId or PUT /api/tasks/:id/subtasks/:subtaskId
function updateSubtaskHandler(req, res, next) {
  try {
    const subtaskId = req.params.subtaskId || req.params.id;
    const result = SubtaskService.updateSubtask(subtaskId, req.body, req.user);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

router.put('/subtasks/:subtaskId', requireAuth, validate(subtaskSchemas.update), updateSubtaskHandler);
router.put('/tasks/:id/subtasks/:subtaskId', requireAuth, validate(subtaskSchemas.update), updateSubtaskHandler);

// DELETE /api/subtasks/:subtaskId or DELETE /api/tasks/:id/subtasks/:subtaskId
function deleteSubtaskHandler(req, res, next) {
  try {
    const subtaskId = req.params.subtaskId || req.params.id;
    const result = SubtaskService.deleteSubtask(subtaskId, req.user);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

router.delete('/subtasks/:subtaskId', requireAuth, validate({}), deleteSubtaskHandler);
router.delete('/tasks/:id/subtasks/:subtaskId', requireAuth, validate({}), deleteSubtaskHandler);

// POST /api/subtasks/:subtaskId/comments or POST /api/tasks/:id/subtasks/:subtaskId/comments
function commentSubtaskHandler(req, res, next) {
  try {
    const subtaskId = req.params.subtaskId || req.params.id;
    const updated = SubtaskService.addComment(subtaskId, req.body.text, req.user);
    res.json({ success: true, subtask: updated });
  } catch (err) {
    next(err);
  }
}

router.post('/subtasks/:subtaskId/comments', requireAuth, validate(subtaskSchemas.comment), commentSubtaskHandler);
router.post('/tasks/:id/subtasks/:subtaskId/comments', requireAuth, validate(subtaskSchemas.comment), commentSubtaskHandler);

export default router;
