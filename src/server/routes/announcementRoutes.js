import { Router } from 'express';
import { AnnouncementService } from '../services/announcementService.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { validate, announcementSchemas } from '../middleware/validation.js';

const router = Router();

// Fetch all announcements (with category/priority/pinned filters & read status)
router.get('/announcements', requireAuth, (req, res, next) => {
  try {
    const announcements = AnnouncementService.getAllAnnouncements(req.query, req.user);
    res.json({ success: true, announcements });
  } catch (err) {
    next(err);
  }
});

// Fetch unread count for current user
router.get('/announcements/unread-count', requireAuth, (req, res, next) => {
  try {
    const result = AnnouncementService.getUnreadCount(req.user);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

// Mark all announcements as read
router.post('/announcements/read-all', requireAuth, (req, res, next) => {
  try {
    const result = AnnouncementService.markAllAsRead(req.user);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

// Create new announcement (restricted to authorized roles)
router.post('/announcements', requirePermission('TEAM_MANAGE'), validate(announcementSchemas.create), (req, res, next) => {
  try {
    const announcement = AnnouncementService.createAnnouncement(req.body, req.user);
    res.status(201).json({ success: true, announcement });
  } catch (err) {
    next(err);
  }
});

// Fetch single announcement detail (auto-marks read)
router.get('/announcements/:id', requireAuth, (req, res, next) => {
  try {
    const announcement = AnnouncementService.getAnnouncementById(req.params.id, req.user);
    res.json({ success: true, announcement });
  } catch (err) {
    next(err);
  }
});

// Explicitly mark announcement as read
router.post('/announcements/:id/read', requireAuth, (req, res, next) => {
  try {
    const result = AnnouncementService.markAsRead(req.params.id, req.user);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

// Update announcement
router.put('/announcements/:id', requirePermission('TEAM_MANAGE'), validate(announcementSchemas.update), (req, res, next) => {
  try {
    const announcement = AnnouncementService.updateAnnouncement(req.params.id, req.body, req.user);
    res.json({ success: true, announcement });
  } catch (err) {
    next(err);
  }
});

// Delete announcement
router.delete('/announcements/:id', requirePermission('TEAM_MANAGE'), (req, res, next) => {
  try {
    AnnouncementService.deleteAnnouncement(req.params.id, req.user);
    res.json({ success: true, message: 'Announcement deleted successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;
