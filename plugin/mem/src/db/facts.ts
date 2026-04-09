import { createHash } from 'crypto';
import type Database from 'better-sqlite3';
import type {
  Observation,
  Fact,
  FactCategory,
  FactSearchOptions,
  FactSearchResult,
  MemoryIndex,
} from '../types.js';
import { AGENT_SCOPE_MAP } from '../types.js';

/**
 * Noise patterns — observations that should NOT produce facts.
 * These are routine tool calls with no knowledge value.
 */
const NOISE_PATTERNS: RegExp[] = [
  /^Bash:\s*(ls|cd|pwd|echo|cat|head|tail|wc|which|whoami|date|clear|less|more|file|stat|df|du|free|top|ps|kill|man|history)\b/i,
  /^Bash:\s*git\s+(status|log|diff|branch|stash|fetch|pull|show|remote|tag|blame|cherry-pick)\b/i,
  /^Bash:\s*npm\s+(install|ci|i|ls|outdated|audit)\b/i,
  /^Bash:\s*(node|python3?|ruby|php)\s+--?version/i,
  /^Bash:\s*docker\s+(ps|images|logs|inspect)\b/i,
  /^Bash:\s*node_modules/i,
  /^Read:\s/i,
  /^Glob:\s/i,
  /^Grep:\s/i,
  /^TodoRead/i,
  /^TodoWrite/i,
  // System/framework noise — not user-generated knowledge
  /<task-notification>/i,
  /<system-reminder>/i,
  /<\/?[a-z-]+>/,                      // Generic XML/HTML tags (system messages)
  /^Bash:\s*curl\s.*wantan-mem/i,      // Self-referential mem calls
  /^Bash:\s*curl\s.*localhost/i,       // Local service health checks
  /^Bash:\s*sleep\b/i,                 // Sleep commands
  /^MCP:\s/i,                          // MCP tool calls (low signal)
  /^Bash:\s*(grep|rg|find|sed|awk|sort|uniq|cut|tr)\s/i, // Unix text utilities
  // Turn summaries are meta-observations (observations about observations) — low signal
  /^Turn summary:/i,
  /files changed.*searches.*actions/i,
];

/**
 * Category detection rules — maps content patterns to fact categories and importance.
 */
interface CategoryRule {
  pattern: RegExp;
  category: FactCategory;
  importance: number;
}

