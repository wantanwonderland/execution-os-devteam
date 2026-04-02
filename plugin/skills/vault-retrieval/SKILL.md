---
name: vault-retrieval
description: Search the vault when {{OWNER_NAME}} asks about something vaguely or references past content. Use when {{OWNER_NAME}} says things like "that thing about...", "remember when...", "where did I put...", or asks about any topic that might be in the vault. Routes queries to the optimal retriever (vault grep, NotebookLM, or related-link traversal) based on query type.
---

# Vault Retrieval

When {{OWNER_NAME}} asks about something that might be in the vault, classify the query first, then search.

## Trigger Patterns
- "That thing about...", "remember when...", "where did I put..."
- "What did I say about...", "find the...", "do we have anything on..."
- Any vague reference to a topic, person, project, or framework
- Questions about past decisions, goals, or commitments

## Query Classification (Route Before Search)

Before executing the linear search, classify {{OWNER_NAME}}'s query:

1. **Person query** (mentions a team member name): Grep that name across all `.md` files. Filter results to last 30 days. Group by directory.
   - Team names: {{TEAM_MEMBER}}, {{TEAM_MEMBER}}, {{TEAM_MEMBER}}, {{TEAM_MEMBER}}, {{TEAM_MEMBER}}, {{TEAM_MEMBER}}, {{TEAM_MEMBER}}, {{TEAM_MEMBER}}, {{TEAM_MEMBER}}, {{TEAM_MEMBER}}, {{TEAM_MEMBER}}, {{TEAM_MEMBER}}, {{TEAM_MEMBER}}, {{TEAM_MEMBER}}, {{TEAM_MEMBER}}, {{TEAM_MEMBER}}, {{TEAM_MEMBER}}, {{TEAM_MEMBER}}, {{TEAM_MEMBER}}
2. **Historical pattern** ("how have we...", "track record", "past decisions on..."): Query wantan-mem for cross-session context first. Supplement with local `04-decisions/log/` grep.
3. **Cross-project** (mentions 2+ projects or "connection between"): Search for files tagged with BOTH projects. Walk `related:` links from top results.
4. **Exact match** (quotes a specific title or filename): Match against `title:` frontmatter field and filenames directly. Return on first match.
5. **Vague topic** (everything else): Fall through to linear search below.

If classification is uncertain, default to linear search. Never block on wantan-mem — if MCP is unavailable, skip to local search.

## Search Strategy (Linear — Default Fallback)
1. **Tags first**: Search `tags` arrays in frontmatter across all `.md` files
2. **Titles second**: Search `title` fields in frontmatter
3. **Full-text third**: Search file contents for keywords
4. **Related links**: Check `related` arrays on top results for connected files

## Results Format
For each match, show:
- File path (clickable)
- Title
- Tags
- Status
- Directory (for context on what type of content it is)

## Ranking
- Most recently modified first
- Exact tag match > title match > full-text match
- Active/draft status above done/archived

## Rules
- Cast a wide net first, then narrow. Better to show 5 results than miss the right one.
- If no results found, suggest related searches or ask {{OWNER_NAME}} to clarify
- Use subagents for searches that might span 10+ files
- When wantan-mem returns results, mark them as `[wantan-mem]` to distinguish from local vault hits
