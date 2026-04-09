/**
 * wantan-mem Benchmark Scorer — Path A (Pure SQLite, no LLM judge)
 *
 * Metrics implemented:
 *   SubEM     — Substring Exact Match (Factory.ai methodology, deterministic)
 *   Recall@K  — fraction of gold fact IDs found in top-K results
 *   MRR       — Mean Reciprocal Rank for a single gold ID
 *   L1HR      — L1 Hit Rate: gold content present in always-loaded index
 *   CRR       — Contradiction Resolution Rate (truth maintenance)
 *   CCR       — Compress Content Ratio (storage efficiency)
 *   NFR       — Noise Filter Rate (signal extraction quality)
 *
 * No API keys required. All scoring is deterministic string matching.
 */

/** SubEM: true if ALL goldTerms appear as substrings of candidate (case-insensitive, AND). */
export function subEM(candidate: string, goldTerms: string[]): boolean {
  const lower = candidate.toLowerCase();
  return goldTerms.every(term => lower.includes(term.toLowerCase()));
}

/**
 * Recall@K: fraction of goldIds found within the top-K resultIds.
 * 0 if goldIds is empty. Each gold ID is counted at most once.
 */
export function recallAtK(resultIds: number[], goldIds: number[], k: number): number {
  if (goldIds.length === 0) return 0;
  const topK = new Set(resultIds.slice(0, k));
  const found = goldIds.filter(id => topK.has(id)).length;
  return found / goldIds.length;
}

/**
 * Mean Reciprocal Rank for a single gold ID in resultIds.
 * Returns 1/(rank+1) where rank is 0-based; 0 if not found.
 */
export function mrr(resultIds: number[], goldId: number): number {
  const idx = resultIds.indexOf(goldId);
  return idx === -1 ? 0 : 1 / (idx + 1);
}

/**
 * L1 Hit Rate: fraction of goldTermSets where ALL terms appear in indexSummary.
 * goldTermSets is an array of term arrays (each is an AND group).
 */
export function l1HitRate(indexSummary: string, goldTermSets: string[][]): number {
  if (goldTermSets.length === 0) return 0;
  const lower = indexSummary.toLowerCase();
  const hits = goldTermSets.filter(terms =>
    terms.every(t => lower.includes(t.toLowerCase()))
  ).length;
  return hits / goldTermSets.length;
}

/**
 * Contradiction Resolution Rate: fraction of expectedSupersededIds that are
 * actually marked superseded=1 in the database.
 */
export function crr(actualSupersededIds: Set<number>, expectedSupersededIds: number[]): number {
  if (expectedSupersededIds.length === 0) return 0;
  const resolved = expectedSupersededIds.filter(id => actualSupersededIds.has(id)).length;
  return resolved / expectedSupersededIds.length;
}

/**
 * Compress Content Ratio: total_fact_chars / total_signal_obs_chars.
 * Lower = more compressed. Target < 0.70.
 */
export function ccr(totalFactChars: number, totalSignalObsChars: number): number {
  return totalSignalObsChars > 0 ? totalFactChars / totalSignalObsChars : 0;
}

/**
 * Noise Filter Rate: fraction of noise observations that produced 0 facts.
 * Higher = better (target 1.0 = all noise filtered).
 */
export function noiseFilterRate(filteredCount: number, totalNoiseCount: number): number {
  return totalNoiseCount > 0 ? filteredCount / totalNoiseCount : 0;
}

/**
 * Average estimated tokens per stored fact.
 * Uses chars/4 rule-of-thumb for English text.
 */
export function avgTokensPerFact(facts: Array<{ content: string }>): number {
  if (facts.length === 0) return 0;
  const total = facts.reduce((sum, f) => sum + Math.ceil(f.content.length / 4), 0);
  return total / facts.length;
}

/** Format a metric for test output: "metricName = value (threshold OP target)" */
export function formatMetric(
  name: string, value: number, target: number, op: '>=' | '<=' = '>='
): string {
  const pass = op === '>=' ? value >= target : value <= target;
  return `${name} = ${value.toFixed(3)} (${op}${target} → ${pass ? 'PASS' : 'FAIL'})`;
}
