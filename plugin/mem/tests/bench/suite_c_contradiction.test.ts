/**
 * Suite C — Contradiction Detection (Truth Maintenance)
 *
 * Metric: CRR — Contradiction Resolution Rate
 *   CRR = (expected supersessions that actually happened) / (total expected supersessions)
 *
 * Threshold: CRR ≥ 0.80
 *
 * Supersession fires when a new decision/preference fact shares ≥2 domain tags
 * with an older fact of the same category (codenamev/claude_memory pattern).
 *
 * Bug fixed: supersedConflicting now uses `id < @id` instead of `created_at < @created_at`
 * to handle same-second insertions in tests without timing issues.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestDb } from '../helpers.js';
import { SessionStore } from '../../src/db/sessions.js';
import { ObservationStore } from '../../src/db/observations.js';
import { FactStore } from '../../src/db/facts.js';
import { crr, formatMetric } from './scorer.js';
import { CONTRADICTION_PAIRS } from './fixtures.js';
import type Database from 'better-sqlite3';

const PROJECT = 'bench-c';

describe('Suite C — Contradiction Detection (CRR)', () => {
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

  it('C1: CRR ≥ 0.80 — newer decision supersedes older when ≥2 tags overlap', () => {
    const session = sessions.start({ project: PROJECT });
    const expectedSuperseded: number[] = [];

    for (const pair of CONTRADICTION_PAIRS) {
      // Insert older fact
      const older = observations.create({
        session_id: session.id,
        type: 'decision',
        agent: 'wantan',
        content: pair.olderContent,
        project: PROJECT,
      });
      const olderFacts = factStore.extractAndStore(older);
      expect(olderFacts).toHaveLength(1);
      expectedSuperseded.push(olderFacts[0].id);

      // Insert newer fact (same category, overlapping tags → should supersede older)
      const newer = observations.create({
        session_id: session.id,
        type: 'decision',
        agent: 'wantan',
        content: pair.newerContent,
        project: PROJECT,
      });
      factStore.extractAndStore(newer);
    }

    // Fetch which facts are actually superseded
    const rows = db.prepare('SELECT id FROM facts WHERE superseded = 1').all() as Array<{ id: number }>;
    const actualSuperseded = new Set(rows.map(r => r.id));

    const score = crr(actualSuperseded, expectedSuperseded);
    console.log(formatMetric('C1 CRR', score, 0.80));
    console.log(`  Expected superseded IDs: [${expectedSuperseded.join(', ')}]`);
    console.log(`  Actual  superseded IDs: [${[...actualSuperseded].join(', ')}]`);

    expect(score).toBeGreaterThanOrEqual(0.80);
  });

  it('C2: superseded facts are excluded from search results', () => {
    const session = sessions.start({ project: PROJECT });

    // Use the JWT/session pair from fixtures
    const pair = CONTRADICTION_PAIRS[0];

    const older = observations.create({
      session_id: session.id, type: 'decision', agent: 'wantan',
      content: pair.olderContent, project: PROJECT,
    });
    const [olderFact] = factStore.extractAndStore(older);

    const newer = observations.create({
      session_id: session.id, type: 'decision', agent: 'wantan',
      content: pair.newerContent, project: PROJECT,
    });
    factStore.extractAndStore(newer);

    // Verify older fact is marked superseded
    const row = db.prepare('SELECT superseded FROM facts WHERE id = ?').get(olderFact.id) as any;
    expect(row.superseded).toBe(1);

    // Search should NOT return the superseded fact
    const results = factStore.search('authentication API session', { project: PROJECT });
    const ids = results.map(r => r.id);
    expect(ids).not.toContain(olderFact.id);
  });

  it('C3: non-conflicting decisions are NOT superseded (different domain)', () => {
    const session = sessions.start({ project: PROJECT });

    // Two decisions with NO shared tags (database vs frontend) — no supersession
    const obs1 = observations.create({
      session_id: session.id, type: 'decision', agent: 'wantan',
      content: 'Decided to use PostgreSQL for the primary database layer',
      project: PROJECT,
    });
    const [fact1] = factStore.extractAndStore(obs1);

    const obs2 = observations.create({
      session_id: session.id, type: 'decision', agent: 'wantan',
      content: 'Decided to use React with TypeScript for the frontend UI components',
      project: PROJECT,
    });
    factStore.extractAndStore(obs2);

    // fact1 should NOT be superseded (no domain overlap)
    const row = db.prepare('SELECT superseded FROM facts WHERE id = ?').get(fact1.id) as any;
    expect(row.superseded).toBe(0);
  });

  it('C4: single-tag overlap does NOT trigger supersession (requires ≥2)', () => {
    const session = sessions.start({ project: PROJECT });

    // Both have 'database' tag but nothing else in common
    const obs1 = observations.create({
      session_id: session.id, type: 'decision', agent: 'wantan',
      content: 'Decided to use PostgreSQL for the primary database',
      project: PROJECT,
    });
    const [fact1] = factStore.extractAndStore(obs1);

    const obs2 = observations.create({
      session_id: session.id, type: 'decision', agent: 'wantan',
      content: 'Decided to use Redis for the caching database',
      project: PROJECT,
    });
    factStore.extractAndStore(obs2);

    // fact1 has tags: ['database'] — only 1 tag, NOT enough to supersede
    // fact2 also has tags: ['database'] — 1 shared tag, below threshold of 2
    const row = db.prepare('SELECT superseded FROM facts WHERE id = ?').get(fact1.id) as any;
    expect(row.superseded).toBe(0);
  });

  it('C5: superseded_by field links newer fact to superseded fact', () => {
    const session = sessions.start({ project: PROJECT });
    const pair = CONTRADICTION_PAIRS[0];

    const older = observations.create({
      session_id: session.id, type: 'decision', agent: 'wantan',
      content: pair.olderContent, project: PROJECT,
    });
    const [olderFact] = factStore.extractAndStore(older);

    const newer = observations.create({
      session_id: session.id, type: 'decision', agent: 'wantan',
      content: pair.newerContent, project: PROJECT,
    });
    const [newerFact] = factStore.extractAndStore(newer);

    const row = db.prepare('SELECT superseded, superseded_by FROM facts WHERE id = ?').get(olderFact.id) as any;
    expect(row.superseded).toBe(1);
    expect(row.superseded_by).toBe(newerFact.id);
  });

  it('C6: wildcard search also excludes superseded facts', () => {
    const session = sessions.start({ project: PROJECT });
    const pair = CONTRADICTION_PAIRS[1]; // database pair

    const older = observations.create({
      session_id: session.id, type: 'decision', agent: 'wantan',
      content: pair.olderContent, project: PROJECT,
    });
    const [olderFact] = factStore.extractAndStore(older);

    const newer = observations.create({
      session_id: session.id, type: 'decision', agent: 'wantan',
      content: pair.newerContent, project: PROJECT,
    });
    factStore.extractAndStore(newer);

    const results = factStore.search('*', { project: PROJECT });
    const ids = results.map(r => r.id);
    expect(ids).not.toContain(olderFact.id);
  });
});
