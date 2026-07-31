import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import supertest from 'supertest';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Static File Server', () => {
  it('should serve index.html with HTML5 doctype and ES module script', async () => {
    const app = express();
    app.use(express.static(path.join(__dirname, '../src/public')));

    const res = await supertest(app).get('/');
    assert.equal(res.status, 200);
    assert.match(res.text, /<!DOCTYPE html>/i);
    assert.match(res.text, /FORGE/);
    assert.match(res.text, /type="module" src="\/js\/app.js"/);
  });

  it('should serve CSS style.css file with custom properties', async () => {
    const app = express();
    app.use(express.static(path.join(__dirname, '../src/public')));

    const res = await supertest(app).get('/css/style.css');
    assert.equal(res.status, 200);
    assert.match(res.text, /--bg-base:/);
    assert.match(res.text, /--accent-1:/);
  });
});
