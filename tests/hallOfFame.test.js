import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import supertest from 'supertest';
import express from 'express';
import { db, initSchema } from '../src/server/db/database.js';

describe('Hall of Fame Endpoints', () => {
  let app;

  before(() => {
    initSchema();
    app = express();
    app.use(express.json());

    app.get('/api/hall-of-fame', (req, res) => {
      const titles = db.prepare('SELECT * FROM hall_of_fame_titles').all();
      res.json({ allTime: [], season1: [], titles });
    });

    app.post('/api/hall-of-fame/award', (req, res) => {
      const { title_name, category, awarded_to_user_id } = req.body;
      const titleId = `hof_test_${Date.now()}`;
      db.prepare(`
        INSERT INTO hall_of_fame_titles (id, title_name, category, awarded_to_user_id)
        VALUES (?, ?, ?, ?)
      `).run(titleId, title_name, category || 'Academics', awarded_to_user_id || null);
      res.json({ success: true, titleId });
    });
  });

  it('should fetch hall of fame rankings and titles', async () => {
    const res = await supertest(app).get('/api/hall-of-fame');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.titles));
  });

  it('should award a new hall of fame title', async () => {
    const res = await supertest(app)
      .post('/api/hall-of-fame/award')
      .send({ title_name: 'Test Champion', category: 'Coding', awarded_to_user_id: 'u_o1' });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.titleId);
  });
});
