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
      const { query, project, category, min_importance, limit } = req.query;
      if (!query) {
        res.status(400).json({ error: 'Missing required parameter: query' });
        return;
      }
      const results = factStore.search(query as string, {
        project: project as string,
        category: category as any,
        minImportance: min_importance ? parseInt(min_importance as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
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
