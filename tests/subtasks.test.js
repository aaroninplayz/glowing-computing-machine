import test from 'node:test';
import assert from 'node:assert/strict';
import supertest from 'supertest';
import { app } from '../src/server/app.js';
import { resetTestDb } from './helpers/testDb.js';
import { UserFactory, TaskFactory, AuthFactory } from './helpers/factories.js';

test('Subtask Management System & Progress Calculation Suite', async (t) => {
  resetTestDb();

  const leaderUser = UserFactory.createLeader({ username: 'subtask_leader' });
  const leaderToken = AuthFactory.createToken(leaderUser);

  const teamMemberUser = UserFactory.createMember({ username: 'subtask_assignee' });

  let parentTaskId = null;
  const subtaskIds = [];

  await t.test('1. Setup parent task for subtask operations', async () => {
    const res = await supertest(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({
        title: 'Parent Task with Subtasks',
        description: 'Parent task to test subtask breakdown and progress metrics',
        task_type: 'TEAM_TASK',
        difficulty: 'MEDIUM',
        total_points: 100
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.task);
    parentTaskId = res.body.task.id;
  });

  await t.test('2. Attempt to create subtask with invalid priority (should return 400 Bad Request)', async () => {
    const res = await supertest(app)
      .post(`/api/tasks/${parentTaskId}/subtasks`)
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({
        title: 'Subtask with Invalid Priority',
        priority: 'super_critical'
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.ok(res.body.error.includes('Invalid priority level'));
  });

  await t.test('3. Create 4 subtasks under the parent task', async () => {
    const subtaskTitles = [
      { title: 'Subtask 1: Database Setup', priority: 'high' },
      { title: 'Subtask 2: API Endpoints', priority: 'critical' },
      { title: 'Subtask 3: Progress Calculation', priority: 'medium' },
      { title: 'Subtask 4: Frontend UI Components', priority: 'low' }
    ];

    for (const item of subtaskTitles) {
      const res = await supertest(app)
        .post(`/api/tasks/${parentTaskId}/subtasks`)
        .set('Authorization', `Bearer ${leaderToken}`)
        .send({
          title: item.title,
          description: `Description for ${item.title}`,
          priority: item.priority,
          status: 'todo'
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.ok(res.body.subtask);
      assert.equal(res.body.subtask.task_id, parentTaskId);
      assert.equal(res.body.subtask.status, 'todo');

      subtaskIds.push(res.body.subtask.id);
    }

    assert.equal(subtaskIds.length, 4);
  });

  await t.test('4. Verify initial progress is 0% (0 out of 4 completed)', async () => {
    const res = await supertest(app)
      .get(`/api/tasks/${parentTaskId}/subtasks`)
      .set('Authorization', `Bearer ${leaderToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.subtasks.length, 4);
    assert.equal(res.body.progress.total, 4);
    assert.equal(res.body.progress.completed, 0);
    assert.equal(res.body.progress.percentage, 0);
  });

  await t.test('5. Mark 2 subtasks as done and verify progress updates to 50%', async () => {
    // Update Subtask 1 to done
    let updateRes1 = await supertest(app)
      .put(`/api/tasks/${parentTaskId}/subtasks/${subtaskIds[0]}`)
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({ status: 'done' });

    assert.equal(updateRes1.status, 200);
    assert.equal(updateRes1.body.subtask.status, 'done');
    assert.equal(updateRes1.body.progress.completed, 1);
    assert.equal(updateRes1.body.progress.percentage, 25);

    // Update Subtask 2 to done
    let updateRes2 = await supertest(app)
      .put(`/api/tasks/${parentTaskId}/subtasks/${subtaskIds[1]}`)
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({ status: 'done' });

    assert.equal(updateRes2.status, 200);
    assert.equal(updateRes2.body.subtask.status, 'done');
    assert.equal(updateRes2.body.progress.completed, 2);
    assert.equal(updateRes2.body.progress.percentage, 50);

    // Also verify via parent task details GET /api/tasks/:id
    const taskDetails = await supertest(app)
      .get(`/api/tasks/${parentTaskId}`)
      .set('Authorization', `Bearer ${leaderToken}`);

    assert.equal(taskDetails.status, 200);
    assert.equal(taskDetails.body.task.progress_percentage, 50);
    assert.equal(taskDetails.body.task.subtask_summary.completed, 2);
    assert.equal(taskDetails.body.task.subtask_summary.total, 4);
  });

  await t.test('6. Assign subtask to team member and verify DB & response update', async () => {
    const res = await supertest(app)
      .put(`/api/tasks/${parentTaskId}/subtasks/${subtaskIds[2]}`)
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({ assigned_to: teamMemberUser.id });

    assert.equal(res.status, 200);
    assert.equal(res.body.subtask.assigned_to, teamMemberUser.id);
    assert.equal(res.body.subtask.assigned_to_name, teamMemberUser.name);

    // Fetch single subtask detail
    const getSub = await supertest(app)
      .get(`/api/tasks/${parentTaskId}/subtasks/${subtaskIds[2]}`)
      .set('Authorization', `Bearer ${leaderToken}`);

    assert.equal(getSub.status, 200);
    assert.equal(getSub.body.subtask.assigned_to_name, teamMemberUser.name);
  });

  await t.test('7. Add comment to subtask', async () => {
    const res = await supertest(app)
      .post(`/api/tasks/${parentTaskId}/subtasks/${subtaskIds[0]}/comments`)
      .set('Authorization', `Bearer ${leaderToken}`)
      .send({ text: 'Database setup completed successfully and verified with PR #42.' });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.subtask.comments));
    assert.equal(res.body.subtask.comments.length, 1);
    assert.equal(res.body.subtask.comments[0].text, 'Database setup completed successfully and verified with PR #42.');
  });

  await t.test('8. Delete a subtask and verify updated progress calculation', async () => {
    const res = await supertest(app)
      .delete(`/api/tasks/${parentTaskId}/subtasks/${subtaskIds[3]}`)
      .set('Authorization', `Bearer ${leaderToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    // 2 done out of 3 remaining subtasks = 67%
    assert.equal(res.body.progress.total, 3);
    assert.equal(res.body.progress.completed, 2);
    assert.equal(res.body.progress.percentage, 67);
  });
});
