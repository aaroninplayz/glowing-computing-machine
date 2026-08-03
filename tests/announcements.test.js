import test from 'node:test';
import assert from 'node:assert/strict';
import supertest from 'supertest';
import { app } from '../src/server/app.js';
import { resetTestDb } from './helpers/testDb.js';
import { UserFactory, AuthFactory } from './helpers/factories.js';
import { db } from '../src/server/db/database.js';

test('Announcement System, Categories, Priorities, Read-Tracking & Notifications Suite', async (t) => {
  resetTestDb();

  const adminUser = UserFactory.createTeacher({ username: 'ann_admin', role: 'admin' });
  const adminToken = AuthFactory.createToken(adminUser);

  const studentUser = UserFactory.createMember({ username: 'ann_student', role: 'member' });
  const studentToken = AuthFactory.createToken(studentUser);

  let urgentAnnId = null;
  let academicAnnId = null;

  await t.test('1. Admin creates an Urgent Pinned Announcement', async () => {
    const res = await supertest(app)
      .post('/api/announcements')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'EMERGENCY MAINTENANCE BROADCAST',
        content: 'Forge core microservices will undergo mandatory security patches.',
        category: 'Emergency',
        priority: 'urgent',
        pinned: true
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.announcement);
    assert.equal(res.body.announcement.title, 'EMERGENCY MAINTENANCE BROADCAST');
    assert.equal(res.body.announcement.category, 'Emergency');
    assert.equal(res.body.announcement.priority, 'urgent');
    assert.equal(res.body.announcement.pinned, 1);

    urgentAnnId = res.body.announcement.id;
  });

  await t.test('2. Verify urgent announcement triggered broadcast notification for student', async () => {
    const res = await supertest(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(res.status, 200);
    const notifications = Array.isArray(res.body) ? res.body : (res.body.notifications || []);
    assert.ok(notifications.length > 0);
    
    const notif = notifications.find(n => n.title.includes('EMERGENCY MAINTENANCE BROADCAST'));
    assert.ok(notif);
    assert.equal(notif.type, 'ALERT');
  });

  await t.test('3. Student lists announcements: verify unread state (is_read = 0) and pinned sorting', async () => {
    const res = await supertest(app)
      .get('/api/announcements')
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.announcements.length > 0);

    const urgentItem = res.body.announcements.find(a => a.id === urgentAnnId);
    assert.ok(urgentItem);
    assert.equal(urgentItem.is_read, 0); // Unread for student
    assert.equal(urgentItem.pinned, 1);
  });

  await t.test('4. Student views announcement detail: backend marks it as read and clears unread highlight', async () => {
    // View detail endpoint
    const detailRes = await supertest(app)
      .get(`/api/announcements/${urgentAnnId}`)
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(detailRes.status, 200);
    assert.equal(detailRes.body.success, true);
    assert.equal(detailRes.body.announcement.is_read, 1);

    // Verify persisted in announcement_reads table
    const readRow = db.prepare('SELECT * FROM announcement_reads WHERE announcement_id = ? AND user_id = ?').get(urgentAnnId, studentUser.id);
    assert.ok(readRow);

    // Verify subsequent GET list returns is_read = 1 for student
    const listRes = await supertest(app)
      .get('/api/announcements')
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(listRes.status, 200);
    const updatedUrgentItem = listRes.body.announcements.find(a => a.id === urgentAnnId);
    assert.equal(updatedUrgentItem.is_read, 1);
  });

  await t.test('5. Verify category and priority filtering', async () => {
    // Create academic announcement
    const acadRes = await supertest(app)
      .post('/api/announcements')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Spring Sprint Exam Schedule',
        content: 'Final evaluations will begin next Monday at 09:00 AM.',
        category: 'Academic',
        priority: 'high',
        pinned: false
      });

    assert.equal(acadRes.status, 201);
    academicAnnId = acadRes.body.announcement.id;

    // Filter by category=Academic
    const filterCatRes = await supertest(app)
      .get('/api/announcements?category=Academic')
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(filterCatRes.status, 200);
    assert.equal(filterCatRes.body.announcements.length, 1);
    assert.equal(filterCatRes.body.announcements[0].id, academicAnnId);

    // Filter by priority=urgent
    const filterPrioRes = await supertest(app)
      .get('/api/announcements?priority=urgent')
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(filterPrioRes.status, 200);
    assert.equal(filterPrioRes.body.announcements.length, 1);
    assert.equal(filterPrioRes.body.announcements[0].id, urgentAnnId);
  });

  await t.test('6. Mark All as Read endpoint', async () => {
    // Check initial unread count for student
    const unreadCountBefore = await supertest(app)
      .get('/api/announcements/unread-count')
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(unreadCountBefore.status, 200);
    assert.ok(unreadCountBefore.body.count >= 1); // academic announcement is unread

    // Execute mark all as read
    const markAllRes = await supertest(app)
      .post('/api/announcements/read-all')
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(markAllRes.status, 200);
    assert.equal(markAllRes.body.success, true);

    // Check unread count after mark all
    const unreadCountAfter = await supertest(app)
      .get('/api/announcements/unread-count')
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(unreadCountAfter.status, 200);
    assert.equal(unreadCountAfter.body.count, 0);
  });

  await t.test('7. RBAC & CRUD Permissions', async () => {
    // Student cannot create announcement (403 Forbidden)
    const forbiddenRes = await supertest(app)
      .post('/api/announcements')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        title: 'Unauthorized Announcement',
        content: 'Test content'
      });

    assert.equal(forbiddenRes.status, 403);

    // Admin updates announcement
    const updateRes = await supertest(app)
      .put(`/api/announcements/${academicAnnId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Spring Exam Schedule (UPDATED)'
      });

    assert.equal(updateRes.status, 200);
    assert.equal(updateRes.body.announcement.title, 'Spring Exam Schedule (UPDATED)');

    // Admin deletes announcement
    const deleteRes = await supertest(app)
      .delete(`/api/announcements/${academicAnnId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(deleteRes.status, 200);
    assert.equal(deleteRes.body.success, true);
  });
});