const CATEGORY_RULES: CategoryRule[] = [
  // Decisions (importance 10) — explicit decision language only
  { pattern: /\b(decided to|chose to|committed to|will use|going with|selected|picked)\s+\w/i, category: 'decision', importance: 10 },
  { pattern: /\b(design decision|tech stack decision|chose .+ over .+)\b/i, category: 'decision', importance: 10 },
  { pattern: /\bADR\b/i, category: 'decision', importance: 10 },

  // Errors (importance 8) — actual error indicators, not generic mentions
  { pattern: /\b(error|bug|crash|exception|failure)\s*:/i, category: 'error', importance: 8 },
  { pattern: /\bfix(ed|ing)\s+(bug|error|crash|failure|regression|vulnerability)\b/i, category: 'error', importance: 8 },
  { pattern: /\b(incident|outage|downtime|P[0-3])\b/i, category: 'error', importance: 8 },
  { pattern: /exit code [1-9]/i, category: 'error', importance: 8 },

  // Security (importance 8) — only actual security findings, not project names
  { pattern: /\bCVE-\d{4}-\d+\b/i, category: 'security', importance: 8 },
  { pattern: /\b(vulnerability|exploit|injection|XSS|CSRF)\s+(found|detected|in)\b/i, category: 'security', importance: 8 },
  { pattern: /\bauth(entication|orization)\s+(issue|bug|flaw|bypass)\b/i, category: 'security', importance: 8 },

  // Blockers (importance 7)
  { pattern: /\b(blocked by|blocker:|stuck on|can't proceed|waiting on|dependency issue)\b/i, category: 'blocker', importance: 7 },

  // Architecture (importance 6) — specific structural changes, not generic file writes
  { pattern: /\b(schema|migration|database)\s+(change|update|create|add|alter)\b/i, category: 'architecture', importance: 6 },
  { pattern: /\b(new endpoint|new route|new component|new module|new service)\b/i, category: 'architecture', importance: 6 },
  { pattern: /\b(refactor(ed|ing))\s+\w/i, category: 'architecture', importance: 6 },
  { pattern: /\b(deploy(ed|ment)\s+to\s+(staging|production|prod))\b/i, category: 'architecture', importance: 6 },

  // Work completed / feature delivered (importance 6) — catch session deliverables
  { pattern: /\bphases?\s*\d[\d\s,–\-]*\s*(complete|done|finished|shipped|delivered|built)\b/i, category: 'architecture', importance: 6 },
  { pattern: /\b(backoffice|dashboard|admin\s+panel|module|feature|screen|page|form|list|detail)\s+(complete|done|finished|shipped|delivered|built|implemented)\b/i, category: 'architecture', importance: 6 },
  { pattern: /\b(vendor|booking|stock|payment|auth|user|product)\s+(management|list|detail|flow|module)\s+(complete|done|built|implemented|shipped)\b/i, category: 'architecture', importance: 6 },
  { pattern: /\b(completed?|finished|shipped|delivered|implemented|built)\s+(phase|backoffice|dashboard|module|feature|screen|vendor|booking|stock|admin)\b/i, category: 'architecture', importance: 6 },

  // Routing constraints and coordinator identity (importance 9) — must survive compaction
  { pattern: /\b(orchestrate|don't execute|delegate to|route to|dispatched? (conan|lelouch|rohan|diablo|killua|itachi|shikamaru|kazuma|wiz|senku|sai|megumin|byakuya|yomi|chiyo|l))\b/i, category: 'preference', importance: 9 },
  { pattern: /\b(spec.first|sdd pipeline|phase \d complete|lelouch.+spec|rohan.+design|conan.+implement)\b/i, category: 'decision', importance: 9 },

  // Patterns and preferences (importance 5)
  { pattern: /\b(pattern|convention|standard|best practice)\s*:/i, category: 'pattern', importance: 5 },
  { pattern: /\b(always use|never use|avoid using|prefer)\s+\w/i, category: 'preference', importance: 5 },

  // Research and learning (importance 4) — explicit research output, not every Agent dispatch
  { pattern: /^WebSearch:\s/i, category: 'learned', importance: 4 },
  { pattern: /\b(research(ed)?|investigated|evaluated|compared)\s+.{10,}/i, category: 'learned', importance: 4 },
  { pattern: /\b(found that|turns out|TIL|key finding|discovery)\b/i, category: 'learned', importance: 4 },

  // Agent dispatches — track which agents did what (importance 3)
  { pattern: /^Agent\s*\(/i, category: 'learned', importance: 3 },
];

/**
 * FactStore — Compress-on-write fact extraction from observations.
 *
 * Design principles:
 * - SimpleMem pattern: extract facts immediately on write, not on read
 * - memsearch pattern: SHA256 content hashing for deduplication
 * - Memori pattern: importance scoring by category
 * - MemOS pattern: access-weighted ranking for retrieval
 * - 59-compaction pattern: L1 always-loaded summary per project
 */
export class FactStore {
  constructor(private db: Database.Database) {}

  /**
   * Extract and store facts from an observation.
   * This is the core "compress on write" operation.
   * Returns extracted facts (empty array if observation is noise).
   */
  extractAndStore(observation: Observation): Fact[] {
    const content = observation.content;

    // Skip noise — routine tool calls with no knowledge value
    if (this.isNoise(content)) {
      return [];
    }

    // Detect category and importance
    const { category, importance } = this.classify(content);

    // Build the distilled fact content
    const factContent = this.distill(content, observation.type);

    // Deduplicate via content hash
    const hash = this.computeHash(factContent);
    if (this.isDuplicate(hash)) {
      return [];
    }

    // Detect tags from content
    const tags = this.extractTags(content);

    // Extract git branch from observation metadata if available
    const gitBranch = this.extractGitBranch(observation);

    // Insert the fact
    const stmt = this.db.prepare(
      `INSERT INTO facts (source_observation_id, category, content, importance, project, agent, tags, content_hash, git_branch)
       VALUES (@source_observation_id, @category, @content, @importance, @project, @agent, @tags, @content_hash, @git_branch)
       RETURNING *`
    );

    const fact = stmt.get({
      source_observation_id: observation.id,
      category,
      content: factContent,
      importance,
      project: observation.project,
      agent: observation.agent,
      tags: tags.length > 0 ? JSON.stringify(tags) : null,
      content_hash: hash,
      git_branch: gitBranch,
    }) as Fact;

    // Contradiction detection: supersede conflicting decisions/preferences
    // (codenamev/claude_memory truth maintenance pattern)
    if (category === 'decision' || category === 'preference') {
      this.supersedConflicting(fact, tags);
    }

    // Auto-rebuild L1 index every 10 facts for this project
    const factCount = (
      this.db.prepare('SELECT COUNT(*) as count FROM facts WHERE project = ?').get(observation.project) as { count: number }
    ).count;
    if (factCount % 10 === 0) {
      try {
        this.rebuildIndex(observation.project);
      } catch {
        // Non-fatal — index rebuild failure should not block fact storage
      }
    }

    return [fact];
  }

  /**
   * Supersede conflicting facts when a new decision/preference is stored.
   * If an existing fact shares ≥2 domain tags with the new fact AND is older,
   * mark it as superseded by the new fact.
   * (Truth maintenance pattern from codenamev/claude_memory)
   */
  private supersedConflicting(newFact: Fact, newTags: string[]): void {
    if (newTags.length < 2) return; // Need at least 2 tags to detect domain overlap

    const candidates = this.db
      .prepare(
        `SELECT id, tags FROM facts
         WHERE project = @project
           AND category = @category
           AND superseded = 0
           AND id != @id
           AND created_at < @created_at`
      )
      .all({
        project: newFact.project,
        category: newFact.category,
        id: newFact.id,
        created_at: newFact.created_at,
      }) as Array<{ id: number; tags: string | null }>;

    for (const candidate of candidates) {
      if (!candidate.tags) continue;
      try {
        const candidateTags: string[] = JSON.parse(candidate.tags);
        const overlap = newTags.filter(t => candidateTags.includes(t)).length;
        if (overlap >= 2) {
          this.db.prepare(
            `UPDATE facts SET superseded = 1, superseded_by = ? WHERE id = ?`
          ).run(newFact.id, candidate.id);
        }
      } catch {
        // Malformed tags JSON — skip
      }
    }
  }

  /**
   * Sanitize a query string for FTS5 MATCH.
   * Converts multi-word queries to OR terms so any matching word returns results.
   * Strips FTS5 special characters to prevent syntax errors.
   */
  private sanitizeFtsQuery(query: string): string {
    // Strip ALL non-alphanumeric characters except spaces.
    // FTS5 treats many chars as operators: - (NOT), * (prefix), " (phrase),
    // / (regex), ' (quote), : (column filter), ^ ~ () {} []
    // Safest approach: whitelist only letters, numbers, and spaces.
    const cleaned = query.replace(/[^a-zA-Z0-9\s]/g, ' ').trim();
    // Split into words, filter empties and very short tokens
    const words = cleaned.split(/\s+/).filter(w => w.length > 1);
    if (words.length === 0) return '""';
    if (words.length === 1) return words[0];
    // Join with OR so any matching word returns results
    return words.join(' OR ');
  }

  /**
   * Search facts using FTS5 full-text search.
   */
  search(query: string, options: FactSearchOptions = {}): FactSearchResult[] {
    const { project, category, minImportance, limit = 20, agentScope } = options;

    // Resolve agent scope to category filter
    const scopeCategories = agentScope ? AGENT_SCOPE_MAP[agentScope.toLowerCase()] : undefined;

    // Wildcard query — bypass FTS, scan with filters
    if (query === '*') {
      let sql = `
        SELECT id, category, content, importance, project, agent, tags, created_at, access_count, 0 as rank
        FROM facts
        WHERE superseded = 0
      `;
      const params: Record<string, unknown> = { limit };

      if (project) {
        sql += ' AND project = @project';
        params.project = project;
      }
      if (category) {
        sql += ' AND category = @category';
        params.category = category;
      } else if (scopeCategories && scopeCategories.length > 0) {
        const placeholders = scopeCategories.map((_, i) => `@scope_${i}`);
        sql += ` AND category IN (${placeholders.join(',')})`;
        scopeCategories.forEach((cat, i) => { params[`scope_${i}`] = cat; });
      }
      if (minImportance) {
        sql += ' AND importance >= @minImportance';
        params.minImportance = minImportance;
      }

      sql += ' ORDER BY importance DESC, created_at DESC LIMIT @limit';
      return this.db.prepare(sql).all(params) as FactSearchResult[];
    }

    // FTS query — sanitize to OR terms so multi-word queries find partial matches
    const ftsQuery = this.sanitizeFtsQuery(query);
    let sql = `
      SELECT
        f.id, f.category, f.content, f.importance, f.project, f.agent, f.tags,
        f.created_at, f.access_count, fts.rank
      FROM facts_fts fts
      JOIN facts f ON f.id = fts.rowid
      WHERE facts_fts MATCH @query
        AND f.superseded = 0
    `;
    const params: Record<string, unknown> = { query: ftsQuery, limit };

    if (project) {
      sql += ' AND f.project = @project';
      params.project = project;
    }
    if (category) {
      sql += ' AND f.category = @category';
      params.category = category;
    } else if (scopeCategories && scopeCategories.length > 0) {
      const placeholders = scopeCategories.map((_, i) => `@scope_${i}`);
      sql += ` AND f.category IN (${placeholders.join(',')})`;
      scopeCategories.forEach((cat, i) => { params[`scope_${i}`] = cat; });
    }
    if (minImportance) {
      sql += ' AND f.importance >= @minImportance';
      params.minImportance = minImportance;
    }

    sql += ' ORDER BY f.importance DESC, fts.rank LIMIT @limit';
    return this.db.prepare(sql).all(params) as FactSearchResult[];
  }

  /**
   * Get recent facts ordered by creation time (recency-based recall).
   * Used at session start to surface last-session work regardless of importance score.
   */
  getRecent(project: string, hours: number = 48, limit: number = 8): FactSearchResult[] {
    return this.db
      .prepare(
        `SELECT id, category, content, importance, project, agent, tags, created_at, access_count, 0 as rank
         FROM facts
         WHERE project = @project
           AND created_at >= datetime('now', @since)
           AND importance >= 3
         ORDER BY created_at DESC
         LIMIT @limit`
      )
      .all({ project, since: `-${hours} hours`, limit }) as FactSearchResult[];
  }

  /**
   * Get the L1 memory index for a project (~500 tokens, always loaded).
   */
  getIndex(project: string): MemoryIndex | undefined {
    return this.db
      .prepare('SELECT * FROM memory_index WHERE project = ?')
      .get(project) as MemoryIndex | undefined;
  }

  /**
   * Rebuild the L1 memory index for a project.
   * Selects top facts by (importance * log(access_count + 1)) and generates a summary.
   */
  rebuildIndex(project: string): MemoryIndex {
    // Count totals
    const totalFacts = (
      this.db.prepare('SELECT COUNT(*) as count FROM facts WHERE project = ?').get(project) as { count: number }
    ).count;
    const totalObservations = (
      this.db.prepare('SELECT COUNT(*) as count FROM observations WHERE project = ?').get(project) as { count: number }
    ).count;

    // Select top 10 facts by weighted score with recency decay:
    // score = importance * access_boost * recency_decay
    // - access_boost = 1.0 + 0.5 * access_count (rewards frequently retrieved facts)
    // - recency_decay = 0.995 ^ hours_since_creation (exponential decay, half-life ~6 days)
    // Filter: importance >= 5 excludes low-value "learned" catch-all facts (importance 3-4)
    // Filter: exclude content that looks like bash commands or file paths (not knowledge)
    const topFacts = this.db
      .prepare(
        `SELECT id, category, content, importance, access_count, created_at,
                (importance * 1.0)
                * (1.0 + 0.5 * CASE WHEN access_count > 0 THEN access_count ELSE 0 END)
                * POWER(0.995, (julianday('now') - julianday(created_at)) * 24)
                as score
         FROM facts
         WHERE project = ?
           AND importance >= 5
           AND superseded = 0
           AND content NOT LIKE 'Bash:%'
           AND content NOT LIKE 'Write:%'
           AND content NOT LIKE 'Edit:%'
           AND content NOT LIKE 'Agent (%'
         ORDER BY score DESC
         LIMIT 10`
      )
      .all(project) as Array<{ id: number; category: string; content: string; importance: number; access_count: number; score: number }>;

    // Generate summary from top facts
    const summaryParts: string[] = [];
    const categoryGroups = new Map<string, string[]>();

    for (const fact of topFacts) {
      if (!categoryGroups.has(fact.category)) {
        categoryGroups.set(fact.category, []);
      }
      categoryGroups.get(fact.category)!.push(fact.content);
    }

    for (const [cat, facts] of categoryGroups) {
      summaryParts.push(`${cat}: ${facts.join('; ')}`);
    }

    const summary = summaryParts.length > 0
      ? summaryParts.join('\n')
      : `No facts recorded yet for ${project}.`;

    const keyFactsJson = JSON.stringify(
      topFacts.map(f => ({ id: f.id, category: f.category, content: f.content, importance: f.importance }))
    );

    // Upsert memory index
    this.db
      .prepare(
        `INSERT INTO memory_index (project, summary, key_facts, last_updated, total_facts, total_observations)
         VALUES (@project, @summary, @key_facts, datetime('now'), @total_facts, @total_observations)
         ON CONFLICT(project) DO UPDATE SET
           summary = @summary,
           key_facts = @key_facts,
           last_updated = datetime('now'),
           total_facts = @total_facts,
           total_observations = @total_observations`
      )
      .run({
        project,
        summary,
        key_facts: keyFactsJson,
        total_facts: totalFacts,
        total_observations: totalObservations,
      });

    return this.getIndex(project)!;
  }

  /**
   * Record an access to a fact (bumps access_count, updates last_accessed_at).
   * Used for importance decay/boost via the MemOS pattern.
   */
  recordAccess(factId: number): void {
    this.db
      .prepare(
        `UPDATE facts SET
           access_count = access_count + 1,
           last_accessed_at = datetime('now')
         WHERE id = ?`
      )
      .run(factId);
  }

  /**
   * Check if a fact with the given content hash already exists.
   */
  isDuplicate(hash: string): boolean {
    const row = this.db
      .prepare('SELECT id FROM facts WHERE content_hash = ?')
      .get(hash);
    return row !== undefined;
  }

  /**
   * Get category counts for a project.
   */
  getCategoryCounts(project?: string): Array<{ category: string; count: number }> {
    if (project) {
      return this.db
        .prepare('SELECT category, COUNT(*) as count FROM facts WHERE project = ? GROUP BY category ORDER BY count DESC')
        .all(project) as Array<{ category: string; count: number }>;
    }
    return this.db
      .prepare('SELECT category, COUNT(*) as count FROM facts GROUP BY category ORDER BY count DESC')
      .all() as Array<{ category: string; count: number }>;
  }

  /**
   * Save a compaction snapshot — called by the PreCompact hook.
   * Archives top facts + recent obs summaries to SQLite so they survive compaction.
   * (ruvnet two-hook pattern)
   */
  saveCompactionSnapshot(project: string, gitBranch: string | null, sddState: object | null): number {
    // Top 10 facts by importance (non-superseded)
    const topFacts = this.db
      .prepare(
        `SELECT id, category, content, importance FROM facts
         WHERE project = ? AND superseded = 0
         ORDER BY importance DESC, access_count DESC
         LIMIT 10`
      )
      .all(project) as Array<{ id: number; category: string; content: string; importance: number }>;

    // Last 20 observations as summaries (id, agent, 100-char snippet)
    const recentObs = this.db
      .prepare(
        `SELECT id, agent, type, substr(content, 1, 100) as snippet, created_at
         FROM observations WHERE project = ?
         ORDER BY id DESC LIMIT 20`
      )
      .all(project) as Array<{ id: number; agent: string; type: string; snippet: string; created_at: string }>;

    // Rough token estimate: ~3 tokens per word, avg 12 words per fact/obs
    const tokenEstimate = (topFacts.length + recentObs.length) * 36;

    const result = this.db.prepare(
      `INSERT INTO compaction_snapshots
         (project, git_branch, sdd_state, top_facts, recent_obs_summary, context_tokens_estimate)
       VALUES (@project, @git_branch, @sdd_state, @top_facts, @recent_obs, @tokens)
       RETURNING id`
    ).get({
      project,
      git_branch: gitBranch,
      sdd_state: sddState ? JSON.stringify(sddState) : null,
      top_facts: JSON.stringify(topFacts),
      recent_obs: JSON.stringify(recentObs),
      tokens: tokenEstimate,
    }) as { id: number };

    return result.id;
  }

  /**
   * Load the latest unrestored compaction snapshot for a project.
   * Called by the SessionStart(compact) hook to restore context.
   */
  loadLatestSnapshot(project: string): {
    id: number;
    captured_at: string;
    git_branch: string | null;
    sdd_state: object | null;
    top_facts: Array<{ id: number; category: string; content: string; importance: number }>;
    recent_obs_summary: Array<{ id: number; agent: string; type: string; snippet: string; created_at: string }>;
  } | null {
    const row = this.db
      .prepare(
        `SELECT * FROM compaction_snapshots
         WHERE project = ? AND restored = 0
         ORDER BY captured_at DESC LIMIT 1`
      )
      .get(project) as any;

    if (!row) return null;

    // Mark as restored
    this.db.prepare('UPDATE compaction_snapshots SET restored = 1, restored_at = datetime("now") WHERE id = ?').run(row.id);

    return {
      id: row.id,
      captured_at: row.captured_at,
      git_branch: row.git_branch,
      sdd_state: row.sdd_state ? JSON.parse(row.sdd_state) : null,
      top_facts: JSON.parse(row.top_facts || '[]'),
      recent_obs_summary: JSON.parse(row.recent_obs_summary || '[]'),
    };
  }

  // --- Private helpers ---

  /**
   * Check if an observation is noise (routine tool calls with no knowledge value).
   */
  private isNoise(content: string): boolean {
    return NOISE_PATTERNS.some(p => p.test(content));
  }

  /**
   * Extract git branch from observation metadata or content.
   * (mcp-memory-keeper branch correlation pattern)
   */
  private extractGitBranch(observation: Observation): string | null {
    // Check metadata.branch first (most reliable)
    if (observation.metadata) {
      try {
        const meta = JSON.parse(observation.metadata);
        if (meta.branch && typeof meta.branch === 'string') {
          return meta.branch.substring(0, 100);
        }
      } catch { /* skip */ }
    }
    // Check content for branch mentions (e.g., "on branch feature/auth")
    const branchMatch = observation.content.match(/\bon branch[:\s]+([a-zA-Z0-9/_.-]+)/i);
    if (branchMatch) return branchMatch[1].substring(0, 100);
    return null;
  }

  /**
   * Classify content into a category and importance score.
   */
  private classify(content: string): { category: FactCategory; importance: number } {
    for (const rule of CATEGORY_RULES) {
      if (rule.pattern.test(content)) {
        return { category: rule.category, importance: rule.importance };
      }
    }
    // Default: learned, importance 3
    return { category: 'learned', importance: 3 };
  }

  /**
   * Distill raw observation content into a clean fact.
   * Strips prefixes, truncates, and normalizes.
   */
  private distill(content: string, observationType: string): string {
    let distilled = content;

    // Strip common tool prefixes to get the core content
    distilled = distilled.replace(/^(Write|Edit|Bash|WebSearch|Agent\s*\([^)]*\)):\s*/i, '');

    // Strip system noise that leaked through
    distilled = distilled.replace(/<[^>]+>/g, '');           // XML/HTML tags
    distilled = distilled.replace(/toolu_[a-zA-Z0-9]+/g, ''); // Tool IDs
    distilled = distilled.replace(/\b[a-f0-9]{16,}\b/g, '');  // Long hex hashes (task IDs, etc.)

    // Truncate very long content to keep facts concise
    if (distilled.length > 500) {
      distilled = distilled.substring(0, 497) + '...';
    }

    // Clean up whitespace
    distilled = distilled.replace(/\s+/g, ' ').trim();

    return distilled;
  }

  /**
   * Compute SHA256 hash for deduplication.
   */
  private computeHash(content: string): string {
    return createHash('sha256').update(content).digest('hex');
  }

  /**
   * Extract tags from content based on signal words.
   */
  private extractTags(content: string): string[] {
    const tags: string[] = [];
    const lower = content.toLowerCase();

    if (/\b(auth|login|jwt|session|oauth|token)\b/.test(lower)) tags.push('auth');
    if (/\b(database|db|schema|migration|sql|prisma|sqlite)\b/.test(lower)) tags.push('database');
    if (/\b(api|endpoint|route|rest|graphql)\b/.test(lower)) tags.push('api');
    if (/\b(test|spec|coverage|vitest|jest|cypress)\b/.test(lower)) tags.push('testing');
    if (/\b(deploy|ci|cd|pipeline|docker|k8s|kubernetes)\b/.test(lower)) tags.push('devops');
    if (/\b(security|cve|vulnerability|xss|csrf|injection)\b/.test(lower)) tags.push('security');
    if (/\b(performance|slow|latency|cache|optimize|benchmark)\b/.test(lower)) tags.push('performance');
    if (/\b(ui|ux|component|css|style|layout|responsive)\b/.test(lower)) tags.push('frontend');
    if (/\b(error|bug|crash|exception|failure)\b/.test(lower)) tags.push('error');

    return tags;
  }
}
