import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../src/server/app.js';
import { resetTestDb } from './helpers/testDb.js';
import { UserFactory, AuthFactory } from './helpers/factories.js';
import { XpService } from '../src/server/services/xp.js';

test('Dashboard Aggregation API & Integration Suite', async (t) => {
  resetTestDb();

  const adminUser = UserFactory.create({ role: 'admin', username: 'dash_admin' });
  const studentUser = UserFactory.create({ role: 'member', username: 'dash_student' });

  // Award XP to student so level and xp summary are populated
  XpService.awardXP({
    userId: studentUser.id,
    amount: 450,
    reason: 'Initial assignment award',
    sourceType: 'TASK'
  });

  const adminToken = AuthFactory.createToken(adminUser);
  const studentToken = AuthFactory.createToken(studentUser);

  await t.test('1. GET /api/dashboard returns 401 Unauthorized without token', async () => {
    const res = await request(app).get('/api/dashboard');
    assert.equal(res.status, 401);
    assert.equal(res.body.error, 'Unauthorized');
  });

  await t.test('2. GET /api/dashboard returns combined payload for authenticated student', async () => {
    const res = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);

    const data = res.body.data;
    assert.ok(data.user);
    assert.equal(data.user.id, studentUser.id);
    assert.equal(data.user.role, 'member');

    assert.ok(data.xpSummary);
    assert.equal(data.xpSummary.totalXp, 450);
    assert.equal(data.xpSummary.level, 3); // sqrt(450/100) + 1 = 3

    assert.ok(Array.isArray(data.activeTasks));
    assert.ok(Array.isArray(data.notifications));
    assert.ok(Array.isArray(data.announcements));
    assert.ok(Array.isArray(data.leaderboard));
    assert.ok(Array.isArray(data.upcomingDeadlines));

    // Check leaderboard contains up to 5 items
    assert.ok(data.leaderboard.length <= 5);
    const topUser = data.leaderboard[0];
    if (topUser) {
      assert.equal(topUser.rank, 1);
      assert.ok(topUser.name);
      assert.ok(typeof topUser.xp === 'number');
    }
  });

  await t.test('3. GET /api/dashboard returns correct role and admin privileges for admin user', async () => {
    const res = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.user.role, 'admin');
  });
});
