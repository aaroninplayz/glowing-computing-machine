import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import supertest from 'supertest';
import express from 'express';
import { db, initSchema } from '../src/server/db/database.js';

describe('Tasks & Marketplace Endpoints', () => {
  let app;

  before(() => {
    initSchema();
    db.prepare("INSERT OR IGNORE INTO users (id, name, username, email, password_hash, role) VALUES ('u_o4', 'Taylor', 'taylor_op', 'taylor@forge.local', 'pass123', 'OPERATIVE')").run();
    db.prepare("INSERT OR IGNORE INTO tasks (id, title, description, total_points, is_marketplace, status) VALUES ('market1', 'Market Task', 'Desc', 20, 1, 'MARKETPLACE')").run();
    app = express();
    app.use(express.json());

    app.get('/api/tasks', (req, res) => {
      const official = db.prepare('SELECT * FROM tasks WHERE is_marketplace = 0').all();
      const marketplace = db.prepare(`
        SELECT t.*, (SELECT COUNT(*) FROM task_upvotes tu WHERE tu.task_id = t.id) as upvotes
        FROM tasks t WHERE t.is_marketplace = 1
      `).all();
      res.json({ official, marketplace });
    });

    app.post('/api/tasks/suggest', (req, res) => {
      const { title, description, total_points } = req.body;
      const taskId = `market_test_${Date.now()}`;
      db.prepare(`
        INSERT INTO tasks (id, title, description, total_points, is_marketplace, status)
        VALUES (?, ?, ?, ?, 1, 'MARKETPLACE')
      `).run(taskId, title, description, total_points || 20);
      res.json({ success: true, taskId });
    });

    app.post('/api/tasks/:id/upvote', (req, res) => {
      const { id } = req.params;
      const userId = req.body.user_id || 'u_o1';
      db.prepare('INSERT OR IGNORE INTO task_upvotes (task_id, user_id) VALUES (?, ?)').run(id, userId);
      const count = db.prepare('SELECT COUNT(*) as upvotes FROM task_upvotes WHERE task_id = ?').get(id).upvotes;
      res.json({ success: true, upvotes: count });
    });
  });

  it('should list tasks and return official and marketplace lists', async () => {
    const res = await supertest(app).get('/api/tasks');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.official));
    assert.ok(Array.isArray(res.body.marketplace));
  });

  it('should suggest a new marketplace task', async () => {
    const res = await supertest(app)
      .post('/api/tasks/suggest')
      .send({ title: 'Test Suggestion', description: 'Test description', total_points: 30 });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.taskId);
  });

  it('should upvote a marketplace task and return incremented count', async () => {
    const res = await supertest(app)
      .post('/api/tasks/market1/upvote')
      .send({ user_id: 'u_o4' });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.upvotes >= 1);
  });
});
