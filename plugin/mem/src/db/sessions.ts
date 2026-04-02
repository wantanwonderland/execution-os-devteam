import type Database from 'better-sqlite3';
import type { Session, CreateSessionInput } from '../types.js';

export class SessionStore {
  constructor(private db: Database.Database) {}

  start(input: CreateSessionInput): Session {
    const stmt = this.db.prepare(
      `INSERT INTO sessions (project, agent)
       VALUES (@project, @agent)
       RETURNING *`
    );
    return stmt.get({
      project: input.project,
      agent: input.agent || 'wantan'
    }) as Session;
  }

  end(id: number, summary?: string): Session {
    const stmt = this.db.prepare(
      `UPDATE sessions SET ended_at = datetime('now'), summary = @summary
       WHERE id = @id
       RETURNING *`
    );
    return stmt.get({ id, summary: summary || null }) as Session;
  }

  get(id: number): Session | undefined {
    return this.db.prepare('SELECT * FROM sessions WHERE id = ?').get(id) as Session | undefined;
  }

  getActive(): Session | undefined {
    return this.db
      .prepare('SELECT * FROM sessions WHERE ended_at IS NULL ORDER BY id DESC LIMIT 1')
      .get() as Session | undefined;
  }

  list(limit = 20): Session[] {
    return this.db
      .prepare('SELECT * FROM sessions ORDER BY id DESC LIMIT ?')
      .all(limit) as Session[];
  }
}
