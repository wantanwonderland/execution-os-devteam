import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import express from 'express';
import { createRoutes } from '../src/worker/routes.js';
import { createTestDb } from './helpers.js';
import type Database from 'better-sqlite3';

// Lightweight test client
async function request(app: express.Express, method: string, path: string, body?: any) {
  const { default: http } = await import('http');
  return new Promise<{ status: number; body: any }>((resolve, reject) => {
    const server = app.listen(0, () => {
      const port = (server.address() as any).port;
      const options = { hostname: 'localhost', port, path, method, headers: { 'Content-Type': 'application/json' } };
      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          server.close();
          resolve({ status: res.statusCode!, body: JSON.parse(data) });
        });
      });
      req.on('error', (err) => { server.close(); reject(err); });
      if (body) req.write(JSON.stringify(body));
      req.end();
    });
  });
}

describe('Worker API', () => {
  let db: Database.Database;
  let cleanup: () => void;
  let app: express.Express;

  beforeEach(() => {
    ({ db, cleanup } = createTestDb());
    app = express();
    app.use(express.json());
    app.use(createRoutes(db));
  });

  afterEach(() => cleanup());

  it('GET /api/health returns ok', async () => {
    const res = await request(app, 'GET', '/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('POST /api/sessions/start creates session', async () => {
    const res = await request(app, 'POST', '/api/sessions/start', { project: 'test-app' });
    expect(res.status).toBe(201);
    expect(res.body.project).toBe('test-app');
  });

  it('POST /api/observe creates observation', async () => {
    // Start session first
    await request(app, 'POST', '/api/sessions/start', { project: 'test-app' });

    const res = await request(app, 'POST', '/api/observe', {
      type: 'review',
      agent: 'levi',
      content: 'Found XSS vulnerability in search input',
      project: 'test-app'
    });
    expect(res.status).toBe(201);
    expect(res.body.agent).toBe('levi');
  });

  it('GET /api/search returns results', async () => {
    await request(app, 'POST', '/api/sessions/start', { project: 'test-app' });
    await request(app, 'POST', '/api/observe', {
      type: 'review', agent: 'levi', content: 'XSS vulnerability in search', project: 'test-app'
    });

    const res = await request(app, 'GET', '/api/search?query=XSS');
    expect(res.status).toBe(200);
    expect(res.body.content[0].text).toContain('levi');
  });

  it('POST /api/observe rejects missing fields', async () => {
    const res = await request(app, 'POST', '/api/observe', { type: 'review' });
    expect(res.status).toBe(400);
  });
});
