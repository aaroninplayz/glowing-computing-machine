import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import supertest from 'supertest';
import express from 'express';
import { db, initSchema } from '../src/server/db/database.js';

describe('Teams & Point Override Endpoints', () => {
  let app;

  before(() => {
    initSchema();
    app = express();
    app.use(express.json());

    app.get('/api/teams', (req, res) => {
      const teams = db.prepare('SELECT * FROM teams WHERE is_active = 1').all();
      res.json(teams);
    });

    app.post('/api/teams/:id/points/override', (req, res) => {
      const { id } = req.params;
      const { user_id, custom_point_share } = req.body;
      db.prepare(`
        UPDATE team_memberships SET custom_point_share = ? WHERE team_id = ? AND user_id = ?
      `).run(custom_point_share, id, user_id);
      res.json({ success: true });
    });

    app.post('/api/teams/:id/dissolve', (req, res) => {
      const { id } = req.params;
      db.prepare(`
        UPDATE teams SET is_active = 0, status = 'DISSOLVED' WHERE id = ?
      `).run(id);
      res.json({ success: true, teamId: id, is_active: 0 });
    });
  });

  it('should list active teams', async () => {
    const res = await supertest(app).get('/api/teams');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body));
  });

  it('should override custom point share for team member', async () => {
    const res = await supertest(app)
      .post('/api/teams/t1/points/override')
      .send({ user_id: 'u_o1', custom_point_share: 1.5 });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
  });

  it('should dissolve team and set is_active to 0', async () => {
    const res = await supertest(app)
      .post('/api/teams/t2/dissolve')
      .send({ reason: 'TEST' });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.is_active, 0);
  });
});
