import type Database from 'better-sqlite3';
import type { SearchResult } from '../types.js';

export class SearchEngine {
  constructor(private db: Database.Database) {}

  /**
   * Sanitize a query string for FTS5 MATCH.
   * Converts multi-word queries to OR terms so any matching word returns results.
   * Strips FTS5 special characters to prevent syntax errors.
   */
  private sanitizeFtsQuery(query: string): string {
    const cleaned = query.replace(/[*"(){}[\]^~:]/g, '').trim();
    const words = cleaned.split(/\s+/).filter(w => w.length > 0);
    if (words.length === 0) return '""';
    if (words.length === 1) return words[0];
    return words.join(' OR ');
  }

  /**
   * Layer 1: Search — returns compact index with IDs (~50-100 tokens/result)
   */
  search(query: string, options: {
    limit?: number;
    project?: string;
    agent?: string;
    type?: string;
    offset?: number;
  } = {}): SearchResult[] {
    const { limit = 20, project, agent, type, offset = 0 } = options;

    // If query is '*' (match-all), bypass FTS and use direct table scan with filters
    if (query === '*') {
      let sql = `
        SELECT
          id, type, agent,
          substr(content, 1, 120) as snippet,
          created_at, project, 0 as rank
        FROM observations
        WHERE 1=1
      `;
      const params: Record<string, unknown> = { limit, offset };

      if (project) {
        sql += ' AND project = @project';
        params.project = project;
      }
      if (agent) {
        sql += ' AND agent = @agent';
        params.agent = agent;
      }
      if (type) {
        sql += ' AND type = @type';
        params.type = type;
      }

      sql += ' ORDER BY id DESC LIMIT @limit OFFSET @offset';
      return this.db.prepare(sql).all(params) as SearchResult[];
    }

    const ftsQuery = this.sanitizeFtsQuery(query);
    let sql = `
      SELECT
        o.id,
        o.type,
        o.agent,
        substr(o.content, 1, 120) as snippet,
        o.created_at,
        o.project,
        rank
      FROM observations_fts fts
      JOIN observations o ON o.id = fts.rowid
      WHERE observations_fts MATCH @query
    `;
    const params: Record<string, unknown> = { query: ftsQuery, limit, offset };

    if (project) {
      sql += ' AND o.project = @project';
      params.project = project;
    }
    if (agent) {
      sql += ' AND o.agent = @agent';
      params.agent = agent;
    }
    if (type) {
      sql += ' AND o.type = @type';
      params.type = type;
    }

    sql += ' ORDER BY rank LIMIT @limit OFFSET @offset';

    return this.db.prepare(sql).all(params) as SearchResult[];
  }

  /**
   * Layer 4: Agent-specific query — "What has Levi flagged this week?"
   */
  agentQuery(agent: string, days = 7, project?: string): SearchResult[] {
    let sql = `
      SELECT
        id, type, agent,
        substr(content, 1, 120) as snippet,
        created_at, project, 0 as rank
      FROM observations
      WHERE agent = @agent AND created_at > datetime('now', @window)
    `;
    const params: Record<string, unknown> = { agent, window: `-${days} days` };

    if (project) {
      sql += ' AND project = @project';
      params.project = project;
    }

    sql += ' ORDER BY created_at DESC LIMIT 50';

    return this.db.prepare(sql).all(params) as SearchResult[];
  }

  /**
   * Get unprocessed events (for Wantan's event bus)
   */
  getUnprocessedEvents(): SearchResult[] {
    return this.db
      .prepare(
        `SELECT
          id, type, agent,
          substr(content, 1, 120) as snippet,
          created_at, project, 0 as rank
         FROM observations
         WHERE type = 'event'
           AND json_extract(metadata, '$.processed') IS NULL
         ORDER BY created_at ASC`
      )
      .all() as SearchResult[];
  }

  /**
   * Mark an event as processed
   */
  markEventProcessed(id: number): void {
    const obs = this.db.prepare('SELECT metadata FROM observations WHERE id = ?').get(id) as { metadata: string | null } | undefined;
    if (!obs) return;

    const meta = obs.metadata ? JSON.parse(obs.metadata) : {};
    meta.processed = true;
    meta.processed_at = new Date().toISOString();

    this.db.prepare('UPDATE observations SET metadata = ? WHERE id = ?').run(JSON.stringify(meta), id);
  }
}
