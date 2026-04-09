/**
 * Suite D — Identity Persistence Score (IPS_proxy)
 *
 * Measures whether high-importance routing constraint facts (importance=9)
 * remain discoverable after many lower-importance facts are added.
 *
 * This is a PROXY for whether Wantan would re-discover delegation rules
 * after a compaction event via the mem_facts MCP tool.
 *
 * Metrics:
 *   IPS_proxy = (routing facts found in top-10 results) / (routing facts stored)
 *   IPS_L1    = (routing facts in L1 index key_facts) / (routing facts stored)
 *
 * Thresholds:
 *   IPS_proxy ≥ 0.80
 *   IPS_L1    ≥ 0.60
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestDb } from '../helpers.js';
import { SessionStore } from '../../src/db/sessions.js';
import { ObservationStore } from '../../src/db/observations.js';
import { FactStore } from '../../src/db/facts.js';
import { formatMetric } from './scorer.js';
import { ROUTING_OBSERVATIONS, FILLER_OBSERVATIONS } from './fixtures.js';
import type Database from 'better-sqlite3';

const PROJECT = 'bench-d';
const ROUTING_IMPORTANCE = 9;

describe('Suite D — Identity Persistence (IPS_proxy)', () => {
  let db: Database.Database;
  let cleanup: () => void;
  let sessions: SessionStore;
  let observations: ObservationStore;
  let factStore: FactStore;
  let routingFactIds: number[] = [];

  beforeEach(() => {
    ({ db, cleanup } = createTestDb());
    sessions = new SessionStore(db);
    observations = new ObservationStore(db);
    factStore = new FactStore(db);
    routingFactIds = [];

    const session = sessions.start({ project: PROJECT });

    // Insert routing constraint facts (importance 9)
    for (const obs of ROUTING_OBSERVATIONS) {
      const created = observations.create({
        session_id: session.id,
        type: obs.type as any,
        agent: obs.agent,
        content: obs.content,
        project: PROJECT,
      });
      const facts = factStore.extractAndStore(created);
      if (facts.length > 0) routingFactIds.push(facts[0].id);
    }

    // Insert 10 filler facts (lower importance) to populate the store
    for (const obs of FILLER_OBSERVATIONS) {
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

  it('D1: routing observations extract as preference facts at importance 9', () => {
    expect(routingFactIds.length).toBe(ROUTING_OBSERVATIONS.length);

    for (const id of routingFactIds) {
      const row = db.prepare('SELECT category, importance FROM facts WHERE id = ?').get(id) as any;
      expect(row.category).toBe('preference');
      expect(row.importance).toBe(ROUTING_IMPORTANCE);
    }
  });

  it('D2: IPS_proxy ≥ 0.80 — routing facts appear in top 10 when searching delegation terms', () => {
    const routingSet = new Set(routingFactIds);

    const results = factStore.search('delegate route orchestrate', { project: PROJECT });
    const top10Ids = results.slice(0, 10).map(r => r.id);

    const found = top10Ids.filter(id => routingSet.has(id)).length;
    const ipsProxy = found / routingFactIds.length;

    console.log(formatMetric('D2 IPS_proxy', ipsProxy, 0.80));
    console.log(`  Routing fact IDs: [${routingFactIds.join(', ')}]`);
    console.log(`  Top-10 result IDs: [${top10Ids.join(', ')}]`);
    expect(ipsProxy).toBeGreaterThanOrEqual(0.80);
  });

  it('D3: IPS_L1 ≥ 0.60 — routing facts survive into L1 index key_facts', () => {
    const index = factStore.rebuildIndex(PROJECT);
    const keyFacts: Array<{ id: number; importance: number }> = JSON.parse(index.key_facts || '[]');
    const keyFactIds = new Set(keyFacts.map(f => f.id));
    const routingSet = new Set(routingFactIds);

    const found = [...routingSet].filter(id => keyFactIds.has(id)).length;
    const ipsL1 = found / routingFactIds.length;

    console.log(formatMetric('D3 IPS_L1', ipsL1, 0.60));
    console.log(`  L1 key_fact IDs: [${[...keyFactIds].join(', ')}]`);
    expect(ipsL1).toBeGreaterThanOrEqual(0.60);
  });

  it('D4: routing facts rank above filler facts in wildcard search', () => {
    const routingSet = new Set(routingFactIds);
    const results = factStore.search('*', { project: PROJECT });

    // Find first routing and first non-routing positions
    const firstRoutingRank = results.findIndex(r => routingSet.has(r.id));
    const firstFillerRank = results.findIndex(r => !routingSet.has(r.id) && r.importance < ROUTING_IMPORTANCE);

    if (firstRoutingRank !== -1 && firstFillerRank !== -1) {
      expect(firstRoutingRank).toBeLessThan(firstFillerRank);
    }
  });

  it('D5: routing facts appear in L1 index summary text', () => {
    const index = factStore.rebuildIndex(PROJECT);
    const summary = (index.summary || '').toLowerCase();

    // At least one routing keyword should appear in the summary
    const routingKeywords = ['delegate', 'route', 'orchestrate'];
    const anyMatch = routingKeywords.some(kw => summary.includes(kw));
    expect(anyMatch).toBe(true);
  });

  it('D6: routing facts are NOT superseded by filler facts', () => {
    for (const id of routingFactIds) {
      const row = db.prepare('SELECT superseded FROM facts WHERE id = ?').get(id) as any;
      expect(row.superseded).toBe(0);
    }
  });

  it('D7: agent-scoped search returns routing facts for wantan', () => {
    const results = factStore.search('*', { project: PROJECT, agentScope: 'wantan' });
    // wantan scope maps to preference/decision categories per AGENT_SCOPE_MAP (if defined)
    // At minimum: the routing preference facts should be accessible
    // If agentScope is not defined for wantan, this returns all facts — routing should still be there
    const routingSet = new Set(routingFactIds);
    const foundRouting = results.some(r => routingSet.has(r.id));
    expect(foundRouting).toBe(true);
  });
});
