import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../src/server/app.js';
import { resetTestDb } from './helpers/testDb.js';
import { UserFactory, AuthFactory } from './helpers/factories.js';
import { XpService } from '../src/server/services/xp.js';
import { db } from '../src/server/db/database.js';

test('Leaderboard API & Multi-Category Integration Suite', async (t) => {
  resetTestDb();

  // Create users: Admin, Student 1, Student 2, Student 3
  const admin = UserFactory.create({ role: 'admin', username: 'lb_admin', name: 'Admin Account' });
  const student1 = UserFactory.create({ role: 'member', username: 'student_1', name: 'Alice Top' });
  const student2 = UserFactory.create({ role: 'member', username: 'student_2', name: 'Bob Mid' });
  const student3 = UserFactory.create({ role: 'member', username: 'student_3', name: 'Charlie Low' });

  // Award XP to Admin (high amount) - should be excluded from competitive student leaderboard
  XpService.awardXP({ userId: admin.id, amount: 10000, reason: 'Admin Test', sourceType: 'MANUAL' });

  // Award Recent XP (within last 2 days) to student1
  XpService.awardXP({ userId: student1.id, amount: 600, reason: 'Recent Task', sourceType: 'TASK' });

  // Award Old XP (20 days ago) to student2
  db.prepare(`
    INSERT INTO xp_history (id, user_id, amount, reason, source_type, created_at)
    VALUES ('xp_old_2', ?, 800, 'Old Task', 'TASK', datetime('now', '-20 days'))
  `).run(student2.id);
  db.prepare("UPDATE users SET xp = 800 WHERE id = ?").run(student2.id);

  // Award Very Old XP (45 days ago) to student3
  db.prepare(`
    INSERT INTO xp_history (id, user_id, amount, reason, source_type, created_at)
    VALUES ('xp_vold_3', ?, 1200, 'Very Old Task', 'TASK', datetime('now', '-45 days'))
  `).run(student3.id);
  db.prepare("UPDATE users SET xp = 1200 WHERE id = ?").run(student3.id);

  const studentToken = AuthFactory.createToken(student1);

  await t.test('1. GET /api/leaderboard filters out admin/teacher accounts from competitive rankings', async () => {
    const res = await request(app)
      .get('/api/leaderboard?category=xp&period=all_time')
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);

    const rankings = res.body.data.rankings;
    assert.ok(Array.isArray(rankings));
    
    // Ensure admin is NOT present in student leaderboard rankings
    const hasAdmin = rankings.some(u => u.id === admin.id);
    assert.equal(hasAdmin, false);
  });

  await t.test('2. GET /api/leaderboard?category=xp&period=weekly only calculates XP in last 7 days', async () => {
    const res = await request(app)
      .get('/api/leaderboard?category=xp&period=weekly')
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(res.status, 200);
    const rankings = res.body.data.rankings;

    // Student 1 has 600 XP in last 7 days. Student 2 (20d ago) & Student 3 (45d ago) have 0 weekly XP.
    assert.equal(rankings[0].id, student1.id);
    assert.equal(rankings[0].score, 600);
  });

  await t.test('3. GET /api/leaderboard?category=xp&period=monthly calculates XP in last 30 days', async () => {
    const res = await request(app)
      .get('/api/leaderboard?category=xp&period=monthly')
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(res.status, 200);
    const rankings = res.body.data.rankings;

    // Student 2 (800 XP 20d ago) and Student 1 (600 XP 2d ago) are in last 30 days. Student 3 (45d ago) is not.
    assert.equal(rankings[0].id, student2.id);
    assert.equal(rankings[0].score, 800);

    assert.equal(rankings[1].id, student1.id);
    assert.equal(rankings[1].score, 600);
  });

  await t.test('4. GET /api/leaderboard supports badges, streak, and contributions categories', async () => {
    const categories = ['badges', 'streak', 'contributions'];
    for (const cat of categories) {
      const res = await request(app)
        .get(`/api/leaderboard?category=${cat}&period=all_time`)
        .set('Authorization', `Bearer ${studentToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.category, cat);
      assert.ok(Array.isArray(res.body.data.rankings));
    }
  });
});
