import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../src/server/app.js';
import { resetTestDb } from './helpers/testDb.js';
import { UserFactory, AuthFactory } from './helpers/factories.js';
import { HallOfFameService } from '../src/server/services/hallOfFameService.js';
import { XpService } from '../src/server/services/xp.js';

test('Hall of Fame & Competitive Seasons Integration Suite', async (t) => {
  resetTestDb();

  const admin = UserFactory.create({ role: 'admin', username: 'hof_admin' });
  const student = UserFactory.create({ role: 'member', username: 'hof_student', name: 'Champ Student' });

  const adminToken = AuthFactory.createToken(admin);
  const studentToken = AuthFactory.createToken(student);

  // Award XP to student
  XpService.awardXP({ userId: student.id, amount: 1500, reason: 'Season 1 Win', sourceType: 'TASK' });

  await t.test('1. GET /api/hall-of-fame returns 200 OK without 500 undefined errors', async () => {
    const res = await request(app).get('/api/hall-of-fame');
    assert.equal(res.status, 200);
    assert.ok(res.body.seasons);
    assert.ok(Array.isArray(res.body.leaderboard));
    assert.ok(Array.isArray(res.body.grandChampions));
    assert.ok(res.body.allTimeBests);
  });

  await t.test('2. HallOfFameService.getHallOfFameLeaderboard is defined and functions correctly', async () => {
    const leaderboard = HallOfFameService.getHallOfFameLeaderboard();
    assert.ok(Array.isArray(leaderboard));
    assert.ok(leaderboard.length > 0);
    const topUser = leaderboard[0];
    assert.equal(topUser.id, student.id);
    assert.equal(topUser.points, 1500);
  });

  await t.test('3. Admin can create new season via POST /api/hall-of-fame/seasons', async () => {
    const res = await request(app)
      .post('/api/hall-of-fame/seasons')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Season 2: Expansion',
        start_date: '2027-01-01',
        end_date: '2027-12-31',
        is_current: true
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.season.name, 'Season 2: Expansion');
    assert.equal(res.body.season.is_current, 1);
  });

  await t.test('4. GET /api/hall-of-fame/seasons lists all active and archived seasons', async () => {
    const res = await request(app).get('/api/hall-of-fame/seasons');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.seasons));
    assert.ok(res.body.seasons.length >= 2);
  });

  await t.test('5. Non-admin user cannot create season (403 Forbidden)', async () => {
    const res = await request(app)
      .post('/api/hall-of-fame/seasons')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        name: 'Unauthorized Season',
        start_date: '2028-01-01'
      });

    assert.equal(res.status, 403);
  });
});
