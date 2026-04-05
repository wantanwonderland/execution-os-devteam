import { Router, type Request, type Response } from 'express';
import type Database from 'better-sqlite3';
import { SessionStore } from '../db/sessions.js';
import { ObservationStore } from '../db/observations.js';
import { SearchEngine } from '../db/search.js';
import { FactStore } from '../db/facts.js';

export function createRoutes(db: Database.Database): Router {
  const router = Router();
  const sessionStore = new SessionStore(db);
  const observationStore = new ObservationStore(db);
  const searchEngine = new SearchEngine(db);
  const factStore = new FactStore(db);

  // Health check
  router.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', uptime: process.uptime() });
  });

  // Observe — ingest a new observation
  router.post('/api/observe', (req: Request, res: Response) => {
    try {
      const { session_id, type, agent, content, metadata, project } = req.body;
      if (!type || !agent || !content || !project) {
        res.status(400).json({ error: 'Missing required fields: type, agent, content, project' });
        return;
      }

      // Auto-create session if none provided
      let sid = session_id;
      if (!sid) {
        const active = sessionStore.getActive();
        if (active) {
          sid = active.id;
        } else {
          const newSession = sessionStore.start({ project, agent });
          sid = newSession.id;
        }
      }

      const obs = observationStore.create({ session_id: sid, type, agent, content, metadata, project });

      // Compress on write: extract facts immediately (SimpleMem pattern)
      const facts = factStore.extractAndStore(obs);

      res.status(201).json({ ...obs, facts_extracted: facts.length });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Search — FTS5 full-text search (Layer 1)
  router.get('/api/search', (req: Request, res: Response) => {
    try {
      const { query, limit, project, agent, type, offset } = req.query;
      if (!query) {
        res.status(400).json({ error: 'Missing required parameter: query' });
        return;
      }
      const results = searchEngine.search(query as string, {
        limit: limit ? parseInt(limit as string) : undefined,
        project: project as string,
        agent: agent as string,
        type: type as string,
        offset: offset ? parseInt(offset as string) : undefined
      });
      res.json({ content: [{ type: 'text', text: formatSearchResults(results) }] });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Timeline — chronological context around an anchor (Layer 2)
  router.get('/api/timeline', (req: Request, res: Response) => {
    try {
      const { anchor, depth_before, depth_after } = req.query;
      if (!anchor) {
        res.status(400).json({ error: 'Missing required parameter: anchor' });
        return;
      }
      const entries = observationStore.timeline(
        parseInt(anchor as string),
        depth_before ? parseInt(depth_before as string) : 3,
        depth_after ? parseInt(depth_after as string) : 3
      );
      res.json({ content: [{ type: 'text', text: formatTimeline(entries, parseInt(anchor as string)) }] });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Batch — fetch full details by IDs (Layer 3)
  router.post('/api/batch', (req: Request, res: Response) => {
    try {
      const { ids } = req.body;
      if (!ids || !Array.isArray(ids)) {
        res.status(400).json({ error: 'Missing required field: ids (array)' });
        return;
      }
      const observations = observationStore.getByIds(ids);
      res.json(observations);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Agent query — what has a specific agent done recently (Layer 4)
  router.get('/api/agents', (req: Request, res: Response) => {
    try {
      const { agent, days, project } = req.query;
      if (!agent) {
        res.status(400).json({ error: 'Missing required parameter: agent' });
        return;
      }
      const results = searchEngine.agentQuery(
        agent as string,
        days ? parseInt(days as string) : 7,
        project as string
      );
      res.json({ content: [{ type: 'text', text: formatSearchResults(results) }] });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Sessions
  router.post('/api/sessions/start', (req: Request, res: Response) => {
    try {
      const { project, agent } = req.body;
      const session = sessionStore.start({ project: project || 'default', agent });
      res.status(201).json(session);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.post('/api/sessions/end', (req: Request, res: Response) => {
    try {
      const { summary } = req.body;
      const active = sessionStore.getActive();
      if (!active) {
        res.status(404).json({ error: 'No active session' });
        return;
      }
      const session = sessionStore.end(active.id, summary);

      // Auto-rebuild L1 memory index on session end
      try {
        factStore.rebuildIndex(active.project);
      } catch {
        // Non-fatal — don't fail session end if index rebuild fails
      }

      res.json(session);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.post('/api/sessions/checkpoint', (req: Request, res: Response) => {
    try {
      const active = sessionStore.getActive();
      if (!active) {
        res.json({ message: 'No active session to checkpoint' });
        return;
      }
      const recent = observationStore.listRecent(5, active.project);
      res.json({ session: active, recent_observations: recent.length });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Prune — summarize and delete old observations
  router.post('/api/prune', (req: Request, res: Response) => {
    try {
      const older_than_days = req.body?.older_than_days ?? 90;
      if (typeof older_than_days !== 'number' || older_than_days <= 0) {
        res.status(400).json({ error: 'older_than_days must be a positive number' });
        return;
      }
      const result = observationStore.prune(older_than_days);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Export — dump all observations as JSON
  router.get('/api/export', (req: Request, res: Response) => {
    try {
      const project = req.query.project as string | undefined;
      const json = observationStore.exportAll(project);
      res.type('application/json').send(json);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Import — restore observations from exported JSON
  router.post('/api/import', (req: Request, res: Response) => {
    try {
      const body = req.body;
      if (!body || !Array.isArray(body.observations)) {
        res.status(400).json({ error: 'Invalid import format: missing observations array' });
        return;
      }
      const imported = observationStore.importData(JSON.stringify(body));
      res.json({ imported });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Stats — database health and distribution
  router.get('/api/stats', (req: Request, res: Response) => {
    try {
      const total_observations = (db.prepare('SELECT COUNT(*) as count FROM observations').get() as { count: number }).count;
      const total_sessions = (db.prepare('SELECT COUNT(*) as count FROM sessions').get() as { count: number }).count;
      const oldest_observation = (db.prepare('SELECT MIN(created_at) as val FROM observations').get() as { val: string | null }).val;
      const newest_observation = (db.prepare('SELECT MAX(created_at) as val FROM observations').get() as { val: string | null }).val;

      const agentRows = db.prepare('SELECT agent, COUNT(*) as count FROM observations GROUP BY agent').all() as { agent: string; count: number }[];
      const observations_by_agent: Record<string, number> = {};
      for (const row of agentRows) observations_by_agent[row.agent] = row.count;

      const typeRows = db.prepare('SELECT type, COUNT(*) as count FROM observations GROUP BY type').all() as { type: string; count: number }[];
      const observations_by_type: Record<string, number> = {};
      for (const row of typeRows) observations_by_type[row.type] = row.count;

      const pageSize = (db.pragma('page_size') as { page_size: number }[])[0].page_size;
      const pageCount = (db.pragma('page_count') as { page_count: number }[])[0].page_count;
      const db_size_bytes = pageSize * pageCount;

      res.json({
        total_observations,
        total_sessions,
        oldest_observation,
        newest_observation,
        observations_by_agent,
        observations_by_type,
        db_size_bytes
      });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // --- Fact endpoints ---

  // Search facts (much more efficient than searching raw observations)
  router.get('/api/facts/search', (req: Request, res: Response) => {
    try {
      const { query, project, category, min_importance, limit, agent_scope } = req.query;
      if (!query) {
        res.status(400).json({ error: 'Missing required parameter: query' });
        return;
      }
      const results = factStore.search(query as string, {
        project: project as string,
        category: category as any,
        minImportance: min_importance ? parseInt(min_importance as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        agentScope: agent_scope as string,
      });

      // Record access for retrieved facts (MemOS access-weighted ranking)
      for (const fact of results) {
        factStore.recordAccess(fact.id);
      }

      res.json({ content: [{ type: 'text', text: formatFactResults(results) }] });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Get L1 memory index for a project (~500 tokens, always loaded)
  router.get('/api/facts/index', (req: Request, res: Response) => {
    try {
      const { project } = req.query;
      if (!project) {
        res.status(400).json({ error: 'Missing required parameter: project' });
        return;
      }
      const index = factStore.getIndex(project as string);
      if (!index) {
        res.json({ content: [{ type: 'text', text: `No memory index found for project "${project}". Use rebuild-index to create one.` }] });
        return;
      }
      res.json({ content: [{ type: 'text', text: formatMemoryIndex(index) }] });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Rebuild memory index for a project
  router.post('/api/facts/rebuild-index', (req: Request, res: Response) => {
    try {
      const { project } = req.body;
      if (!project) {
        res.status(400).json({ error: 'Missing required field: project' });
        return;
      }
      const index = factStore.rebuildIndex(project);
      res.json(index);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // --- Pruning endpoints ---

  // Prune old observations (creates weekly digests, deletes originals)
  router.post('/api/prune', (req: Request, res: Response) => {
    try {
      const { older_than_days = 14 } = req.body;
      const result = observationStore.prune(older_than_days);
      res.json({ status: 'ok', ...result });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Clean up orphaned worktree project data
  router.post('/api/prune/worktrees', (_req: Request, res: Response) => {
    try {
      // Delete observations from agent-* worktree projects (ephemeral, no future value)
      const result = db.prepare(
        `DELETE FROM observations WHERE project LIKE 'agent-%'`
      ).run();
      // Delete corresponding facts
      const factResult = db.prepare(
        `DELETE FROM facts WHERE project LIKE 'agent-%'`
      ).run();
      // Delete orphaned memory indexes
      db.prepare(`DELETE FROM memory_index WHERE project LIKE 'agent-%'`).run();
      res.json({
        status: 'ok',
        observations_deleted: result.changes,
        facts_deleted: factResult.changes,
      });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // --- Episode endpoints (past successful task solutions) ---

  // Search episodes
  router.get('/api/episodes/search', (req: Request, res: Response) => {
    try {
      const { query, agent, project, limit } = req.query;
      if (!query) {
        res.status(400).json({ error: 'Missing required parameter: query' });
        return;
      }

      // Sanitize FTS query
      const cleaned = (query as string).replace(/[*"(){}[\]^~:]/g, '').trim();
      const words = cleaned.split(/\s+/).filter(w => w.length > 0);
      const ftsQuery = words.length <= 1 ? (words[0] || '""') : words.join(' OR ');

      let sql = `
        SELECT e.id, e.agent, e.task_summary, e.solution_summary, e.files_touched,
               e.project, e.created_at, e.retrieval_count, fts.rank
        FROM episodes_fts fts
        JOIN episodes e ON e.id = fts.rowid
        WHERE episodes_fts MATCH @query
      `;
      const params: Record<string, unknown> = { query: ftsQuery, limit: limit ? parseInt(limit as string) : 5 };

      if (agent) {
        sql += ' AND e.agent = @agent';
        params.agent = agent;
      }
      if (project) {
        sql += ' AND e.project = @project';
        params.project = project;
      }
      sql += ' ORDER BY e.retrieval_count DESC, fts.rank LIMIT @limit';

      const results = db.prepare(sql).all(params);

      // Bump retrieval counts
      for (const r of results as any[]) {
        db.prepare('UPDATE episodes SET retrieval_count = retrieval_count + 1 WHERE id = ?').run(r.id);
      }

      const text = (results as any[]).length === 0
        ? 'No matching episodes found. This task has not been solved before.'
        : (results as any[]).map((r: any) =>
            `[Episode #${r.id}] Agent: ${r.agent} | ${r.task_summary}\n` +
            `Solution: ${r.solution_summary}\n` +
            `Files: ${r.files_touched || 'N/A'} | Retrieved: ${r.retrieval_count}x`
          ).join('\n---\n');

      res.json({ content: [{ type: 'text', text }] });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Store episode
  router.post('/api/episodes', (req: Request, res: Response) => {
    try {
      const { agent, task_summary, solution_summary, files_touched, project } = req.body;
      if (!agent || !task_summary || !solution_summary || !project) {
        res.status(400).json({ error: 'Missing required fields: agent, task_summary, solution_summary, project' });
        return;
      }

      // Dedup via content hash
      const { createHash } = require('crypto');
      const hash = createHash('sha256').update(`${agent}:${task_summary}:${solution_summary}`).digest('hex');
      const existing = db.prepare('SELECT id FROM episodes WHERE content_hash = ?').get(hash);
      if (existing) {
        res.json({ status: 'duplicate', message: 'Episode already stored' });
        return;
      }

      // Ensure episodes table exists (first-time migration)
      db.exec(`CREATE TABLE IF NOT EXISTS episodes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        agent TEXT NOT NULL,
        task_summary TEXT NOT NULL,
        solution_summary TEXT NOT NULL,
        files_touched TEXT,
        project TEXT NOT NULL,
        success INTEGER DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        retrieval_count INTEGER DEFAULT 0,
        content_hash TEXT
      )`);
      db.exec(`CREATE VIRTUAL TABLE IF NOT EXISTS episodes_fts USING fts5(
        task_summary, solution_summary, agent, project,
        content=episodes, content_rowid=id
      )`);
      db.exec(`CREATE TRIGGER IF NOT EXISTS episodes_ai AFTER INSERT ON episodes BEGIN
        INSERT INTO episodes_fts(rowid, task_summary, solution_summary, agent, project)
        VALUES (new.id, new.task_summary, new.solution_summary, new.agent, new.project);
      END`);

      const episode = db.prepare(
        `INSERT INTO episodes (agent, task_summary, solution_summary, files_touched, project, content_hash)
         VALUES (@agent, @task_summary, @solution_summary, @files_touched, @project, @hash)
         RETURNING *`
      ).get({
        agent,
        task_summary,
        solution_summary,
        files_touched: files_touched ? JSON.stringify(files_touched) : null,
        project,
        hash,
      });

      res.status(201).json(episode);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // --- SDD State endpoints ---

  // Get current SDD pipeline state
  router.get('/api/sdd-state', (req: Request, res: Response) => {
    try {
      const { project } = req.query;
      const rows = db.prepare(
        `SELECT * FROM sdd_state WHERE project = ? ORDER BY updated_at DESC LIMIT 1`
      ).all(project || 'default') as any[];
      if (rows.length === 0) {
        res.json({ active: false, message: 'No active SDD pipeline' });
        return;
      }
      const row = rows[0];
      res.json({
        active: true,
        id: row.id,
        project: row.project,
        task: row.task,
        current_phase: row.current_phase,
        ui_classification: row.ui_classification,
        gates: JSON.parse(row.gates || '{}'),
        phases: JSON.parse(row.phases || '{}'),
        created_at: row.created_at,
        updated_at: row.updated_at,
      });
    } catch (err) {
      // Table might not exist yet
      res.json({ active: false, message: 'SDD state not initialized' });
    }
  });

  // Create or update SDD pipeline state
  router.post('/api/sdd-state', (req: Request, res: Response) => {
    try {
      const { project, task, current_phase, ui_classification, gates, phases } = req.body;
      if (!project || !task) {
        res.status(400).json({ error: 'Missing required fields: project, task' });
        return;
      }

      // Ensure table exists
      db.exec(`
        CREATE TABLE IF NOT EXISTS sdd_state (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          project TEXT NOT NULL,
          task TEXT NOT NULL,
          current_phase REAL NOT NULL DEFAULT 1,
          ui_classification TEXT DEFAULT 'NO',
          gates TEXT DEFAULT '{}',
          phases TEXT DEFAULT '{}',
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now'))
        )
      `);

      // Upsert by project+task
      const existing = db.prepare(
        `SELECT id FROM sdd_state WHERE project = ? AND task = ?`
      ).get(project, task) as { id: number } | undefined;

      if (existing) {
        db.prepare(`
          UPDATE sdd_state SET
            current_phase = ?,
            ui_classification = ?,
            gates = ?,
            phases = ?,
            updated_at = datetime('now')
          WHERE id = ?
        `).run(
          current_phase || 1,
          ui_classification || 'NO',
          JSON.stringify(gates || {}),
          JSON.stringify(phases || {}),
          existing.id
        );
        res.json({ updated: true, id: existing.id });
      } else {
        const result = db.prepare(`
          INSERT INTO sdd_state (project, task, current_phase, ui_classification, gates, phases)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(
          project,
          task,
          current_phase || 1,
          ui_classification || 'NO',
          JSON.stringify(gates || {}),
          JSON.stringify(phases || {})
        );
        res.status(201).json({ created: true, id: result.lastInsertRowid });
      }
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // List SDD pipeline history for a project
  router.get('/api/sdd-state/history', (req: Request, res: Response) => {
    try {
      const { project, limit } = req.query;
      // Ensure table exists
      db.exec(`
        CREATE TABLE IF NOT EXISTS sdd_state (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          project TEXT NOT NULL,
          task TEXT NOT NULL,
          current_phase REAL NOT NULL DEFAULT 1,
          ui_classification TEXT DEFAULT 'NO',
          gates TEXT DEFAULT '{}',
          phases TEXT DEFAULT '{}',
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now'))
        )
      `);
      const rows = db.prepare(
        `SELECT * FROM sdd_state WHERE project = ? ORDER BY updated_at DESC LIMIT ?`
      ).all(project || 'default', limit ? parseInt(limit as string) : 10) as any[];
      res.json(rows.map(r => ({
        ...r,
        gates: JSON.parse(r.gates || '{}'),
        phases: JSON.parse(r.phases || '{}'),
      })));
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // List categories with counts for a project
  router.get('/api/facts/categories', (req: Request, res: Response) => {
    try {
      const { project } = req.query;
      const categories = factStore.getCategoryCounts(project as string);
      res.json(categories);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  return router;
}

function formatFactResults(results: any[]): string {
  if (results.length === 0) return 'No facts found.';
  const header = '| ID | Category | Importance | Content | Project | Date |\n|-----|----------|------------|---------|---------|------|\n';
  const rows = results.map((r: any) =>
    `| ${r.id} | ${r.category} | ${r.importance} | ${r.content.substring(0, 80).replace(/\n/g, ' ')} | ${r.project} | ${r.created_at} |`
  ).join('\n');
  return header + rows;
}

function formatMemoryIndex(index: any): string {
  const parts = [
    `# Memory Index: ${index.project}`,
    `Last updated: ${index.last_updated}`,
    `Facts: ${index.total_facts} | Observations: ${index.total_observations}`,
    '',
    '## Summary',
    index.summary,
  ];

  if (index.key_facts) {
    try {
      const keyFacts = JSON.parse(index.key_facts);
      parts.push('', '## Key Facts');
      for (const f of keyFacts) {
        parts.push(`- [${f.category}] (importance: ${f.importance}) ${f.content}`);
      }
    } catch {
      // skip malformed key_facts
    }
  }

  return parts.join('\n');
}

function formatSearchResults(results: any[]): string {
  if (results.length === 0) return 'No results found.';
  const header = '| ID | Type | Agent | Snippet | Date |\n|-----|------|-------|---------|------|\n';
  const rows = results.map(r =>
    `| ${r.id} | ${r.type} | ${r.agent} | ${r.snippet.replace(/\n/g, ' ')} | ${r.created_at} |`
  ).join('\n');
  return header + rows;
}

function formatTimeline(entries: any[], anchorId: number): string {
  if (entries.length === 0) return 'No timeline entries found.';
  return entries.map(e => {
    const marker = e.id === anchorId ? '>>> ' : '    ';
    return `${marker}[${e.id}] ${e.created_at} | ${e.agent} (${e.type}): ${e.content.substring(0, 100)}`;
  }).join('\n');
}
