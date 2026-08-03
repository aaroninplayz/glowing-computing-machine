import test from 'node:test';
import assert from 'node:assert/strict';
import supertest from 'supertest';
import { app } from '../src/server/app.js';
import { resetTestDb } from './helpers/testDb.js';
import { UserFactory, AuthFactory } from './helpers/factories.js';
import { db } from '../src/server/db/database.js';

test('Task Submission & Review Workflow Suite', async (t) => {
  resetTestDb();

  const leaderUser = UserFactory.createLeader({ username: 'sub_leader' });
  const leaderToken = AuthFactory.createToken(leaderUser);

  const memberUser = UserFactory.createMember({ username: 'sub_member' });
  const memberToken = AuthFactory.createToken(memberUser);

  let taskId = null;
  let submissionV1Id = null;
  let submissionV2Id = null;

  await t.test('1. Create parent task for submission workflow', async () => {
    const res = await supertest(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({
        title: 'Task for Submission & Multi-Proof Verification',
        description: 'Testing multi-proof submissions, review workflow, and version history tracking',
        task_type: 'TEAM_TASK',
        total_points: 150
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.task);
    taskId = res.body.task.id;
  });

  await t.test('2. Submit task deliverable with one text proof and one link proof (Version 1)', async () => {
    const res = await supertest(app)
      .post(`/api/tasks/${taskId}/submissions`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        proof_notes: 'Initial deliverable submission containing implementation notes and PR link.',
        attachments: [
          { attachment_type: 'text', content: 'Completed JWT auth middleware and unit tests.', file_name: 'Implementation Notes' },
          { attachment_type: 'link', content: 'https://github.com/myorg/forge/pull/101', file_name: 'GitHub Pull Request #101' }
        ]
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.submission);
    assert.equal(res.body.submission.version, 1);
    assert.equal(res.body.submission.status, 'submitted');
    assert.equal(res.body.submission.attachments.length, 2);

    submissionV1Id = res.body.submission.id;

    // Verify attachments in database
    const dbAttach = db.prepare('SELECT * FROM submission_attachments WHERE submission_id = ? ORDER BY created_at ASC').all(submissionV1Id);
    assert.equal(dbAttach.length, 2);
    assert.equal(dbAttach[0].attachment_type, 'text');
    assert.equal(dbAttach[0].content, 'Completed JWT auth middleware and unit tests.');
    assert.equal(dbAttach[1].attachment_type, 'link');
    assert.equal(dbAttach[1].content, 'https://github.com/myorg/forge/pull/101');
  });

  await t.test('3. Enforce status transition constraints (e.g., invalid status returns 400)', async () => {
    const res = await supertest(app)
      .put(`/api/submissions/${submissionV1Id}/review`)
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({
        status: 'invalid_status_xyz',
        review_notes: 'Testing invalid status string'
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.ok(res.body.error.includes('Invalid submission status'));
  });

  await t.test('4. Update submission status to revision_requested via Review API', async () => {
    const res = await supertest(app)
      .put(`/api/submissions/${submissionV1Id}/review`)
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({
        status: 'revision_requested',
        review_notes: 'Please add test coverage report link and fix lint warnings.'
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.submission.status, 'revision_requested');
    assert.equal(res.body.submission.review_notes, 'Please add test coverage report link and fix lint warnings.');

    // Verify parent task status was updated to in_progress
    const taskRes = await supertest(app)
      .get(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${memberToken}`);

    assert.equal(taskRes.status, 200);
    assert.equal(taskRes.body.task.status, 'in_progress');
  });

  await t.test('5. Resubmit task to create Version 2 and preserve Version 1 in history', async () => {
    const res = await supertest(app)
      .post(`/api/tasks/${taskId}/submissions/resubmit`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        proof_notes: 'Resubmitting version 2 with updated test coverage report and lint fixes.',
        attachments: [
          { attachment_type: 'text', content: 'Added 100% test coverage for subtask and submission endpoints.', file_name: 'Test Coverage Summary' },
          { attachment_type: 'link', content: 'https://github.com/myorg/forge/pull/101/commits/ab12cd34', file_name: 'Revision Commit' },
          { attachment_type: 'file', content: '/uploads/coverage_report.pdf', file_name: 'coverage_report.pdf', file_size: 1048576 }
        ]
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.submission);
    assert.equal(res.body.submission.version, 2);
    assert.equal(res.body.submission.status, 'submitted');
    assert.equal(res.body.submission.attachments.length, 3);

    submissionV2Id = res.body.submission.id;

    // Verify submission history via GET /api/tasks/:id/submissions
    const historyRes = await supertest(app)
      .get(`/api/tasks/${taskId}/submissions`)
      .set('Authorization', `Bearer ${memberToken}`);

    assert.equal(historyRes.status, 200);
    assert.equal(historyRes.body.success, true);
    assert.equal(historyRes.body.latest_version, 2);
    assert.equal(historyRes.body.submissions.length, 2);

    // Version 2 is latest
    assert.equal(historyRes.body.submissions[0].version, 2);
    assert.equal(historyRes.body.submissions[0].status, 'submitted');

    // Version 1 is preserved
    assert.equal(historyRes.body.submissions[1].version, 1);
    assert.equal(historyRes.body.submissions[1].status, 'revision_requested');
  });

  await t.test('6. Reviewer approves Version 2 submission and parent task updates to completed', async () => {
    const res = await supertest(app)
      .put(`/api/submissions/${submissionV2Id}/review`)
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({
        status: 'approved',
        review_notes: 'Excellent work! Test coverage and PR approved.'
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.submission.status, 'approved');

    // Verify parent task status was updated to completed
    const taskRes = await supertest(app)
      .get(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${memberToken}`);

    assert.equal(taskRes.status, 200);
    assert.equal(taskRes.body.task.status, 'completed');
  });
});
