import type Database from 'better-sqlite3';
import type { Observation, CreateObservationInput } from '../types.js';

export class ObservationStore {
  constructor(private db: Database.Database) {}

  create(input: CreateObservationInput): Observation {
    const stmt = this.db.prepare(
      `INSERT INTO observations (session_id, type, agent, content, metadata, project)
       VALUES (@session_id, @type, @agent, @content, @metadata, @project)
       RETURNING *`
    );
    return stmt.get({
      ...input,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null
    }) as Observation;
  }

  get(id: number): Observation | undefined {
    return this.db
      .prepare('SELECT * FROM observations WHERE id = ?')
      .get(id) as Observation | undefined;
  }

  getByIds(ids: number[]): Observation[] {
    if (ids.length === 0) return [];
    const placeholders = ids.map(() => '?').join(',');
    return this.db
      .prepare(`SELECT * FROM observations WHERE id IN (${placeholders}) ORDER BY created_at ASC`)
      .all(...ids) as Observation[];
  }

  listBySession(sessionId: number): Observation[] {
    return this.db
      .prepare('SELECT * FROM observations WHERE session_id = ? ORDER BY created_at ASC')
      .all(sessionId) as Observation[];
  }

  listByAgent(agent: string, days = 7, limit = 50): Observation[] {
    return this.db
      .prepare(
        `SELECT * FROM observations
         WHERE agent = ? AND created_at > datetime('now', ?)
         ORDER BY created_at DESC LIMIT ?`
      )
      .all(agent, `-${days} days`, limit) as Observation[];
  }

  listRecent(limit = 20, project?: string): Observation[] {
    if (project) {
      return this.db
        .prepare('SELECT * FROM observations WHERE project = ? ORDER BY id DESC LIMIT ?')
        .all(project, limit) as Observation[];
    }
    return this.db
      .prepare('SELECT * FROM observations ORDER BY id DESC LIMIT ?')
      .all(limit) as Observation[];
  }

  timeline(anchorId: number, before = 3, after = 3): Observation[] {
    const anchor = this.get(anchorId);
    if (!anchor) return [];

    const beforeRows = this.db
      .prepare(
        `SELECT * FROM observations
         WHERE id < ? AND project = ?
         ORDER BY id DESC LIMIT ?`
      )
      .all(anchorId, anchor.project, before) as Observation[];

    const afterRows = this.db
      .prepare(
        `SELECT * FROM observations
         WHERE id > ? AND project = ?
         ORDER BY id ASC LIMIT ?`
      )
      .all(anchorId, anchor.project, after) as Observation[];

    return [...beforeRows.reverse(), anchor, ...afterRows];
  }

  prune(olderThanDays: number): { pruned: number; summarized: number } {
    // Fetch all observations older than the cutoff
    const old = this.db
      .prepare(
        `SELECT * FROM observations
         WHERE created_at < datetime('now', ?)
         ORDER BY created_at ASC`
      )
      .all(`-${olderThanDays} days`) as Observation[];

    if (old.length === 0) return { pruned: 0, summarized: 0 };

    // Group by ISO week + agent
    const groups = new Map<string, Observation[]>();
    for (const obs of old) {
      const date = new Date(obs.created_at);
      // ISO week number
      const startOfYear = new Date(date.getFullYear(), 0, 1);
      const week = Math.ceil(
        ((date.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7
      );
      const key = `${date.getFullYear()}-W${String(week).padStart(2, '0')}:${obs.agent}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(obs);
    }

    let summarized = 0;

    // Use a transaction for atomicity
    const doWork = this.db.transaction(() => {
      for (const [key, group] of groups) {
        const agent = group[0].agent;
        const project = group[0].project;
        const session_id = group[0].session_id;

        // Build top 3 content snippets
        const snippets = group
          .slice(0, 3)
          .map(o => o.content.substring(0, 60).replace(/\n/g, ' '));
        const topTopics = snippets.join('; ');

        const content = `Weekly digest: ${group.length} observations from ${agent}. Key topics: ${topTopics}`;

        this.db
          .prepare(
            `INSERT INTO observations (session_id, type, agent, content, metadata, project)
             VALUES (?, ?, ?, ?, ?, ?)`
          )
          .run(session_id, 'insight', agent, content, null, project);

        summarized++;
      }

      // Delete original old observations
      const ids = old.map(o => o.id);
      const placeholders = ids.map(() => '?').join(',');
      this.db
        .prepare(`DELETE FROM observations WHERE id IN (${placeholders})`)
        .run(...ids);
    });

    doWork();

    return { pruned: old.length, summarized };
  }

  exportAll(project?: string): string {
    const observations = project
      ? (this.db
          .prepare('SELECT * FROM observations WHERE project = ? ORDER BY id ASC')
          .all(project) as Observation[])
      : (this.db
          .prepare('SELECT * FROM observations ORDER BY id ASC')
          .all() as Observation[]);

    return JSON.stringify({
      exported_at: new Date().toISOString(),
      project: project ?? null,
      count: observations.length,
      observations
    });
  }

  importData(jsonStr: string): number {
    const data = JSON.parse(jsonStr) as {
      observations: Observation[];
    };

    if (!Array.isArray(data.observations)) {
      throw new Error('Invalid import format: missing observations array');
    }

    let imported = 0;

    const doImport = this.db.transaction(() => {
      for (const obs of data.observations) {
        // Skip if ID already exists
        const existing = this.db
          .prepare('SELECT id FROM observations WHERE id = ?')
          .get(obs.id);
        if (existing) continue;

        this.db
          .prepare(
            `INSERT INTO observations (id, session_id, type, agent, content, metadata, created_at, project)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .run(
            obs.id,
            obs.session_id,
            obs.type,
            obs.agent,
            obs.content,
            obs.metadata ?? null,
            obs.created_at,
            obs.project
          );
        imported++;
      }
    });

    doImport();
    return imported;
  }
}
