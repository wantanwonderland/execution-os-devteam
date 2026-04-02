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
