import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../src/server/app.js';
import { resetTestDb } from './helpers/testDb.js';
import { UserFactory, AuthFactory } from './helpers/factories.js';
import { NotificationService } from '../src/server/services/notification.js';
import { NotificationModel } from '../src/server/models/Notification.js';

test('Notification Center UI & Preference Engine Suite', async (t) => {
  resetTestDb();

  const user = UserFactory.create({ role: 'member', username: 'notif_user_1' });
  const token = AuthFactory.createToken(user);

  await t.test('1. GET & PUT /api/notifications/preferences endpoints update settings', async () => {
    // Fetch default preferences
    const resGet = await request(app)
      .get('/api/notifications/preferences')
      .set('Authorization', `Bearer ${token}`);

    assert.equal(resGet.status, 200);
    assert.equal(resGet.body.success, true);
    assert.equal(resGet.body.preferences.reviewAlerts, true);

    // Mute review alerts
    const resPut = await request(app)
      .put('/api/notifications/preferences')
      .set('Authorization', `Bearer ${token}`)
      .send({ reviewAlerts: false, taskAlerts: true });

    assert.equal(resPut.status, 200);
    assert.equal(resPut.body.success, true);
    assert.equal(resPut.body.preferences.reviewAlerts, false);
  });

  await t.test('2. Notification engine halts creation of muted alert categories', async () => {
    // User has muted review alerts. Attempt to create a REVIEW notification.
    const notifResult = NotificationService.notifyReview({
      userId: user.id,
      taskTitle: 'Muted Task',
      reviewerName: 'Admin'
    });

    // Should return null and not persist row
    assert.equal(notifResult, null);

    const userNotifs = NotificationModel.getByUserId(user.id, { unreadOnly: true });
    const hasReviewNotif = userNotifs.some(n => n.type === 'REVIEW');
    assert.equal(hasReviewNotif, false);

    // Unmute review alerts and verify generation works again
    NotificationService.updatePreferences(user.id, { reviewAlerts: true });

    const activeResult = NotificationService.notifyReview({
      userId: user.id,
      taskTitle: 'Active Task',
      reviewerName: 'Admin'
    });
    assert.ok(activeResult);
    assert.equal(activeResult.title, 'Task Review Submitted');
  });

  await t.test('3. GET /api/notifications?category={tasks|reviews|system|social} filters correctly', async () => {
    // Generate 1 Task Assignment notification
    NotificationService.notifyAssignment({ userId: user.id, taskTitle: 'Build UI', taskId: 't1' });
    
    // Generate 1 System Announcement
    NotificationService.notifyAnnouncement({ userIds: [user.id], title: 'Server Upgrade', message: 'Downtime tonight' });

    // Filter by category=tasks
    const resTask = await request(app)
      .get('/api/notifications?category=tasks')
      .set('Authorization', `Bearer ${token}`);

    assert.equal(resTask.status, 200);
    assert.ok(Array.isArray(resTask.body));
    const allAreTasks = resTask.body.every(n => ['ASSIGNMENT', 'TASK', 'DEADLINE'].includes(n.type));
    assert.equal(allAreTasks, true);

    // Filter by category=system
    const resSys = await request(app)
      .get('/api/notifications?category=system')
      .set('Authorization', `Bearer ${token}`);

    assert.equal(resSys.status, 200);
    assert.ok(Array.isArray(resSys.body));
    const hasAnnouncement = resSys.body.some(n => n.type === 'ANNOUNCEMENT');
    assert.equal(hasAnnouncement, true);
  });

  await t.test('4. Bulk mark all as read updates database and unread count immediately', async () => {
    // Verify unread count > 0
    const countBefore = NotificationService.getUnreadCount(user.id);
    assert.ok(countBefore.count > 0);

    // Bulk mark all as read
    const resMarkAll = await request(app)
      .put('/api/notifications/read-all')
      .set('Authorization', `Bearer ${token}`);

    assert.equal(resMarkAll.status, 200);
    assert.equal(resMarkAll.body.success, true);

    // Verify unread count is now 0
    const countAfter = NotificationService.getUnreadCount(user.id);
    assert.equal(countAfter.count, 0);
  });
});
