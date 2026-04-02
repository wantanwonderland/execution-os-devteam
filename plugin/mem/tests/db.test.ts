import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestDb } from './helpers.js';
import type Database from 'better-sqlite3';
import { SessionStore } from '../src/db/sessions.js';
import { ObservationStore } from '../src/db/observations.js';

describe('Database', () => {
  let db: Database.Database;
  let cleanup: () => void;

  beforeEach(() => {
    ({ db, cleanup } = createTestDb());
  });

  afterEach(() => {
    cleanup();
  });

  it('creates all tables', () => {
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
      .all() as { name: string }[];
    const names = tables.map(t => t.name).sort();

    expect(names).toContain('sessions');
    expect(names).toContain('observations');
    expect(names).toContain('pr_observations');
    expect(names).toContain('test_observations');
    expect(names).toContain('security_observations');
  });

  it('creates FTS5 virtual table', () => {
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='observations_fts'")
      .all();
    expect(tables).toHaveLength(1);
  });

  it('uses WAL journal mode', () => {
    const result = db.pragma('journal_mode') as { journal_mode: string }[];
    expect(result[0].journal_mode).toBe('wal');
  });

  it('can insert and retrieve a session', () => {
    const stmt = db.prepare(
      'INSERT INTO sessions (project, agent) VALUES (?, ?) RETURNING id'
    );
    const row = stmt.get('test-project', 'wantan') as { id: number };
    expect(row.id).toBeGreaterThan(0);

    const session = db
      .prepare('SELECT * FROM sessions WHERE id = ?')
      .get(row.id) as any;
    expect(session.project).toBe('test-project');
    expect(session.agent).toBe('wantan');
  });

  it('can insert observation and find via FTS5', () => {
    // Insert a session first
    const session = db
      .prepare('INSERT INTO sessions (project) VALUES (?) RETURNING id')
      .get('test') as { id: number };

    // Insert an observation
    db.prepare(
      `INSERT INTO observations (session_id, type, agent, content, project)
       VALUES (?, ?, ?, ?, ?)`
    ).run(session.id, 'review', 'levi', 'Found null pointer risk in auth module', 'test');

    // Search via FTS5
    const results = db
      .prepare(
        `SELECT o.* FROM observations o
         JOIN observations_fts fts ON o.id = fts.rowid
         WHERE observations_fts MATCH ?`
      )
      .all('null pointer auth') as any[];

    expect(results).toHaveLength(1);
    expect(results[0].agent).toBe('levi');
    expect(results[0].content).toContain('null pointer');
  });
});

describe('SessionStore', () => {
  let db: Database.Database;
  let cleanup: () => void;
  let store: SessionStore;

  beforeEach(() => {
    ({ db, cleanup } = createTestDb());
    store = new SessionStore(db);
  });

  afterEach(() => cleanup());

  it('starts a session', () => {
    const session = store.start({ project: 'my-app' });
    expect(session.id).toBeGreaterThan(0);
    expect(session.project).toBe('my-app');
    expect(session.agent).toBe('wantan');
    expect(session.ended_at).toBeNull();
  });

  it('ends a session with summary', () => {
    const session = store.start({ project: 'my-app' });
    const ended = store.end(session.id, 'Reviewed 3 PRs');
    expect(ended.ended_at).not.toBeNull();
    expect(ended.summary).toBe('Reviewed 3 PRs');
  });

  it('gets active session', () => {
    store.start({ project: 'app-a' });
    const s2 = store.start({ project: 'app-b' });
    const active = store.getActive();
    expect(active?.id).toBe(s2.id);
  });
});

describe('ObservationStore', () => {
  let db: Database.Database;
  let cleanup: () => void;
  let sessions: SessionStore;
  let observations: ObservationStore;

  beforeEach(() => {
    ({ db, cleanup } = createTestDb());
    sessions = new SessionStore(db);
    observations = new ObservationStore(db);
  });

  afterEach(() => cleanup());

  it('creates an observation', () => {
    const session = sessions.start({ project: 'test' });
    const obs = observations.create({
      session_id: session.id,
      type: 'review',
      agent: 'levi',
      content: 'PR #42 has a null check missing',
      project: 'test'
    });
    expect(obs.id).toBeGreaterThan(0);
    expect(obs.agent).toBe('levi');
  });

  it('creates observation with metadata', () => {
    const session = sessions.start({ project: 'test' });
    const obs = observations.create({
      session_id: session.id,
      type: 'event',
      agent: 'itachi',
      content: 'Critical CVE found',
      metadata: { severity: 'critical', cve: 'CVE-2026-1234', repo: 'frontend' },
      project: 'test'
    });
    const parsed = JSON.parse(obs.metadata!);
    expect(parsed.severity).toBe('critical');
  });

  it('fetches by IDs (batch)', () => {
    const session = sessions.start({ project: 'test' });
    const o1 = observations.create({ session_id: session.id, type: 'review', agent: 'levi', content: 'First', project: 'test' });
    observations.create({ session_id: session.id, type: 'review', agent: 'levi', content: 'Second', project: 'test' });
    const o3 = observations.create({ session_id: session.id, type: 'review', agent: 'levi', content: 'Third', project: 'test' });

    const batch = observations.getByIds([o1.id, o3.id]);
    expect(batch).toHaveLength(2);
    expect(batch[0].content).toBe('First');
    expect(batch[1].content).toBe('Third');
  });

  it('lists by agent with time window', () => {
    const session = sessions.start({ project: 'test' });
    observations.create({ session_id: session.id, type: 'review', agent: 'levi', content: 'Levi review', project: 'test' });
    observations.create({ session_id: session.id, type: 'event', agent: 'killua', content: 'Test run', project: 'test' });

    const leviObs = observations.listByAgent('levi');
    expect(leviObs).toHaveLength(1);
    expect(leviObs[0].agent).toBe('levi');
  });

  it('gets timeline around anchor', () => {
    const session = sessions.start({ project: 'test' });
    for (let i = 1; i <= 7; i++) {
      observations.create({ session_id: session.id, type: 'review', agent: 'levi', content: `Observation ${i}`, project: 'test' });
    }

    // Anchor on the 4th observation (id depends on insertion order)
    const all = observations.listRecent(10, 'test');
    const anchorId = all[3].id; // 4th from end = 4th created
    const timeline = observations.timeline(anchorId, 2, 2);
    expect(timeline).toHaveLength(5); // 2 before + anchor + 2 after
  });
});

