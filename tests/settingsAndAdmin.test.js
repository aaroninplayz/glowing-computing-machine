import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../src/server/app.js';
import { resetTestDb } from './helpers/testDb.js';
import { UserFactory, AuthFactory } from './helpers/factories.js';
import { AdminService } from '../src/server/services/admin.js';

test('Settings & Admin Control Panel Integration Suite', async (t) => {
  resetTestDb();

  const admin = UserFactory.create({ role: 'admin', username: 'sys_admin' });
  const student = UserFactory.create({ role: 'member', username: 'sys_student' });

  const adminToken = AuthFactory.createToken(admin);
  const studentToken = AuthFactory.createToken(student);

  await t.test('1. RBAC Guard: Standard student cannot access /api/admin/* endpoints (403 Forbidden)', async () => {
    const resConfig = await request(app)
      .get('/api/admin/config')
      .set('Authorization', `Bearer ${studentToken}`);
    assert.equal(resConfig.status, 403);

    const resFeatures = await request(app)
      .get('/api/admin/features')
      .set('Authorization', `Bearer ${studentToken}`);
    assert.equal(resFeatures.status, 403);

    const resAudit = await request(app)
      .get('/api/admin/audit-log')
      .set('Authorization', `Bearer ${studentToken}`);
    assert.equal(resAudit.status, 403);
  });

  await t.test('2. Admin can view and update system config via /api/admin/config', async () => {
    const resGet = await request(app)
      .get('/api/admin/config')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(resGet.status, 200);
    assert.equal(resGet.body.success, true);
    assert.ok(resGet.body.config.site_title);

    const resPut = await request(app)
      .put('/api/admin/config')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ site_title: 'Forge High Rigor Platform', max_task_submissions_per_day: '15' });

    assert.equal(resPut.status, 200);
    assert.equal(resPut.body.config.site_title, 'Forge High Rigor Platform');
    assert.equal(resPut.body.config.max_task_submissions_per_day, '15');
  });

  await t.test('3. Admin can toggle features and application responds accordingly', async () => {
    // Disable Leaderboard feature
    const resToggle = await request(app)
      .put('/api/admin/features/leaderboard')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ is_enabled: false });

    assert.equal(resToggle.status, 200);
    assert.equal(resToggle.body.success, true);

    // Verify feature is disabled in DB/Service
    assert.equal(AdminService.isFeatureEnabled('leaderboard'), false);

    // Attempting to query /api/leaderboard should now return 403 Disabled
    const resLeaderboard = await request(app)
      .get('/api/leaderboard')
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(resLeaderboard.status, 403);
    assert.equal(resLeaderboard.body.disabled, true);

    // Re-enable Leaderboard feature
    await request(app)
      .put('/api/admin/features/leaderboard')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ is_enabled: true });

    assert.equal(AdminService.isFeatureEnabled('leaderboard'), true);
  });

  await t.test('4. Admin can manage user roles and suspension states', async () => {
    const resBan = await request(app)
      .patch(`/api/admin/users/${student.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ is_suspended: true, role: 'member' });

    assert.equal(resBan.status, 200);
    assert.equal(resBan.body.user.is_suspended, 1);

    const resUnban = await request(app)
      .patch(`/api/admin/users/${student.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ is_suspended: false, role: 'teacher' });

    assert.equal(resUnban.status, 200);
    assert.equal(resUnban.body.user.is_suspended, 0);
    assert.equal(resUnban.body.user.role, 'teacher');
  });

  await t.test('5. Admin Audit Log records recent administrative events', async () => {
    const resAudit = await request(app)
      .get('/api/admin/audit-log')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(resAudit.status, 200);
    assert.equal(resAudit.body.success, true);
    assert.ok(Array.isArray(resAudit.body.logs));
    assert.ok(resAudit.body.logs.length > 0);

    // Verify feature toggle change was logged
    const hasToggleLog = resAudit.body.logs.some(l => l.action_type === 'FEATURE_TOGGLE_CHANGED');
    assert.equal(hasToggleLog, true);
  });
});
