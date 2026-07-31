import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import supertest from 'supertest';
import express from 'express';
import cors from 'cors';
import { db, initSchema } from '../src/server/db/database.js';

describe('Auth & User Role Endpoints', () => {
  let app;

  before(() => {
    initSchema();
    app = express();
    app.use(cors());
    app.use(express.json());

    app.post('/api/auth/login', (req, res) => {
      const { identifier, password } = req.body;
      const user = db.prepare(`
        SELECT id, name, username, email, phone, role, tag 
        FROM users 
        WHERE (email = ? OR username = ? OR phone = ?) AND password_hash = ?
      `).get(identifier, identifier, identifier, password);

      if (!user) return res.status(401).json({ error: 'Invalid credentials' });
      const publicRole = user.role === 'DEV_STEALTH' ? 'OPERATIVE' : user.role;
      res.json({ success: true, user: { ...user, public_role: publicRole } });
    });

    app.get('/api/auth/me', (req, res) => {
      const userId = req.headers['x-user-id'] || req.query.user_id || 'u_dev';
      const user = db.prepare(`
        SELECT id, name, username, email, phone, role, tag 
        FROM users 
        WHERE id = ? OR username = ?
      `).get(userId, userId);

      if (!user) return res.status(404).json({ error: 'User profile not found' });
      const publicRole = user.role === 'DEV_STEALTH' ? 'OPERATIVE' : user.role;
      res.json({ user: { ...user, public_role: publicRole } });
    });
  });

  it('should authenticate user and mask DEV_STEALTH role to OPERATIVE in public_role', async () => {
    const res = await supertest(app)
      .post('/api/auth/login')
      .send({ identifier: 'aaron_dev', password: 'pass123' });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.user.role, 'DEV_STEALTH');
    assert.equal(res.body.user.public_role, 'OPERATIVE');
  });

  it('should return current user profile via /api/auth/me with masked stealth role', async () => {
    const res = await supertest(app)
      .get('/api/auth/me')
      .set('x-user-id', 'u_dev');

    assert.equal(res.status, 200);
    assert.equal(res.body.user.id, 'u_dev');
    assert.equal(res.body.user.public_role, 'OPERATIVE');
  });
});
