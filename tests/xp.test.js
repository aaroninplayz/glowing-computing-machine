import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../src/server/app.js';
import { resetTestDb } from './helpers/testDb.js';
import { UserFactory, AuthFactory } from './helpers/factories.js';
import { XpService, calculateLevel, getXpProgress, MAX_DAILY_AUTOMATED_XP } from '../src/server/services/xp.js';
import { XpModel } from '../src/server/models/Xp.js';

test('XP Economy Engine Suite', async (t) => {
  resetTestDb();

  const adminUser = UserFactory.create({ role: 'admin', username: 'xp_admin' });
  const memberUser = UserFactory.create({ role: 'member', username: 'xp_member' });
  const otherUser = UserFactory.create({ role: 'member', username: 'xp_other' });

  const adminToken = AuthFactory.createToken(adminUser);
  const memberToken = AuthFactory.createToken(memberUser);

  await t.test('1. Level calculation progression formula', () => {
    assert.equal(calculateLevel(0), 1);
    assert.equal(calculateLevel(99), 1);
    assert.equal(calculateLevel(100), 2);
    assert.equal(calculateLevel(399), 2);
    assert.equal(calculateLevel(400), 3);
    assert.equal(calculateLevel(500), 3);
    assert.equal(calculateLevel(900), 4);
    assert.equal(calculateLevel(1600), 5);

    const progress = getXpProgress(500);
    assert.equal(progress.level, 3);
    assert.equal(progress.currentLevelXp, 400);
    assert.equal(progress.nextLevelXp, 900);
    assert.equal(progress.xpInCurrentLevel, 100);
    assert.equal(progress.xpNeededForNextLevel, 500);
    assert.equal(progress.progressPercent, 20);
  });

  await t.test('2. Award 500 XP to user: total XP becomes 500, level updates to 3, ledger entry created', () => {
    const result = XpService.awardXP({
      userId: memberUser.id,
      amount: 500,
      reason: 'Completed Task Review',
      sourceType: 'TASK_REVIEW',
      sourceId: 'task_001',
      awardedBy: adminUser.id
    });

    assert.equal(result.userId, memberUser.id);
    assert.equal(result.amount, 500);
    assert.equal(result.xp, 500);
    assert.equal(result.level, 3);
    assert.equal(result.levelUp, true);

    const dbUser = XpModel.getUserXp(memberUser.id);
    assert.equal(dbUser.xp, 500);
    assert.equal(dbUser.level, 3);

    const { history, total } = XpModel.getUserXpHistory(memberUser.id);
    assert.equal(total, 1);
    assert.equal(history[0].amount, 500);
    assert.equal(history[0].reason, 'Completed Task Review');
    assert.equal(history[0].source_type, 'TASK_REVIEW');
  });

  await t.test('3. Attempt to deduct 600 XP (more than balance of 500 XP): fails and throws error', () => {
    assert.throws(
      () => {
        XpService.deductXP({
          userId: memberUser.id,
          amount: 600,
          reason: 'Marketplace purchase',
          sourceType: 'MARKETPLACE'
        });
      },
      (err) => {
        return err.status === 400 && err.message.includes('Insufficient XP balance');
      }
    );

    // Verify balance unchanged
    const dbUser = XpModel.getUserXp(memberUser.id);
    assert.equal(dbUser.xp, 500);
    assert.equal(dbUser.level, 3);
  });

  await t.test('4. Valid XP deduction of 200 XP: credits negative entry and updates level', () => {
    const result = XpService.deductXP({
      userId: memberUser.id,
      amount: 200,
      reason: 'Marketplace fee',
      sourceType: 'MARKETPLACE',
      deductedBy: memberUser.id
    });

    assert.equal(result.amount, -200);
    assert.equal(result.xp, 300);
    assert.equal(result.level, 2);

    const dbUser = XpModel.getUserXp(memberUser.id);
    assert.equal(dbUser.xp, 300);
    assert.equal(dbUser.level, 2);

    const { history, total } = XpModel.getUserXpHistory(memberUser.id);
    assert.equal(total, 2);
    assert.equal(history[0].amount, -200);
  });

  await t.test('5. Enforce anti-abuse limit (max 5000 XP/day from automated sources)', () => {
    const autoUser = UserFactory.create({ role: 'member', username: 'xp_auto_user' });

    // Award 3000 XP automated
    XpService.awardXP({
      userId: autoUser.id,
      amount: 3000,
      reason: 'Automated daily mission',
      sourceType: 'AUTOMATED',
      isAutomated: true
    });

    // Attempt another 3000 XP automated (total 6000 > 5000 limit)
    assert.throws(
      () => {
        XpService.awardXP({
          userId: autoUser.id,
          amount: 3000,
          reason: 'Automated exploit attempt',
          sourceType: 'AUTOMATED',
          isAutomated: true
        });
      },
      (err) => {
        return err.status === 400 && err.message.includes('Daily automated XP limit');
      }
    );

    // Manual admin award can bypass automated cap
    const adminAward = XpService.awardXP({
      userId: autoUser.id,
      amount: 3000,
      reason: 'Manual Admin Bonus',
      sourceType: 'MANUAL',
      awardedBy: adminUser.id,
      isAutomated: false
    });
    assert.equal(adminAward.xp, 6000);
  });

  await t.test('6. GET /api/users/:id/xp-history returns paginated ledger and progress summary', async () => {
    const res = await request(app)
      .get(`/api/users/${memberUser.id}/xp-history?page=1&limit=10`)
      .set('Authorization', `Bearer ${memberToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.history);
    assert.ok(Array.isArray(res.body.data.history));
    assert.equal(res.body.data.pagination.page, 1);
    assert.equal(res.body.data.pagination.total, 2);
    assert.equal(res.body.data.summary.totalXp, 300);
    assert.equal(res.body.data.summary.level, 2);
  });

  await t.test('7. GET /api/users/:id/xp-history returns 403 Forbidden for non-owner non-admin', async () => {
    const res = await request(app)
      .get(`/api/users/${otherUser.id}/xp-history`)
      .set('Authorization', `Bearer ${memberToken}`);

    assert.equal(res.status, 403);
    assert.ok(res.body.error.includes('Forbidden'));
  });

  await t.test('8. POST /api/xp/award and POST /api/xp/deduct API endpoints', async () => {
    // Admin awards XP via API
    const awardRes = await request(app)
      .post('/api/xp/award')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        userId: otherUser.id,
        amount: 200,
        reason: 'API Award Test',
        sourceType: 'BONUS'
      });

    assert.equal(awardRes.status, 200);
    assert.equal(awardRes.body.success, true);
    assert.equal(awardRes.body.data.xp, 200);

    // Deduct XP via API
    const deductRes = await request(app)
      .post('/api/xp/deduct')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        userId: otherUser.id,
        amount: 50,
        reason: 'API Stake Fee',
        sourceType: 'STAKE'
      });

    assert.equal(deductRes.status, 200);
    assert.equal(deductRes.body.success, true);
    assert.equal(deductRes.body.data.xp, 150);
  });
});
