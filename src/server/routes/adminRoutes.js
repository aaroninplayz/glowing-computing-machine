import { Router } from 'express';
import { AdminService } from '../services/admin.js';
import { requireAuth, requirePermission, requireRole } from '../middleware/auth.js';

const router = Router();

// Middleware: Restrict all admin endpoints to Admin / Dev Stealth roles
router.use(requireAuth);
router.use(requirePermission('SETTINGS_MANAGE'));

// GET /api/admin/config - Get system configuration
router.get('/admin/config', (req, res, next) => {
  try {
    const config = AdminService.getConfig();
    res.json({ success: true, config });
  } catch (err) {
    next(err);
  }
});

// PUT /api/admin/config - Update system configuration
router.put('/admin/config', (req, res, next) => {
  try {
    const config = AdminService.updateConfig(req.body, req.user);
    res.json({ success: true, config });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/features - List feature toggles
router.get('/admin/features', (req, res, next) => {
  try {
    const features = AdminService.getFeatures();
    res.json({ success: true, features });
  } catch (err) {
    next(err);
  }
});

// PUT /api/admin/features/:key - Toggle feature on/off
router.put('/admin/features/:key', (req, res, next) => {
  try {
    const isEnabled = req.body.is_enabled !== undefined ? !!req.body.is_enabled : !!req.body.isEnabled;
    const features = AdminService.updateFeature(req.params.key, isEnabled, req.user);
    res.json({ success: true, features });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/users - List users for management
router.get('/admin/users', (req, res, next) => {
  try {
    const { limit, offset, role } = req.query;
    const users = AdminService.getUsers({ limit, offset, role });
    res.json({ success: true, users });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/users/:id - Update user role or suspension status
router.patch('/admin/users/:id', (req, res, next) => {
  try {
    const { role, is_suspended } = req.body;
    const updatedUser = AdminService.updateUserStatus(req.params.id, { role, is_suspended }, req.user);
    res.json({ success: true, user: updatedUser });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/audit-log - Query system audit log
router.get('/admin/audit-log', (req, res, next) => {
  try {
    const { limit, offset, actionType } = req.query;
    const logs = AdminService.getAuditLog({ limit, offset, actionType });
    res.json({ success: true, logs });
  } catch (err) {
    next(err);
  }
});

export default router;
