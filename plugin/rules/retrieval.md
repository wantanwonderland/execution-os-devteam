# Retrieval Rules

## Step 0: Classify the Query

Before searching, detect the query type from the owner's phrasing:

| Query Type | Signal Phrases | Strategy |
|---|---|---|
| Person-focused | "[name]'s priorities", "what's [name] working on", "who is handling" | Grep team member name across vault `.md` files. Filter to last 30 days. Group results by directory. |
| Vague-topic | "that thing about...", "remember the...", "something about margin" | Tag search first, then titles, then full-text. If 3+ results, offer wantan-mem synthesis. |
| Exact-match | "the compensation decision", "find the sprint tracker", quotes a specific title | Match against `title:` frontmatter field and filenames directly. Return on first hit. |
| Historical-pattern | "how have we handled...", "track record on...", "past decisions about" | Query wantan-mem for cross-session context. Supplement with `04-decisions/log/` grep. |
| Cross-project | "how does (project A) relate to (project B)", "connections between...", compares projects | Search for files tagged with BOTH projects. Traverse `related:` arrays from top results. Show file clusters. |
| Exception-search | "what exceptions have we granted", "show me all overrides", "precedent for" | Tag search on `exception` + `precedent` in `04-decisions/log/`. Show chronologically for pattern detection. |
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
