import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestDb } from './helpers.js';
import type Database from 'better-sqlite3';
import { SessionStore } from '../src/db/sessions.js';
import { ObservationStore } from '../src/db/observations.js';
import { FactStore } from '../src/db/facts.js';

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
    expect(names).toContain('facts');
    expect(names).toContain('memory_index');
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

describe('FactStore', () => {
  let db: Database.Database;
  let cleanup: () => void;
  let sessions: SessionStore;
  let observations: ObservationStore;
  let factStore: FactStore;

  beforeEach(() => {
    ({ db, cleanup } = createTestDb());
    sessions = new SessionStore(db);
    observations = new ObservationStore(db);
    factStore = new FactStore(db);
  });

  afterEach(() => cleanup());

  describe('extract facts from observation', () => {
    it('extracts a fact from a meaningful observation', () => {
      const session = sessions.start({ project: 'test-app' });
      const obs = observations.create({
        session_id: session.id,
        type: 'decision',
        agent: 'wantan',
        content: 'Decided to use JWT over sessions for mobile compatibility',
        project: 'test-app',
      });

      const facts = factStore.extractAndStore(obs);
      expect(facts).toHaveLength(1);
      expect(facts[0].category).toBe('decision');
      expect(facts[0].importance).toBe(10);
      expect(facts[0].content).toContain('JWT over sessions');
      expect(facts[0].project).toBe('test-app');
      expect(facts[0].content_hash).toBeDefined();
    });

    it('skips noise observations (ls, cd, git status)', () => {
      const session = sessions.start({ project: 'test-app' });

      const noiseContents = [
        'Bash: ls -la',
        'Bash: cd /Users/project',
        'Bash: git status',
        'Bash: git log --oneline',
        'Bash: npm install',
        'Read: src/index.ts',
        'Glob: **/*.ts',
        'Grep: TODO',
      ];

      for (const content of noiseContents) {
        const obs = observations.create({
          session_id: session.id,
          type: 'tool_use',
          agent: 'wantan',
          content,
          project: 'test-app',
        });
        const facts = factStore.extractAndStore(obs);
        expect(facts).toHaveLength(0);
      }
    });

    it('extracts facts from Write/Edit tool calls', () => {
      const session = sessions.start({ project: 'test-app' });
      const obs = observations.create({
        session_id: session.id,
        type: 'tool_use',
        agent: 'wantan',
        content: 'Write: src/auth/login.ts — implemented JWT authentication handler',
        project: 'test-app',
      });

      const facts = factStore.extractAndStore(obs);
      expect(facts).toHaveLength(1);
      expect(facts[0].category).toBe('architecture');
      expect(facts[0].importance).toBeGreaterThanOrEqual(6);
    });

    it('extracts facts from error observations', () => {
      const session = sessions.start({ project: 'test-app' });
      const obs = observations.create({
        session_id: session.id,
        type: 'error',
        agent: 'wantan',
        content: 'Found a crash in the payment module when processing refunds',
        project: 'test-app',
      });

      const facts = factStore.extractAndStore(obs);
      expect(facts).toHaveLength(1);
      expect(facts[0].category).toBe('error');
      expect(facts[0].importance).toBe(8);
    });

    it('extracts facts from research/exploration', () => {
      const session = sessions.start({ project: 'test-app' });
      const obs = observations.create({
        session_id: session.id,
        type: 'tool_use',
        agent: 'wantan',
        content: 'WebSearch: ionic vs react native 2026 comparison',
        project: 'test-app',
      });

      const facts = factStore.extractAndStore(obs);
      expect(facts).toHaveLength(1);
      expect(facts[0].category).toBe('learned');
      expect(facts[0].importance).toBe(4);
    });
  });

  describe('deduplication via content_hash', () => {
    it('skips duplicate facts with same content hash', () => {
      const session = sessions.start({ project: 'test-app' });
      const obs1 = observations.create({
        session_id: session.id,
        type: 'decision',
        agent: 'wantan',
        content: 'Decided to use PostgreSQL for the main database',
        project: 'test-app',
      });
      const obs2 = observations.create({
        session_id: session.id,
        type: 'decision',
        agent: 'wantan',
        content: 'Decided to use PostgreSQL for the main database',
        project: 'test-app',
      });

      const facts1 = factStore.extractAndStore(obs1);
      const facts2 = factStore.extractAndStore(obs2);

      expect(facts1).toHaveLength(1);
      expect(facts2).toHaveLength(0); // Duplicate, should be skipped

      // Only one fact in DB
      const count = (db.prepare('SELECT COUNT(*) as c FROM facts').get() as { c: number }).c;
      expect(count).toBe(1);
    });

    it('allows different content to create separate facts', () => {
      const session = sessions.start({ project: 'test-app' });
      const obs1 = observations.create({
        session_id: session.id,
        type: 'decision',
        agent: 'wantan',
        content: 'Decided to use PostgreSQL for the main database',
        project: 'test-app',
      });
      const obs2 = observations.create({
        session_id: session.id,
        type: 'decision',
        agent: 'wantan',
        content: 'Decided to use Redis for caching layer',
        project: 'test-app',
      });

      const facts1 = factStore.extractAndStore(obs1);
      const facts2 = factStore.extractAndStore(obs2);

      expect(facts1).toHaveLength(1);
      expect(facts2).toHaveLength(1);

      const count = (db.prepare('SELECT COUNT(*) as c FROM facts').get() as { c: number }).c;
      expect(count).toBe(2);
    });
  });

  describe('importance scoring', () => {
    it('assigns importance 10 to decisions', () => {
      const session = sessions.start({ project: 'test-app' });
      const obs = observations.create({
        session_id: session.id,
        type: 'decision',
        agent: 'wantan',
        content: 'Decided to switch from REST to GraphQL',
        project: 'test-app',
      });

      const facts = factStore.extractAndStore(obs);
      expect(facts[0].importance).toBe(10);
    });

    it('assigns importance 8 to errors', () => {
      const session = sessions.start({ project: 'test-app' });
      const obs = observations.create({
        session_id: session.id,
        type: 'error',
        agent: 'wantan',
        content: 'Critical bug found in payment processing',
        project: 'test-app',
      });

      const facts = factStore.extractAndStore(obs);
      expect(facts[0].importance).toBe(8);
    });

    it('assigns importance 8 to security issues', () => {
      const session = sessions.start({ project: 'test-app' });
      const obs = observations.create({
        session_id: session.id,
        type: 'event',
        agent: 'wantan',
        content: 'CVE-2026-1234 vulnerability detected in express package',
        project: 'test-app',
      });

      const facts = factStore.extractAndStore(obs);
      expect(facts[0].importance).toBe(8);
      expect(facts[0].category).toBe('security');
    });

    it('assigns importance 6 to architecture/implementation', () => {
      const session = sessions.start({ project: 'test-app' });
      const obs = observations.create({
        session_id: session.id,
        type: 'tool_use',
        agent: 'wantan',
        content: 'Implemented user registration endpoint with email verification',
        project: 'test-app',
      });

      const facts = factStore.extractAndStore(obs);
      expect(facts[0].importance).toBe(6);
      expect(facts[0].category).toBe('architecture');
    });

    it('assigns importance 4 to research', () => {
      const session = sessions.start({ project: 'test-app' });
      const obs = observations.create({
        session_id: session.id,
        type: 'tool_use',
        agent: 'wantan',
        content: 'Researched different caching strategies for the API layer',
        project: 'test-app',
      });

      const facts = factStore.extractAndStore(obs);
      expect(facts[0].importance).toBe(4);
    });

    it('assigns default importance 3 to unclassified content', () => {
      const session = sessions.start({ project: 'test-app' });
      const obs = observations.create({
        session_id: session.id,
        type: 'insight',
        agent: 'wantan',
        content: 'The sprint planning meeting is scheduled for Tuesday at 10am',
        project: 'test-app',
      });

      const facts = factStore.extractAndStore(obs);
      expect(facts[0].importance).toBe(3);
    });
  });

  describe('search facts', () => {
    it('searches facts by query', () => {
      const session = sessions.start({ project: 'test-app' });

      // Create multiple observations with facts
      const contents = [
        'Decided to use JWT for authentication',
        'Implemented the user registration endpoint',
        'Found a bug in the payment module',
        'Researched caching strategies for Redis',
      ];

      for (const content of contents) {
        const obs = observations.create({
          session_id: session.id,
          type: 'tool_use',
          agent: 'wantan',
          content,
          project: 'test-app',
        });
        factStore.extractAndStore(obs);
      }

      const results = factStore.search('authentication');
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0].content).toContain('JWT');
    });

    it('filters by category', () => {
      const session = sessions.start({ project: 'test-app' });

      const obs1 = observations.create({
        session_id: session.id, type: 'decision', agent: 'wantan',
        content: 'Decided to use PostgreSQL', project: 'test-app',
      });
      const obs2 = observations.create({
        session_id: session.id, type: 'error', agent: 'wantan',
        content: 'Found a crash in the login flow', project: 'test-app',
      });
      factStore.extractAndStore(obs1);
      factStore.extractAndStore(obs2);

      const decisionResults = factStore.search('*', { category: 'decision' });
      expect(decisionResults.every(r => r.category === 'decision')).toBe(true);
    });

    it('filters by minimum importance', () => {
      const session = sessions.start({ project: 'test-app' });

      const obs1 = observations.create({
        session_id: session.id, type: 'decision', agent: 'wantan',
        content: 'Decided to use microservices architecture', project: 'test-app',
      });
      const obs2 = observations.create({
        session_id: session.id, type: 'tool_use', agent: 'wantan',
        content: 'Researched different UI frameworks', project: 'test-app',
      });
      factStore.extractAndStore(obs1);
      factStore.extractAndStore(obs2);

      const highImportance = factStore.search('*', { minImportance: 8 });
      expect(highImportance.every(r => r.importance >= 8)).toBe(true);
    });

    it('filters by project', () => {
      const session = sessions.start({ project: 'app-a' });

      const obs1 = observations.create({
        session_id: session.id, type: 'decision', agent: 'wantan',
        content: 'Decided to use React for app-a frontend', project: 'app-a',
      });
      const obs2 = observations.create({
        session_id: session.id, type: 'decision', agent: 'wantan',
        content: 'Decided to use Vue for app-b frontend', project: 'app-b',
      });
      factStore.extractAndStore(obs1);
      factStore.extractAndStore(obs2);

      const appAFacts = factStore.search('*', { project: 'app-a' });
      expect(appAFacts.every(r => r.project === 'app-a')).toBe(true);
    });
  });

  describe('memory index', () => {
    it('returns undefined for nonexistent project index', () => {
      const index = factStore.getIndex('nonexistent');
      expect(index).toBeUndefined();
    });

    it('builds a memory index from facts', () => {
      const session = sessions.start({ project: 'test-app' });

      // Create several facts
      const contents = [
        'Decided to use PostgreSQL for the database',
        'Implemented the authentication module with JWT',
        'Found a critical bug in the payment flow',
        'Researched caching strategies for performance',
        'Decided to deploy on AWS ECS',
      ];

      for (const content of contents) {
        const obs = observations.create({
          session_id: session.id, type: 'tool_use', agent: 'wantan',
          content, project: 'test-app',
        });
        factStore.extractAndStore(obs);
      }

      const index = factStore.rebuildIndex('test-app');

      expect(index.project).toBe('test-app');
      expect(index.total_facts).toBeGreaterThan(0);
      expect(index.total_observations).toBeGreaterThan(0);
      expect(index.summary).toBeTruthy();
      expect(index.key_facts).toBeTruthy();

      // Verify key_facts is valid JSON with facts array
      const keyFacts = JSON.parse(index.key_facts!);
      expect(Array.isArray(keyFacts)).toBe(true);
      expect(keyFacts.length).toBeLessThanOrEqual(10);
      expect(keyFacts[0]).toHaveProperty('id');
      expect(keyFacts[0]).toHaveProperty('category');
      expect(keyFacts[0]).toHaveProperty('content');
      expect(keyFacts[0]).toHaveProperty('importance');
    });

    it('rebuild is idempotent (upsert)', () => {
      const session = sessions.start({ project: 'test-app' });
      const obs = observations.create({
        session_id: session.id, type: 'decision', agent: 'wantan',
        content: 'Decided to use TypeScript everywhere', project: 'test-app',
      });
      factStore.extractAndStore(obs);

      const index1 = factStore.rebuildIndex('test-app');
      const index2 = factStore.rebuildIndex('test-app');

      // Should still be just one row in memory_index
      const count = (db.prepare('SELECT COUNT(*) as c FROM memory_index').get() as { c: number }).c;
      expect(count).toBe(1);
      expect(index1.project).toBe(index2.project);
    });
  });

  describe('access counting', () => {
    it('increments access_count when recorded', () => {
      const session = sessions.start({ project: 'test-app' });
      const obs = observations.create({
        session_id: session.id, type: 'decision', agent: 'wantan',
        content: 'Decided to use Fastify instead of Express', project: 'test-app',
      });
      const facts = factStore.extractAndStore(obs);
      const factId = facts[0].id;

      // Initial access_count should be 0
      expect(facts[0].access_count).toBe(0);

      // Record access 3 times
      factStore.recordAccess(factId);
      factStore.recordAccess(factId);
      factStore.recordAccess(factId);

      // Check updated count
      const updated = db.prepare('SELECT access_count, last_accessed_at FROM facts WHERE id = ?').get(factId) as {
        access_count: number;
        last_accessed_at: string | null;
      };
      expect(updated.access_count).toBe(3);
      expect(updated.last_accessed_at).not.toBeNull();
    });
  });

  describe('category counts', () => {
    it('returns category counts for a project', () => {
      const session = sessions.start({ project: 'test-app' });

      const testData = [
        { content: 'Decided to use Postgres', type: 'decision' },
        { content: 'Decided to use Redis', type: 'decision' },
        { content: 'Found a crash in auth module', type: 'error' },
        { content: 'Researched GraphQL options', type: 'tool_use' },
      ];

      for (const item of testData) {
        const obs = observations.create({
          session_id: session.id, type: item.type as any, agent: 'wantan',
          content: item.content, project: 'test-app',
        });
        factStore.extractAndStore(obs);
      }

      const categories = factStore.getCategoryCounts('test-app');
      expect(categories.length).toBeGreaterThan(0);

      // Each entry should have category and count
      for (const cat of categories) {
        expect(cat).toHaveProperty('category');
        expect(cat).toHaveProperty('count');
        expect(cat.count).toBeGreaterThan(0);
      }
    });
  });

  describe('tag extraction', () => {
    it('extracts auth-related tags', () => {
      const session = sessions.start({ project: 'test-app' });
      const obs = observations.create({
        session_id: session.id, type: 'decision', agent: 'wantan',
        content: 'Decided to use JWT tokens for API authentication',
        project: 'test-app',
      });

      const facts = factStore.extractAndStore(obs);
      expect(facts[0].tags).toBeTruthy();
      const tags = JSON.parse(facts[0].tags!);
      expect(tags).toContain('auth');
    });

    it('extracts database-related tags', () => {
      const session = sessions.start({ project: 'test-app' });
      const obs = observations.create({
        session_id: session.id, type: 'tool_use', agent: 'wantan',
        content: 'Updated the Prisma schema with new user model migration',
        project: 'test-app',
      });

      const facts = factStore.extractAndStore(obs);
      expect(facts[0].tags).toBeTruthy();
      const tags = JSON.parse(facts[0].tags!);
      expect(tags).toContain('database');
    });

    it('extracts multiple tags from rich content', () => {
      const session = sessions.start({ project: 'test-app' });
      const obs = observations.create({
        session_id: session.id, type: 'error', agent: 'wantan',
        content: 'Security vulnerability found: SQL injection in the API endpoint for user authentication',
        project: 'test-app',
      });

      const facts = factStore.extractAndStore(obs);
      expect(facts[0].tags).toBeTruthy();
      const tags = JSON.parse(facts[0].tags!);
      expect(tags.length).toBeGreaterThanOrEqual(2);
      // Should contain multiple relevant tags
      expect(tags).toContain('security');
      expect(tags).toContain('api');
    });
  });

  describe('FTS5 on facts', () => {
    it('creates facts_fts virtual table', () => {
      const tables = db
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='facts_fts'")
        .all();
      expect(tables).toHaveLength(1);
    });

    it('can find facts via FTS5', () => {
      const session = sessions.start({ project: 'test-app' });
      const obs = observations.create({
        session_id: session.id, type: 'decision', agent: 'wantan',
        content: 'Decided to use microservices architecture with Kubernetes',
        project: 'test-app',
      });
      factStore.extractAndStore(obs);

      const results = db
        .prepare(
          `SELECT f.* FROM facts f
           JOIN facts_fts fts ON f.id = fts.rowid
           WHERE facts_fts MATCH ?`
        )
        .all('microservices Kubernetes') as any[];

      expect(results).toHaveLength(1);
      expect(results[0].content).toContain('microservices');
    });
  });
});
