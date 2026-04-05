# Retrieval Rules

## Vault Manifest (MANIFEST.md)

The vault maintains a pre-computed manifest at `vault/MANIFEST.md` — a lightweight index of every document with path, title, tags, and one-line summary. This costs ~2K tokens vs ~85K tokens for scanning all vault files.

**Agents MUST check MANIFEST.md first** before grepping vault directories. The manifest tells agents what exists and WHERE, enabling targeted reads instead of full-vault scans.

### Manifest Format

```markdown
# Vault Manifest
Last updated: {YYYY-MM-DD HH:MM}

## 02-docs/
- [Apple Sign-In SDD](02-docs/specs/2026-04-05-apple-signin-sdd.md) — tags: auth, apple-signin, sdd | Full spec for Apple Sign-In with test plan and design requirements
- [Auth Service Runbook](02-docs/runbooks/auth-service-dev-stack.md) — tags: auth, devops, runbook | Container config, env vars, troubleshooting for auth service

## 03-research/
- [Apple Compliance Research](03-research/2026-04-05-apple-signin-compliance-research.md) — tags: apple, compliance, research | Guideline 4.8 + 5.1.1 requirements, HIG specs, production checklist
```

### Manifest Generation

Wantan regenerates `vault/MANIFEST.md` when:
- A new vault file is created (any Write to vault/ directories)
- At session start (if MANIFEST.md doesn't exist or is >24h old)
- On explicit request (`/find --rebuild-manifest`)

Generation script (Wantan runs via Bash):
```bash
python3 -c "
import os, re, json
vault = 'vault'
manifest = []
for root, dirs, files in os.walk(vault):
    dirs[:] = [d for d in dirs if d not in ('dashboard', 'data', '.claude', 'node_modules')]
    for f in files:
        if not f.endswith('.md') or f == 'MANIFEST.md': continue
        path = os.path.join(root, f)
        rel = os.path.relpath(path, vault)
        with open(path) as fh:
            content = fh.read(2000)
        title = ''; tags = []; summary = ''
        tm = re.search(r'^title:\s*[\"'\'']*(.+?)[\"'\'']*$', content, re.M)
        if tm: title = tm.group(1)
        tgm = re.search(r'^tags:\s*\[(.+?)\]', content, re.M)
        if tgm: tags = [t.strip().strip('\"'\''') for t in tgm.group(1).split(',')]
        lines = [l.strip() for l in content.split('\n') if l.strip() and not l.startswith('---') and not l.startswith('title:') and not l.startswith('tags:')]
        for l in lines[1:6]:
            if len(l) > 20 and not l.startswith('#'):
                summary = l[:120]; break
        manifest.append({'path': rel, 'title': title or f, 'tags': tags, 'summary': summary})
manifest.sort(key=lambda x: x['path'])
current_dir = ''
output = ['# Vault Manifest', f'Last updated: {__import__(\"datetime\").datetime.now().strftime(\"%Y-%m-%d %H:%M\")}', '']
for m in manifest:
    d = os.path.dirname(m['path'])
    if d != current_dir:
        current_dir = d
        output.append(f'## {d}/')
    tag_str = ', '.join(m['tags']) if m['tags'] else 'untagged'
    output.append(f'- [{m[\"title\"]}]({m[\"path\"]}) — tags: {tag_str} | {m[\"summary\"]}')
print('\n'.join(output))
" > vault/MANIFEST.md
```

### Token Savings

| Approach | Tokens | When |
|----------|--------|------|
| Read MANIFEST.md | ~2,000 | First step in every vault query |
| Grep all vault .md files | ~85,000 | Only if manifest doesn't have the answer |
| Read single targeted file | ~5,000-12,000 | After identifying the right file from manifest |

**Result**: Agents load ~7-14K tokens for a targeted vault query (manifest + one file) instead of ~85K tokens for a full scan. **6-12x reduction** in vault retrieval cost.

## Step 0: Classify the Query

Before searching, detect the query type from the owner's phrasing:

| Query Type | Signal Phrases | Strategy |
|---|---|---|
| Person-focused | "[name]'s priorities", "what's [name] working on", "who is handling" | Grep team member name across vault `.md` files. Filter to last 30 days. Group results by directory. |
| Vague-topic | "that thing about...", "remember the...", "something about margin" | Tag search first, then titles, then full-text. If 3+ results, offer wantan-mem synthesis. |
| Exact-match | "the compensation decision", "find the sprint tracker", quotes a specific title | Match against `title:` frontmatter field and filenames directly. Return on first hit. |
| Historical-pattern | "how have we handled...", "track record on...", "past decisions about" | Query wantan-mem for cross-session context. Supplement with `vault/04-decisions/log/` grep. |
| Cross-project | "how does (project A) relate to (project B)", "connections between...", compares projects | Search for files tagged with BOTH projects. Traverse `related:` arrays from top results. Show file clusters. |
| Exception-search | "what exceptions have we granted", "show me all overrides", "precedent for" | Tag search on `exception` + `precedent` in `vault/04-decisions/log/`. Show chronologically for pattern detection. |
| Default | Anything else | Linear search (Step 1 below) |

If classification is uncertain, default to linear search. Never block on wantan-mem — if MCP is unavailable, skip to local search.

## Step 1: Linear Search (Default Fallback)

When no specific query type is detected, or as supplement after routing:

1. Search `tags` arrays across all frontmatter
2. Search `title` fields
3. Full-text search
4. Return: file path + title + tags + status
5. Rank by most recently modified
6. Show which directory the file lives in for context

## Step 2: Enrich Results

After any search:
- If fewer than 2 results: widen search (try synonyms, related tags, broader terms)
- If 5+ results on a person query: group by project and recency
- If historical-pattern: offer to query wantan-mem for deeper synthesis
- Always check `related:` arrays on top results to surface connected files
- Active/draft status ranks above done/archived
