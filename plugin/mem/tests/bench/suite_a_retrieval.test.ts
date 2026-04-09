/**
 * Suite A — Retrieval Accuracy
 *
 * Metrics: Recall@5, SubEM pass rate, L1HR (L1 Hit Rate)
 * Method:  SubEM — no LLM judge, pure substring matching
 *
 * Thresholds:
 *   A1 extraction_accuracy ≥ 0.85  (correct category + importance per observation)
 *   A2 mean_recall@5       ≥ 0.75  (gold fact in top 5 results)
 *   A3 subEM_pass_rate     ≥ 0.75  (any top-5 result passes SubEM per query)
 *   A4 L1HR                ≥ 0.75  (gold term sets in always-loaded index)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestDb } from '../helpers.js';
import { SessionStore } from '../../src/db/sessions.js';
import { ObservationStore } from '../../src/db/observations.js';
import { FactStore } from '../../src/db/facts.js';
import { subEM, recallAtK, l1HitRate, formatMetric } from './scorer.js';
import { SIGNAL_OBSERVATIONS, NOISE_OBSERVATIONS, GOLD_QUERIES, L1_GOLD_TERMS } from './fixtures.js';
import type Database from 'better-sqlite3';

const PROJECT = 'bench-a';
const K = 5;

describe('Suite A — Retrieval Accuracy', () => {
  let db: Database.Database;
  let cleanup: () => void;
  let sessions: SessionStore;
  let observations: ObservationStore;
  let factStore: FactStore;

  // Populated in beforeEach — maps original content → extracted fact ID
  let factIdsByContent: Map<string, number>;

  beforeEach(() => {
    ({ db, cleanup } = createTestDb());
    sessions = new SessionStore(db);
    observations = new ObservationStore(db);
    factStore = new FactStore(db);
    factIdsByContent = new Map();

    const session = sessions.start({ project: PROJECT });

    for (const obs of SIGNAL_OBSERVATIONS) {
      const created = observations.create({
        session_id: session.id,
        type: obs.type as any,
        agent: obs.agent,
        content: obs.content,
        project: PROJECT,
      });
      const facts = factStore.extractAndStore(created);
      if (facts.length > 0) {
        factIdsByContent.set(obs.content, facts[0].id);
      }
    }

    for (const obs of NOISE_OBSERVATIONS) {
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

  // --- A1: Per-observation extraction accuracy ---
  // Uses facts already extracted in beforeEach (avoids dedup collision from re-insertion)

  it('A1: extraction_accuracy ≥ 0.85 — correct category and importance per signal observation', () => {
    let correct = 0;
    let extracted = 0;

    for (const obs of SIGNAL_OBSERVATIONS) {
      const factId = factIdsByContent.get(obs.content);
      if (factId === undefined) continue; // not extracted — counted as wrong below
      extracted++;

      const row = db
        .prepare('SELECT category, importance FROM facts WHERE id = ?')
        .get(factId) as { category: string; importance: number } | undefined;

      if (row && row.category === obs.expectedCategory && row.importance === obs.expectedImportance) {
        correct++;
      } else {
        const got = row ? `category=${row.category}, imp=${row.importance}` : 'not found';
        const want = `category=${obs.expectedCategory}, imp=${obs.expectedImportance}`;
        console.log(`  [WRONG] "${obs.content.substring(0, 50)}"\n    got: ${got}\n    want: ${want}`);
      }
    }

    const accuracy = correct / SIGNAL_OBSERVATIONS.length;
    console.log(formatMetric('A1 extraction_accuracy', accuracy, 0.85));
    console.log(`  Extracted ${extracted}/${SIGNAL_OBSERVATIONS.length} facts, ${correct} correct category+importance`);
    expect(accuracy).toBeGreaterThanOrEqual(0.85);
  });

  // --- A2: Recall@5 across gold queries ---

  it('A2: mean_recall@5 ≥ 0.75 — gold fact appears in top-5 results', () => {
    const recalls: number[] = [];
    const perQuery: string[] = [];

    for (const gq of GOLD_QUERIES) {
      const results = factStore.search(gq.query, { project: PROJECT });
      const resultIds = results.map(r => r.id);

      // Gold fact ID = first fact in factIdsByContent that passes SubEM
      let goldId: number | undefined;
      for (const [content, id] of factIdsByContent) {
        if (subEM(content, gq.goldTerms)) { goldId = id; break; }
      }

      if (goldId === undefined) {
        perQuery.push(`  [SKIP] ${gq.description}: no gold fact in DB`);
        recalls.push(0);
        continue;
      }

      const recall = recallAtK(resultIds, [goldId], K);
      recalls.push(recall);
      perQuery.push(`  [${recall >= 1 ? 'HIT ' : 'MISS'}] ${gq.description}: Recall@${K}=${recall.toFixed(2)}`);
    }

    const meanRecall = recalls.reduce((s, v) => s + v, 0) / recalls.length;
    console.log('A2 per-query:\n' + perQuery.join('\n'));
    console.log(formatMetric(`A2 mean_recall@${K}`, meanRecall, 0.75));
    expect(meanRecall).toBeGreaterThanOrEqual(0.75);
  });

  // --- A3: SubEM pass rate ---

  it('A3: subEM_pass_rate ≥ 0.75 — any top-5 result contains all gold terms', () => {
    let passes = 0;

    for (const gq of GOLD_QUERIES) {
      const top5 = factStore.search(gq.query, { project: PROJECT }).slice(0, K);
      if (top5.some(r => subEM(r.content, gq.goldTerms))) passes++;
    }

    const passRate = passes / GOLD_QUERIES.length;
    console.log(formatMetric('A3 subEM_pass_rate', passRate, 0.75));
    expect(passRate).toBeGreaterThanOrEqual(0.75);
  });

  // --- A4: L1 Hit Rate ---

  it('A4: L1HR ≥ 0.75 — gold term sets appear in always-loaded index', () => {
    const index = factStore.rebuildIndex(PROJECT);
    const combined = (index.summary || '') + (index.key_facts || '');

    const hr = l1HitRate(combined, L1_GOLD_TERMS);
    console.log(formatMetric('A4 L1HR', hr, 0.75));
    expect(hr).toBeGreaterThanOrEqual(0.75);
  });

  // --- A5: importance ordering ---

  it('A5: high-importance facts rank above low-importance in wildcard search', () => {
    const results = factStore.search('*', { project: PROJECT });
    if (results.length < 4) return;

    expect(results[0].importance).toBeGreaterThanOrEqual(9);

    const top3Avg = results.slice(0, 3).reduce((s, r) => s + r.importance, 0) / 3;
    const bot3Avg = results.slice(-3).reduce((s, r) => s + r.importance, 0) / 3;
    expect(top3Avg).toBeGreaterThan(bot3Avg);
  });
});
