import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

const WORKER_URL = `http://localhost:${process.env.WANTAN_MEM_PORT || '37778'}`;

async function callWorker(path: string, method = 'GET', body?: any): Promise<any> {
  const url = `${WORKER_URL}${path}`;
  const options: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (body) options.body = JSON.stringify(body);

  const response = await fetch(url, options);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Worker API error (${response.status}): ${text}`);
  }
  return response.json();
}

async function callWorkerPost(path: string, body: any): Promise<any> {
  const url = `${WORKER_URL}${path}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Worker API error (${response.status}): ${text}`);
  }
  return response.json();
}

const tools = [
  {
    name: '__IMPORTANT',
    description: `3-LAYER WORKFLOW (ALWAYS FOLLOW):
1. search(query) → Get index with IDs (~50-100 tokens/result)
2. timeline(anchor=ID) → Get context around interesting results
3. get_observations([IDs]) → Fetch full details ONLY for filtered IDs
NEVER fetch full details without filtering first. 10x token savings.`,
    inputSchema: { type: 'object' as const, properties: {} }
  },
  {
    name: 'search',
    description: 'Step 1: Search memory. Returns index with IDs. Params: query (required), limit, project, agent, type, offset',
    inputSchema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Search query' },
        limit: { type: 'number', description: 'Max results (default 20)' },
        project: { type: 'string', description: 'Filter by project' },
        agent: { type: 'string', description: 'Filter by agent name' },
        type: { type: 'string', description: 'Filter by observation type' },
        offset: { type: 'number', description: 'Pagination offset' }
      },
      required: ['query']
    }
  },
  {
    name: 'timeline',
    description: 'Step 2: Get chronological context around a result. Params: anchor (observation ID, required), depth_before, depth_after',
    inputSchema: {
      type: 'object' as const,
      properties: {
        anchor: { type: 'number', description: 'Observation ID to center on' },
        depth_before: { type: 'number', description: 'Observations before anchor (default 3)' },
        depth_after: { type: 'number', description: 'Observations after anchor (default 3)' }
      },
      required: ['anchor']
    }
  },
  {
    name: 'get_observations',
    description: 'Step 3: Fetch full details for filtered IDs. Params: ids (array of observation IDs, required)',
    inputSchema: {
      type: 'object' as const,
      properties: {
        ids: { type: 'array', items: { type: 'number' }, description: 'Observation IDs to fetch' }
      },
      required: ['ids']
    }
  },
  {
    name: 'agent_query',
    description: 'What has a specific agent done recently? Params: agent (required), days, project',
    inputSchema: {
      type: 'object' as const,
      properties: {
        agent: { type: 'string', description: 'Agent name (levi, killua, itachi, etc.)' },
        days: { type: 'number', description: 'Lookback window in days (default 7)' },
        project: { type: 'string', description: 'Filter by project' }
      },
      required: ['agent']
    }
  },
  {
    name: 'mem_stats',
    description: 'Get wantan-mem database health stats: observation count, session count, agent distribution, age range.',
    inputSchema: {
      type: 'object' as const,
      properties: {}
    }
  },
  {
    name: 'mem_facts',
    description: 'Search distilled facts (compressed knowledge from observations). More useful than raw observation search. Params: query (required), project, category, min_importance, limit, agent_scope',
    inputSchema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Search query (use * for all facts)' },
        project: { type: 'string', description: 'Filter by project' },
        category: { type: 'string', description: 'Filter by category: decision, pattern, preference, learned, blocker, architecture, error, security' },
        min_importance: { type: 'number', description: 'Minimum importance score (1-10)' },
        limit: { type: 'number', description: 'Max results (default 20)' },
        agent_scope: { type: 'string', description: 'Filter facts relevant to a specific agent role. Scopes: conan (architecture, error), killua (error, architecture), diablo (architecture, pattern, error), itachi (security), shikamaru (architecture, error), wiz (learned, decision), kazuma (decision), rohan (pattern, preference), yomi (learned, architecture), chiyo (learned, architecture)' }
      },
      required: ['query']
    }
  },
  {
    name: 'mem_index',
    description: 'Get the L1 always-loaded project summary (~500 tokens). Shows top facts and project overview. Use this first before deeper searches.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        project: { type: 'string', description: 'Project name' }
      },
      required: ['project']
    }
  },
  {
    name: 'mem_categories',
    description: 'List memory categories with counts for a project. Useful for understanding what types of knowledge exist.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        project: { type: 'string', description: 'Filter by project (optional)' }
      }
    }
  },
  {
    name: 'episode_search',
    description: 'Search past successful task solutions. Use BEFORE starting work to check "have I solved something like this before?" Returns compressed solution traces that eliminate re-investigation. Params: query (required), agent, project, limit',
    inputSchema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Describe the task (e.g., "fix auth middleware", "add Apple Sign-In")' },
        agent: { type: 'string', description: 'Filter by agent who solved it' },
        project: { type: 'string', description: 'Filter by project' },
        limit: { type: 'number', description: 'Max results (default 5)' }
      },
      required: ['query']
    }
  },
  {
    name: 'episode_store',
    description: 'Store a verified successful task solution for future recall. ONLY call after a task is confirmed successful (tests pass, review approved). Params: agent, task_summary, solution_summary, files_touched, project',
    inputSchema: {
      type: 'object' as const,
      properties: {
        agent: { type: 'string', description: 'Agent who solved this (conan, killua, etc.)' },
        task_summary: { type: 'string', description: 'One-line task description' },
        solution_summary: { type: 'string', description: 'Compressed solution trace (200-500 tokens): what was done, key files, approach taken' },
        files_touched: { type: 'array', items: { type: 'string' }, description: 'File paths involved in the solution' },
        project: { type: 'string', description: 'Project name' }
      },
      required: ['agent', 'task_summary', 'solution_summary', 'project']
    }
  }
];

const server = new Server(
  { name: 'wantan-mem', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: tools.map(t => ({ name: t.name, description: t.description, inputSchema: t.inputSchema }))
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case '__IMPORTANT':
        return { content: [{ type: 'text', text: tools[0].description }] };

      case 'search': {
        const params = new URLSearchParams();
        for (const [k, v] of Object.entries(args || {})) {
          if (v != null) params.append(k, String(v));
        }
        return await callWorker(`/api/search?${params}`);
      }

      case 'timeline': {
        const params = new URLSearchParams();
        for (const [k, v] of Object.entries(args || {})) {
          if (v != null) params.append(k, String(v));
        }
        return await callWorker(`/api/timeline?${params}`);
      }

      case 'get_observations':
        return { content: [{ type: 'text', text: JSON.stringify(await callWorkerPost('/api/batch', args), null, 2) }] };

      case 'agent_query': {
        const params = new URLSearchParams();
        for (const [k, v] of Object.entries(args || {})) {
          if (v != null) params.append(k, String(v));
        }
        return await callWorker(`/api/agents?${params}`);
      }

      case 'mem_stats': {
        const stats = await callWorker('/api/stats');
        return { content: [{ type: 'text', text: JSON.stringify(stats, null, 2) }] };
      }

      case 'mem_facts': {
        const params = new URLSearchParams();
        for (const [k, v] of Object.entries(args || {})) {
          if (v != null) params.append(k, String(v));
        }
        return await callWorker(`/api/facts/search?${params}`);
      }

      case 'mem_index': {
        const params = new URLSearchParams();
        for (const [k, v] of Object.entries(args || {})) {
          if (v != null) params.append(k, String(v));
        }
        return await callWorker(`/api/facts/index?${params}`);
      }

      case 'mem_categories': {
        const params = new URLSearchParams();
        for (const [k, v] of Object.entries(args || {})) {
          if (v != null) params.append(k, String(v));
        }
        const categories = await callWorker(`/api/facts/categories?${params}`);
        return { content: [{ type: 'text', text: JSON.stringify(categories, null, 2) }] };
      }

      case 'episode_search': {
        const params = new URLSearchParams();
        for (const [k, v] of Object.entries(args || {})) {
          if (v != null) params.append(k, String(v));
        }
        return await callWorker(`/api/episodes/search?${params}`);
      }

      case 'episode_store':
        return { content: [{ type: 'text', text: JSON.stringify(await callWorkerPost('/api/episodes', args), null, 2) }] };

      default:
        return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
    }
  } catch (err) {
    return { content: [{ type: 'text', text: `Error: ${(err as Error).message}` }], isError: true };
  }
});

async function main() {
  // Verify worker is running
  try {
    await callWorker('/api/health');
  } catch {
    console.error('Warning: wantan-mem worker not available. Start with: npm run dev');
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('wantan-mem MCP server started');
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