describe('ObservationStore - prune/export/import', () => {
  let db: Database.Database;
  let cleanup: () => void;
  let sessions: SessionStore;
  let observations: ObservationStore;

  beforeEach(() => {
    ({ db, cleanup } = createTestDb());
    sessions = new SessionStore(db);
    observations = new ObservationStore(db);
  });

  afterEach(() => cleanup());

  it('prune: removes old observations and creates summaries', () => {
    const session = sessions.start({ project: 'prune-test' });

    // Insert 10 observations with created_at set to 100 days ago
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 100);
    const oldDateStr = oldDate.toISOString().replace('T', ' ').substring(0, 19);

    for (let i = 1; i <= 10; i++) {
      db.prepare(
        `INSERT INTO observations (session_id, type, agent, content, project, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).run(session.id, 'review', 'levi', `Old observation ${i}`, 'prune-test', oldDateStr);
    }

    const countBefore = (db.prepare('SELECT COUNT(*) as c FROM observations').get() as { c: number }).c;
    expect(countBefore).toBe(10);

    const result = observations.prune(90);

    expect(result.pruned).toBe(10);
    expect(result.summarized).toBeGreaterThan(0);

    // The 10 old observations should be gone; summary insights should exist
    const remaining = db.prepare("SELECT * FROM observations WHERE type != 'insight'").all();
    expect(remaining).toHaveLength(0);

    const summaries = db.prepare("SELECT * FROM observations WHERE type = 'insight'").all() as any[];
    expect(summaries.length).toBeGreaterThan(0);
    expect(summaries[0].content).toContain('Weekly digest');
    expect(summaries[0].content).toContain('levi');
  });

  it('prune: returns zero counts when no old observations exist', () => {
    const session = sessions.start({ project: 'fresh' });
    observations.create({ session_id: session.id, type: 'review', agent: 'levi', content: 'Recent', project: 'fresh' });

    const result = observations.prune(90);
    expect(result.pruned).toBe(0);
    expect(result.summarized).toBe(0);
  });

  it('export: returns all observations as JSON', () => {
    const session = sessions.start({ project: 'export-test' });
    for (let i = 1; i <= 5; i++) {
      observations.create({ session_id: session.id, type: 'review', agent: 'levi', content: `Export obs ${i}`, project: 'export-test' });
    }

    const jsonStr = observations.exportAll();
    const parsed = JSON.parse(jsonStr);

    expect(parsed.count).toBe(5);
    expect(parsed.observations).toHaveLength(5);
    expect(parsed.exported_at).toBeDefined();
    expect(parsed.project).toBeNull();
  });

  it('export: filters by project', () => {
    const session = sessions.start({ project: 'proj-a' });
    for (let i = 1; i <= 3; i++) {
      observations.create({ session_id: session.id, type: 'review', agent: 'levi', content: `Alpha ${i}`, project: 'proj-a' });
    }
    for (let i = 1; i <= 2; i++) {
      observations.create({ session_id: session.id, type: 'review', agent: 'killua', content: `Beta ${i}`, project: 'proj-b' });
    }

    const jsonStr = observations.exportAll('proj-a');
    const parsed = JSON.parse(jsonStr);

    expect(parsed.count).toBe(3);
    expect(parsed.project).toBe('proj-a');
    expect(parsed.observations.every((o: any) => o.project === 'proj-a')).toBe(true);
  });

  it('import: restores observations from exported JSON', () => {
    const session = sessions.start({ project: 'import-test' });
    for (let i = 1; i <= 5; i++) {
      observations.create({ session_id: session.id, type: 'review', agent: 'levi', content: `Import obs ${i}`, project: 'import-test' });
    }

    const exported = observations.exportAll('import-test');

    // Delete all observations
    db.prepare('DELETE FROM observations').run();
    expect((db.prepare('SELECT COUNT(*) as c FROM observations').get() as { c: number }).c).toBe(0);

    // Import them back
    const importCount = observations.importData(exported);
    expect(importCount).toBe(5);

    const restored = db.prepare('SELECT * FROM observations').all();
    expect(restored).toHaveLength(5);
  });

  it('import: skips duplicate IDs', () => {
    const session = sessions.start({ project: 'dup-test' });
    for (let i = 1; i <= 3; i++) {
      observations.create({ session_id: session.id, type: 'event', agent: 'itachi', content: `Dup obs ${i}`, project: 'dup-test' });
    }

    const exported = observations.exportAll('dup-test');

    // First import (observations already exist) — all should be skipped
    const firstImport = observations.importData(exported);
    expect(firstImport).toBe(0);

    // Delete and import once, then import again
    db.prepare('DELETE FROM observations').run();
    const secondImport = observations.importData(exported);
    expect(secondImport).toBe(3);

    // Import again — all duplicates, should skip
    const thirdImport = observations.importData(exported);
    expect(thirdImport).toBe(0);

    // Total count should still be 3
    const count = (db.prepare('SELECT COUNT(*) as c FROM observations').get() as { c: number }).c;
    expect(count).toBe(3);
  });
});
