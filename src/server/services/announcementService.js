import { AnnouncementModel } from '../models/Announcement.js';
import { NotificationService } from './notification.js';
import { ActivityService } from './activity.js';
import { db } from '../db/database.js';

const ALLOWED_CATEGORIES = ['General', 'Academic', 'Emergency', 'Hackathons', 'Community'];
const ALLOWED_PRIORITIES = ['normal', 'high', 'urgent'];

export const AnnouncementService = {
  createAnnouncement({ title, content, category = 'General', priority = 'normal', pinned = false }, currentUser) {
    if (!title || !title.trim()) {
      throw { status: 400, message: 'Announcement title is required' };
    }
    if (!content || !content.trim()) {
      throw { status: 400, message: 'Announcement content is required' };
    }

    const normCategory = ALLOWED_CATEGORIES.find(c => c.toLowerCase() === (category || 'General').toLowerCase()) || 'General';
    const normPriority = (priority || 'normal').toLowerCase();

    if (!ALLOWED_PRIORITIES.includes(normPriority)) {
      throw { status: 400, message: `Invalid priority '${priority}'. Allowed: ${ALLOWED_PRIORITIES.join(', ')}` };
    }

    const createdBy = currentUser ? currentUser.id : null;

    const announcement = AnnouncementModel.create({
      title: title.trim(),
      content: content.trim(),
      category: normCategory,
      priority: normPriority,
      pinned: pinned ? 1 : 0,
      created_by: createdBy
    });

    // Broadcast Notifications to all users
    try {
      const activeUsers = db.prepare("SELECT id FROM users").all();
      const notifType = normPriority === 'urgent' ? 'ALERT' : normPriority === 'high' ? 'WARNING' : 'INFO';
      const notifPrefix = normPriority === 'urgent' ? '[URGENT ANNOUNCEMENT] ' : 'New Announcement: ';

      activeUsers.forEach(u => {
        // Skip notifying creator unless testing
        NotificationService.createNotification({
          userId: u.id,
          title: `${notifPrefix}${announcement.title}`,
          message: announcement.content.length > 120 ? announcement.content.slice(0, 117) + '...' : announcement.content,
          type: notifType,
          link: '/announcements'
        });
      });
    } catch (err) {
      console.error('Error broadcasting announcement notifications:', err);
    }

    // Activity Log
    try {
      ActivityService.logActivity(currentUser, 'ANNOUNCEMENT_CREATE', announcement.id, {
        title: announcement.title,
        priority: normPriority,
        category: normCategory
      });
    } catch (_) {}

    return announcement;
  },

  getAllAnnouncements({ category, priority, pinnedOnly } = {}, currentUser) {
    const userId = currentUser ? currentUser.id : null;
    return AnnouncementModel.getAll({ category, priority, pinnedOnly, userId });
  },

  getAnnouncementById(id, currentUser) {
    const userId = currentUser ? currentUser.id : null;
    const announcement = AnnouncementModel.getById(id, userId);
    if (!announcement) {
      throw { status: 404, message: 'Announcement not found' };
    }

    // Automatically mark as read when viewed
    if (userId) {
      AnnouncementModel.markAsRead(id, userId);
      announcement.is_read = 1;
    }

    return announcement;
  },

  updateAnnouncement(id, fields, currentUser) {
    const announcement = AnnouncementModel.getById(id);
    if (!announcement) {
      throw { status: 404, message: 'Announcement not found' };
    }

    return AnnouncementModel.update(id, fields);
  },

  deleteAnnouncement(id, currentUser) {
    const announcement = AnnouncementModel.getById(id);
    if (!announcement) {
      throw { status: 404, message: 'Announcement not found' };
    }

    return AnnouncementModel.delete(id);
  },

  markAsRead(announcementId, currentUser) {
    if (!currentUser) throw { status: 401, message: 'Unauthorized' };
    const announcement = AnnouncementModel.getById(announcementId);
    if (!announcement) {
      throw { status: 404, message: 'Announcement not found' };
    }
    AnnouncementModel.markAsRead(announcementId, currentUser.id);
    return { success: true, announcement_id: announcementId, user_id: currentUser.id };
  },

  markAllAsRead(currentUser) {
    if (!currentUser) throw { status: 401, message: 'Unauthorized' };
    const count = AnnouncementModel.markAllAsRead(currentUser.id);
    return { success: true, count };
  },

  getUnreadCount(currentUser) {
    if (!currentUser) return { count: 0 };
    const count = AnnouncementModel.getUnreadCount(currentUser.id);
    return { count };
  }
};
