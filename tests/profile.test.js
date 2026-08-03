import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../src/server/app.js';
import { resetTestDb } from './helpers/testDb.js';
import { UserFactory, AuthFactory } from './helpers/factories.js';
import { XpService } from '../src/server/services/xp.js';
import { ActivityService } from '../src/server/services/activity.js';
import { db } from '../src/server/db/database.js';

test('User Public Profile API & Integration Suite', async (t) => {
  resetTestDb();

  const veteranUser = UserFactory.create({ role: 'member', username: 'veteran_prof', name: 'Julian Sterling' });
  const brandNewUser = UserFactory.create({ role: 'member', username: 'newbie_prof', name: 'Newbie User' });

  // Award XP and log activity for veteran user
  XpService.awardXP({
    userId: veteranUser.id,
    amount: 1200,
    reason: 'Sprint 01 Task Completion',
    sourceType: 'TASK'
  });

  ActivityService.logActivity({
    userId: veteranUser.id,
    action: 'TASK_COMPLETE',
    entityType: 'task',
    entityId: 't_sprint1',
    details: { title: 'Schema Optimization' }
  });

  // Create a completed task for veteran user
  db.prepare(`
    INSERT INTO tasks (id, title, description, assigned_user_id, status, total_points, task_type, created_at)
    VALUES ('t_vet_1', 'UI Pattern Audit', 'Audit UI patterns across SPA', ?, 'COMPLETED', 300, 'TEAM_TASK', CURRENT_TIMESTAMP)
  `).run(veteranUser.id);

  const veteranToken = AuthFactory.createToken(veteranUser);

  await t.test('1. GET /api/users/:id/profile returns 404 for non-existent user', async () => {
    const res = await request(app).get('/api/users/non_existent_id/profile');
    assert.equal(res.status, 404);
    assert.equal(res.body.error, 'User not found');
  });

  await t.test('2. GET /api/users/:id/profile returns full aggregated profile for user with history', async () => {
    const res = await request(app)
      .get(`/api/users/${veteranUser.id}/profile`)
      .set('Authorization', `Bearer ${veteranToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);

    const profile = res.body.profile;
    assert.ok(profile.user);
    assert.equal(profile.user.id, veteranUser.id);
    assert.equal(profile.user.name, 'Julian Sterling');

    // Verify XP Summary
    assert.ok(profile.xpSummary);
    assert.equal(profile.xpSummary.totalXp, 1200);
    assert.equal(profile.xpSummary.level, 4); // floor(sqrt(1200/100)) + 1 = 4

    // Verify Stats
    assert.ok(profile.stats);
    assert.equal(profile.stats.completedTasksCount, 1);
    assert.ok(typeof profile.stats.communityRank === 'number');

    // Verify Badges Grid
    assert.ok(Array.isArray(profile.badges));
    assert.ok(profile.badges.length > 0);
    const welcomeBadge = profile.badges.find(b => b.id === 'b_welcome');
    assert.ok(welcomeBadge);
    assert.equal(welcomeBadge.unlocked, true);

    // Verify Activity Feed
    assert.ok(Array.isArray(profile.activityFeed));
    assert.ok(profile.activityFeed.length > 0);
  });

  await t.test('3. GET /api/users/:id/profile handles brand new user gracefully with zero stats', async () => {
    const res = await request(app)
      .get(`/api/users/${brandNewUser.id}/profile`)
      .set('Authorization', `Bearer ${veteranToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);

    const profile = res.body.profile;
    assert.equal(profile.user.id, brandNewUser.id);
    assert.equal(profile.xpSummary.totalXp, 0);
    assert.equal(profile.xpSummary.level, 1);
    assert.equal(profile.stats.completedTasksCount, 0);
    assert.equal(profile.stats.challengeWinsCount, 0);
    assert.ok(Array.isArray(profile.badges));
    assert.ok(Array.isArray(profile.activityFeed));
  });
});
