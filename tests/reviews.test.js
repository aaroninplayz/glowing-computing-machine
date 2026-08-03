import test from 'node:test';
import assert from 'node:assert/strict';
import supertest from 'supertest';
import { app } from '../src/server/app.js';
import { resetTestDb } from './helpers/testDb.js';
import { UserFactory, AuthFactory } from './helpers/factories.js';
import { db } from '../src/server/db/database.js';

test('Review System, Feedback, Notifications & XP Awarding Suite', async (t) => {
  resetTestDb();

  const teacherUser = UserFactory.createTeacher({ username: 'rev_teacher' });
  const teacherToken = AuthFactory.createToken(teacherUser);

  const memberUser = UserFactory.createMember({ username: 'rev_member' });
  const memberToken = AuthFactory.createToken(memberUser);

  let taskId = null;
  let submissionV1Id = null;
  let submissionV2Id = null;
  let reviewV1Id = null;

  await t.test('1. Setup parent task with 150 XP reward', async () => {
    const res = await supertest(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        title: 'Review System Integration Task',
        description: 'Testing detailed evaluation, rating rubric, suggestions, improvements, and XP rewards.',
        task_type: 'TEAM_TASK',
        total_points: 100,
        xp_reward: 150
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.task);
    taskId = res.body.task.id;
  });

  await t.test('2. Member submits initial deliverable (Version 1)', async () => {
    const res = await supertest(app)
      .post(`/api/tasks/${taskId}/submissions`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        proof_notes: 'Initial deliverable submission version 1.',
        attachments: [
          { attachment_type: 'text', content: 'Base implementation details.' }
        ]
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    submissionV1Id = res.body.submission.id;
  });

  await t.test('3. RBAC Check: Standard member cannot submit review evaluations (403 Forbidden)', async () => {
    const res = await supertest(app)
      .post(`/api/submissions/${submissionV1Id}/reviews`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        rating: 4,
        comments: 'Attempting review as member',
        status: 'approved'
      });

    assert.equal(res.status, 403);
  });

  await t.test('4. Teacher reviews Version 1 and requests revision with detailed rubric rating & feedback', async () => {
    const res = await supertest(app)
      .post(`/api/submissions/${submissionV1Id}/reviews`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        rating: 3,
        comments: 'Good foundation, but needs error handling and inline documentation.',
        suggestions: 'Use try/catch blocks in async functions and sanitize user input.',
        improvements: 'Add unit tests for boundary conditions.',
        status: 'revision_requested'
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.review);
    assert.equal(res.body.review.rating, 3);
    assert.equal(res.body.review.status, 'revision_requested');
    assert.equal(res.body.review.comments, 'Good foundation, but needs error handling and inline documentation.');
    assert.equal(res.body.review.suggestions, 'Use try/catch blocks in async functions and sanitize user input.');
    assert.equal(res.body.review.improvements, 'Add unit tests for boundary conditions.');

    reviewV1Id = res.body.review.id;

    // Verify submission status updated to revision_requested
    assert.equal(res.body.submission.status, 'revision_requested');
  });

  await t.test('5. Verify member receives review notification & can read detailed review feedback', async () => {
    // Check member notifications
    const notifRes = await supertest(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${memberToken}`);

    assert.equal(notifRes.status, 200);
    const notifications = Array.isArray(notifRes.body) ? notifRes.body : (notifRes.body.notifications || []);
    assert.ok(notifications.length > 0);
    const notif = notifications[0];
    assert.ok(notif.title.includes('REVISION REQUESTED'));
    assert.ok(notif.message.includes('Rating: 3/5'));

    // Check submission reviews API
    const revListRes = await supertest(app)
      .get(`/api/submissions/${submissionV1Id}/reviews`)
      .set('Authorization', `Bearer ${memberToken}`);

    assert.equal(revListRes.status, 200);
    assert.equal(revListRes.body.success, true);
    assert.equal(revListRes.body.reviews.length, 1);
    assert.equal(revListRes.body.reviews[0].rating, 3);
    assert.equal(revListRes.body.reviews[0].suggestions, 'Use try/catch blocks in async functions and sanitize user input.');
  });

  await t.test('6. Member resubmits deliverable (Version 2) incorporating feedback', async () => {
    const res = await supertest(app)
      .post(`/api/tasks/${taskId}/submissions/resubmit`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        proof_notes: 'Version 2 deliverable with full error handling and unit tests added.',
        attachments: [
          { attachment_type: 'text', content: 'Added try/catch blocks and input sanitization.' },
          { attachment_type: 'link', content: 'https://github.com/myorg/forge/pull/105', file_name: 'Updated PR' }
        ]
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    submissionV2Id = res.body.submission.id;
    assert.equal(res.body.submission.version, 2);
  });

  await t.test('7. Teacher approves Version 2 submission, awarding 150 XP to submitter and updating task to completed', async () => {
    const initialUserRow = db.prepare('SELECT xp FROM users WHERE id = ?').get(memberUser.id);
    const initialXp = initialUserRow ? (initialUserRow.xp || 0) : 0;

    const res = await supertest(app)
      .post(`/api/submissions/${submissionV2Id}/reviews`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        rating: 5,
        comments: 'Outstanding work! All recommendations addressed perfectly.',
        suggestions: 'Keep up the high quality standard.',
        improvements: 'None, ready for production merge.',
        status: 'approved'
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.review.rating, 5);
    assert.equal(res.body.review.status, 'approved');
    assert.equal(res.body.xp_awarded, 150);

    // Verify member's XP balance increased by 150 XP
    const updatedUserRow = db.prepare('SELECT xp FROM users WHERE id = ?').get(memberUser.id);
    const updatedXp = updatedUserRow ? (updatedUserRow.xp || 0) : 0;
    assert.equal(updatedXp, initialXp + 150);

    // Verify xp_history record created
    const xpHistoryRow = db.prepare("SELECT * FROM xp_history WHERE user_id = ? AND source_type = 'TASK_APPROVAL'").get(memberUser.id);
    assert.ok(xpHistoryRow);
    assert.equal(xpHistoryRow.amount, 150);

    // Verify parent task status updated to completed
    const taskRes = await supertest(app)
      .get(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${memberToken}`);

    assert.equal(taskRes.status, 200);
    assert.equal(taskRes.body.task.status, 'completed');
  });

  await t.test('8. Verify Review CRUD (GET, PUT, DELETE)', async () => {
    // Get single review by ID
    const getRes = await supertest(app)
      .get(`/api/reviews/${reviewV1Id}`)
      .set('Authorization', `Bearer ${teacherToken}`);

    assert.equal(getRes.status, 200);
    assert.equal(getRes.body.review.id, reviewV1Id);

    // Update review
    const updateRes = await supertest(app)
      .put(`/api/reviews/${reviewV1Id}`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        comments: 'Updated comments for review version 1'
      });

    assert.equal(updateRes.status, 200);
    assert.equal(updateRes.body.review.comments, 'Updated comments for review version 1');

    // Delete review
    const delRes = await supertest(app)
      .delete(`/api/reviews/${reviewV1Id}`)
      .set('Authorization', `Bearer ${teacherToken}`);

    assert.equal(delRes.status, 200);
    assert.equal(delRes.body.success, true);
  });
});
