import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestDb } from './helpers.js';
import { SessionStore } from '../src/db/sessions.js';
import { ObservationStore } from '../src/db/observations.js';
import { SearchEngine } from '../src/db/search.js';
import type Database from 'better-sqlite3';

describe('SearchEngine', () => {
  let db: Database.Database;
  let cleanup: () => void;
  let sessions: SessionStore;
  let observations: ObservationStore;
  let search: SearchEngine;

  beforeEach(() => {
    ({ db, cleanup } = createTestDb());
    sessions = new SessionStore(db);
    observations = new ObservationStore(db);
    search = new SearchEngine(db);

    // Seed test data
    const s = sessions.start({ project: 'frontend' });
    observations.create({ session_id: s.id, type: 'review', agent: 'levi', content: 'Null pointer risk in auth module login handler', project: 'frontend' });
    observations.create({ session_id: s.id, type: 'event', agent: 'itachi', content: 'Critical CVE-2026-5678 found in lodash dependency', metadata: { severity: 'critical', triggers: ['shikamaru'] }, project: 'frontend' });
    observations.create({ session_id: s.id, type: 'insight', agent: 'killua', content: 'Browser test failure on Safari mobile checkout flow', project: 'frontend' });
    observations.create({ session_id: s.id, type: 'review', agent: 'levi', content: 'Clean code in payment service refactor, well tested', project: 'api-service' });
  });

  afterEach(() => cleanup());

  it('searches by keyword', () => {
    const results = search.search('auth login');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].agent).toBe('levi');
  });

  it('filters by project', () => {
    const results = search.search('levi', { project: 'api-service' });
    expect(results).toHaveLength(1);
    expect(results[0].project).toBe('api-service');
  });

  it('filters by agent', () => {
    const results = search.search('*', { agent: 'itachi' });
    expect(results.length).toBeGreaterThan(0);
    results.forEach(r => expect(r.agent).toBe('itachi'));
  });

  it('returns snippets under 120 chars', () => {
    const results = search.search('auth');
    results.forEach(r => expect(r.snippet.length).toBeLessThanOrEqual(120));
  });

  it('agent query returns observations for specific agent', () => {
    const results = search.agentQuery('levi', 7);
    expect(results).toHaveLength(2);
    results.forEach(r => expect(r.agent).toBe('levi'));
  });

  it('agent query filters by project', () => {
    const results = search.agentQuery('levi', 7, 'frontend');
    expect(results).toHaveLength(1);
  });
});
