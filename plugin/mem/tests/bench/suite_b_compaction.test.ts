/**
 * Suite B — Post-Compaction Recovery (PCQA)
 *
 * Metrics: Post-Compaction Quality Assurance (SubEM-based, no LLM judge),
 *          Hit Rate (HR) on snapshot content, snapshot fidelity checks
 *
 * Tests:
 *   B1: saveCompactionSnapshot stores the expected top facts
 *   B2: loadLatestSnapshot returns correct content (SubEM ≥ 0.60 on gold terms)
 *   B3: SDD pipeline state is round-tripped losslessly
 *   B4: git_branch is preserved in snapshot
 *   B5: second loadLatestSnapshot returns null (restored=1 idempotency)
 *   B6: snapshot includes recent observations summary
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestDb } from '../helpers.js';
import { SessionStore } from '../../src/db/sessions.js';
import { ObservationStore } from '../../src/db/observations.js';
import { FactStore } from '../../src/db/facts.js';
import { subEM, formatMetric } from './scorer.js';
import { SIGNAL_OBSERVATIONS } from './fixtures.js';
import type Database from 'better-sqlite3';

const PROJECT = 'bench-b';

/** Gold facts that MUST appear in the compaction snapshot (SubEM terms) */
const SNAPSHOT_GOLD_TERMS: string[][] = [
  ['postgresql', 'database'],
  ['jwt', 'authentication'],
  ['cve', 'express'],
  ['conan', 'delegate'],
  ['aws', 'ecs'],
];

const MOCK_SDD_STATE = {
  task: 'implement user authentication module',
  current_phase: 2,
  spec_approved: true,
};

describe('Suite B — Post-Compaction Recovery (PCQA)', () => {
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

    const session = sessions.start({ project: PROJECT });

    // Populate DB with signal observations
    for (const obs of SIGNAL_OBSERVATIONS) {
      const created = observations.create({
        session_id: session.id,
        type: obs.type as any,
        agent: obs.agent,
        content: obs.content,
        project: PROJECT,
      });
      factStore.extractAndStore(created);
    }
  });

  afterEach(() => cleanup());

  it('B1: saveCompactionSnapshot returns a valid snapshot ID', () => {
    const snapshotId = factStore.saveCompactionSnapshot(PROJECT, 'main', MOCK_SDD_STATE);
    expect(snapshotId).toBeGreaterThan(0);

    const row = db.prepare('SELECT * FROM compaction_snapshots WHERE id = ?').get(snapshotId) as any;
    expect(row).toBeDefined();
    expect(row.project).toBe(PROJECT);
    expect(row.git_branch).toBe('main');
    expect(row.restored).toBe(0);
  });

  it('B2: snapshot top_facts contains expected high-importance facts (PCQA ≥ 0.60)', () => {
    factStore.saveCompactionSnapshot(PROJECT, 'main', MOCK_SDD_STATE);
    const snapshot = factStore.loadLatestSnapshot(PROJECT);

    expect(snapshot).not.toBeNull();
    const factContents = (snapshot!.top_facts || []).map((f: any) => f.content);

    let hits = 0;
    for (const terms of SNAPSHOT_GOLD_TERMS) {
      const hit = factContents.some((c: string) => subEM(c, terms));
      if (hit) hits++;
    }

    const pcqa = hits / SNAPSHOT_GOLD_TERMS.length;
    console.log(formatMetric('B2 PCQA', pcqa, 0.60));
    console.log('  Snapshot top_facts:', factContents.slice(0, 6).map((c: string) => c.substring(0, 60)));
    expect(pcqa).toBeGreaterThanOrEqual(0.60);
  });

  it('B3: SDD pipeline state is round-tripped exactly', () => {
    factStore.saveCompactionSnapshot(PROJECT, 'main', MOCK_SDD_STATE);
    const snapshot = factStore.loadLatestSnapshot(PROJECT);

    expect(snapshot).not.toBeNull();
    const sdd = snapshot!.sdd_state as any;
    expect(sdd).not.toBeNull();
    expect(sdd.task).toBe(MOCK_SDD_STATE.task);
    expect(sdd.current_phase).toBe(MOCK_SDD_STATE.current_phase);
    expect(sdd.spec_approved).toBe(MOCK_SDD_STATE.spec_approved);
  });

  it('B4: git_branch is preserved in snapshot', () => {
    factStore.saveCompactionSnapshot(PROJECT, 'feature/auth-module', null);
    const snapshot = factStore.loadLatestSnapshot(PROJECT);

    expect(snapshot).not.toBeNull();
    expect(snapshot!.git_branch).toBe('feature/auth-module');
  });

  it('B4b: null git_branch is handled gracefully', () => {
    factStore.saveCompactionSnapshot(PROJECT, null, null);
    const snapshot = factStore.loadLatestSnapshot(PROJECT);

    expect(snapshot).not.toBeNull();
    expect(snapshot!.git_branch).toBeNull();
  });

  it('B5: second loadLatestSnapshot returns null (restored=1 idempotency)', () => {
    factStore.saveCompactionSnapshot(PROJECT, 'main', null);

    const first = factStore.loadLatestSnapshot(PROJECT);
    expect(first).not.toBeNull();

    const second = factStore.loadLatestSnapshot(PROJECT);
    expect(second).toBeNull();
  });

  it('B5b: restored flag is set to 1 after first load', () => {
    const snapshotId = factStore.saveCompactionSnapshot(PROJECT, 'main', null);

    factStore.loadLatestSnapshot(PROJECT);

    const row = db.prepare('SELECT restored, restored_at FROM compaction_snapshots WHERE id = ?').get(snapshotId) as any;
    expect(row.restored).toBe(1);
    expect(row.restored_at).not.toBeNull();
  });

  it('B6: snapshot includes recent_obs_summary with agent and snippet', () => {
    factStore.saveCompactionSnapshot(PROJECT, 'main', null);
    const snapshot = factStore.loadLatestSnapshot(PROJECT);

    expect(snapshot).not.toBeNull();
    const recentObs = snapshot!.recent_obs_summary;
    expect(Array.isArray(recentObs)).toBe(true);
    expect(recentObs.length).toBeGreaterThan(0);

    const obs = recentObs[0] as any;
    expect(obs).toHaveProperty('agent');
    expect(obs).toHaveProperty('snippet');
    expect(obs).toHaveProperty('type');
  });

  it('B7: snapshot top_facts are ordered by importance DESC', () => {
    factStore.saveCompactionSnapshot(PROJECT, 'main', null);
    const snapshot = factStore.loadLatestSnapshot(PROJECT);

    const facts = snapshot!.top_facts as any[];
    if (facts.length < 2) return;

    // First fact should have highest importance
    for (let i = 0; i < facts.length - 1; i++) {
      expect(facts[i].importance).toBeGreaterThanOrEqual(facts[i + 1].importance);
    }
  });

  it('B8: snapshot tokens estimate is positive', () => {
    const snapshotId = factStore.saveCompactionSnapshot(PROJECT, 'main', MOCK_SDD_STATE);
    const row = db.prepare('SELECT context_tokens_estimate FROM compaction_snapshots WHERE id = ?').get(snapshotId) as any;
    expect(row.context_tokens_estimate).toBeGreaterThan(0);
  });
});
