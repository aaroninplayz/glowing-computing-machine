import test from 'node:test';
import assert from 'node:assert/strict';
import supertest from 'supertest';
import { app } from '../src/server/app.js';
import { resetTestDb } from './helpers/testDb.js';
import { UserFactory, AuthFactory } from './helpers/factories.js';
import { db } from '../src/server/db/database.js';

test('Enhanced Team Management System Suite', async (t) => {
  resetTestDb();

  const adminUser = UserFactory.createAdmin({ username: 'team_admin' });
  const adminToken = AuthFactory.createToken(adminUser);

  const studentUser = UserFactory.createMember({ username: 'team_student' });
  const studentToken = AuthFactory.createToken(studentUser);

  const testUsers = [];
  for (let i = 1; i <= 10; i++) {
    const user = UserFactory.createMember({ username: `squad_user_${i}`, name: `Squad User ${i}` });
    testUsers.push(user);
  }

  let generatedTeamIds = [];

  await t.test('1. RBAC Check: Standard student cannot invoke team management endpoints (403 Forbidden)', async () => {
    const randomRes = await supertest(app)
      .post('/api/teams/generate-random')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ team_size: 3 });

    assert.equal(randomRes.status, 403);

    const swapRes = await supertest(app)
      .post('/api/teams/swap')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ user1_id: testUsers[0].id, user2_id: testUsers[1].id });

    assert.equal(swapRes.status, 403);

    const lockRes = await supertest(app)
      .post('/api/teams/members/lock')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ user_id: testUsers[0].id, is_locked: true });

    assert.equal(lockRes.status, 403);
  });

  await t.test('2. Random Team Generation: Distribute 10 members into teams of 3 (creates 3 teams of sizes 4, 3, 3)', async () => {
    const memberIds = testUsers.map(u => u.id);

    const res = await supertest(app)
      .post('/api/teams/generate-random')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        team_size: 3,
        member_ids: memberIds,
        prefix: 'Alpha Squad'
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.created_teams_count, 3);
    assert.equal(res.body.total_members_distributed, 10);
    assert.ok(Array.isArray(res.body.team_ids));
    assert.equal(res.body.team_ids.length, 3);

    generatedTeamIds = res.body.team_ids;

    // Verify database sizes for the 3 teams
    const team1Members = db.prepare('SELECT user_id FROM team_memberships WHERE team_id = ?').all(generatedTeamIds[0]);
    const team2Members = db.prepare('SELECT user_id FROM team_memberships WHERE team_id = ?').all(generatedTeamIds[1]);
    const team3Members = db.prepare('SELECT user_id FROM team_memberships WHERE team_id = ?').all(generatedTeamIds[2]);

    const sizes = [team1Members.length, team2Members.length, team3Members.length].sort((a, b) => b - a);
    assert.deepEqual(sizes, [4, 3, 3]);
  });

  await t.test('3. Lock member in Team A and attempt to swap with member in Team B (should be rejected with 400)', async () => {
    const team1Members = db.prepare('SELECT user_id FROM team_memberships WHERE team_id = ?').all(generatedTeamIds[0]);
    const team2Members = db.prepare('SELECT user_id FROM team_memberships WHERE team_id = ?').all(generatedTeamIds[1]);

    const lockedUserId = team1Members[0].user_id;
    const targetUserId = team2Members[0].user_id;

    // Lock the first user in Team A
    const lockRes = await supertest(app)
      .post('/api/teams/members/lock')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        team_id: generatedTeamIds[0],
        user_id: lockedUserId,
        is_locked: true
      });

    assert.equal(lockRes.status, 200);
    assert.equal(lockRes.body.success, true);
    assert.equal(lockRes.body.is_locked, 1);

    // Verify in DB that is_locked = 1
    const dbLockCheck = db.prepare('SELECT is_locked FROM team_memberships WHERE team_id = ? AND user_id = ?').get(generatedTeamIds[0], lockedUserId);
    assert.equal(Number(dbLockCheck.is_locked), 1);

    // Attempt to swap locked member
    const swapRes = await supertest(app)
      .post('/api/teams/swap')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        user1_id: lockedUserId,
        user2_id: targetUserId,
        team1_id: generatedTeamIds[0],
        team2_id: generatedTeamIds[1]
      });

    assert.equal(swapRes.status, 400);
    assert.equal(swapRes.body.success, false);
    assert.ok(swapRes.body.error.includes('is locked in team'));
  });

  await t.test('4. Swap two unlocked members between Team A and Team B and verify DB reflects update', async () => {
    const team1Members = db.prepare('SELECT user_id FROM team_memberships WHERE team_id = ? AND is_locked = 0').all(generatedTeamIds[0]);
    const team2Members = db.prepare('SELECT user_id FROM team_memberships WHERE team_id = ? AND is_locked = 0').all(generatedTeamIds[1]);

    const user1Id = team1Members[0].user_id;
    const user2Id = team2Members[0].user_id;

    const swapRes = await supertest(app)
      .post('/api/teams/swap')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        user1_id: user1Id,
        user2_id: user2Id,
        team1_id: generatedTeamIds[0],
        team2_id: generatedTeamIds[1]
      });

    assert.equal(swapRes.status, 200);
    assert.equal(swapRes.body.success, true);

    // Verify database reflects the swap
    const user1Team = db.prepare('SELECT team_id FROM team_memberships WHERE user_id = ?').get(user1Id);
    const user2Team = db.prepare('SELECT team_id FROM team_memberships WHERE user_id = ?').get(user2Id);

    assert.equal(user1Team.team_id, generatedTeamIds[1]);
    assert.equal(user2Team.team_id, generatedTeamIds[0]);
  });

  await t.test('5. Verify team renaming and history audit logging', async () => {
    const renameRes = await supertest(app)
      .post(`/api/teams/${generatedTeamIds[0]}/rename`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Renamed Super Squad' });

    assert.equal(renameRes.status, 200);
    assert.equal(renameRes.body.name, 'Renamed Super Squad');

    // Fetch team history
    const historyRes = await supertest(app)
      .get(`/api/teams/${generatedTeamIds[0]}/history`)
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(historyRes.status, 200);
    assert.equal(historyRes.body.success, true);
    assert.ok(Array.isArray(historyRes.body.history));
    assert.ok(historyRes.body.history.some(h => h.action === 'RENAMED'));
  });
});
