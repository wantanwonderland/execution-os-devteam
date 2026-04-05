export interface Session {
  id: number;
  project: string;
  started_at: string;
  ended_at: string | null;
  summary: string | null;
  agent: string;
}

export interface Observation {
  id: number;
  session_id: number;
  type: ObservationType;
  agent: string;
  content: string;
  metadata: string | null;
  created_at: string;
  project: string;
}

export type ObservationType = 'tool_use' | 'decision' | 'error' | 'insight' | 'review' | 'event';

export interface ObservationMetadata {
  repo?: string;
  branch?: string;
  pr_number?: number;
  file_path?: string;
  severity?: 'critical' | 'high' | 'medium' | 'low' | 'info';
  triggers?: string[];
  [key: string]: unknown;
}

export interface SearchResult {
  id: number;
  type: string;
  agent: string;
  snippet: string;
  created_at: string;
  project: string;
  rank: number;
}

export interface TimelineEntry {
  id: number;
  type: string;
  agent: string;
  content: string;
  metadata: string | null;
  created_at: string;
  project: string;
}

export interface CreateObservationInput {
  session_id: number;
  type: ObservationType;
  agent: string;
  content: string;
  metadata?: ObservationMetadata;
  project: string;
}

export interface CreateSessionInput {
  project: string;
  agent?: string;
}

// --- Fact extraction types (SimpleMem/Mem0/Memori patterns) ---

export interface Fact {
  id: number;
  source_observation_id: number;
  category: FactCategory;
  content: string;
  importance: number;
  project: string;
  agent: string | null;
  tags: string | null;
  created_at: string;
  last_accessed_at: string | null;
  access_count: number;
  content_hash: string;
}

export type FactCategory =
  | 'decision'
  | 'pattern'
  | 'preference'
  | 'learned'
  | 'blocker'
  | 'architecture'
  | 'error'
  | 'security';

export interface MemoryIndex {
  id: number;
  project: string;
  summary: string;
  key_facts: string | null;
  last_updated: string;
  total_facts: number;
  total_observations: number;
}

export interface FactSearchOptions {
  project?: string;
  category?: FactCategory;
  minImportance?: number;
  limit?: number;
  agentScope?: string;
}

/**
 * Agent-scoped category mapping.
 * Each agent only retrieves fact categories relevant to their role.
 * Reduces per-agent token consumption by 60-70% (Google ADK research).
 */
export const AGENT_SCOPE_MAP: Record<string, FactCategory[]> = {
  conan: ['architecture', 'error', 'decision', 'blocker'],
  killua: ['error', 'architecture', 'blocker'],
  diablo: ['architecture', 'pattern', 'error', 'decision'],
  itachi: ['security', 'error'],
  shikamaru: ['architecture', 'error', 'blocker'],
  wiz: ['learned', 'decision', 'pattern'],
  kazuma: ['decision', 'pattern'],
  rohan: ['pattern', 'preference', 'decision'],
  l: ['decision', 'architecture', 'pattern'],
  senku: ['architecture', 'decision', 'pattern'],
  yomi: ['learned', 'architecture', 'decision'],
  chiyo: ['learned', 'architecture', 'decision'],
  sai: ['architecture', 'learned'],
  byakuya: ['pattern', 'decision'],
};

export interface FactSearchResult {
  id: number;
  category: string;
  content: string;
  importance: number;
  project: string;
  agent: string | null;
  tags: string | null;
  created_at: string;
  access_count: number;
  rank?: number;
}
