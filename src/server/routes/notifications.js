import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import { NotificationService } from '../services/notification.js';

const router = express.Router();

// GET /api/notifications - List user notifications (supports category, unreadOnly, limit, offset)
router.get('/notifications', requireAuth, validate({}), (req, res, next) => {
  try {
    const { limit, offset, unreadOnly, category } = req.query;
    const notifications = NotificationService.getUserNotifications(req.user.id, {
      limit,
      offset,
      unreadOnly,
      category
    });
    res.json(notifications);
  } catch (err) {
    next(err);
  }
});

// GET /api/notifications/count - Unread count
router.get('/notifications/count', requireAuth, validate({}), (req, res, next) => {
  try {
    const result = NotificationService.getUnreadCount(req.user.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/notifications/preferences - Retrieve user preferences
router.get('/notifications/preferences', requireAuth, validate({}), (req, res, next) => {
  try {
    const preferences = NotificationService.getPreferences(req.user.id);
    res.json({ success: true, preferences });
  } catch (err) {
    next(err);
  }
});

// PUT /api/notifications/preferences - Update user preferences
router.put('/notifications/preferences', requireAuth, validate({}), (req, res, next) => {
  try {
    const preferences = NotificationService.updatePreferences(req.user.id, req.body);
    res.json({ success: true, preferences });
  } catch (err) {
    next(err);
  }
});

// PUT /api/notifications/read-all - Bulk mark all as read
router.put('/notifications/read-all', requireAuth, validate({}), (req, res, next) => {
  try {
    const result = NotificationService.markAllAsRead(req.user.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// PUT /api/notifications/:id/read - Mark individual notification as read
router.put('/notifications/:id/read', requireAuth, validate({}), (req, res, next) => {
  try {
    const result = NotificationService.markAsRead(req.params.id, req.user.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/notifications/test - Dev test generator
router.post('/notifications/test', requireAuth, validate({}), (req, res, next) => {
  try {
    const { title, message, type, link } = req.body;
    const notif = NotificationService.createNotification({
      userId: req.user.id,
      title: title || 'Test Notification',
      message: message || 'This is a test notification generated at ' + new Date().toLocaleTimeString(),
      type: type || 'INFO',
      link: link || '#dashboard'
    });
    res.status(201).json(notif || { success: false, message: 'Notification muted by preferences' });
  } catch (err) {
    next(err);
  }
});

export default router;
