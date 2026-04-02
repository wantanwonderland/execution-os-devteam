---
title: "NotebookLM Notebook Registry"
created: 2026-03-30
type: reference
tags: [notebooklm, reference]
status: active
venture: all
related: []
---

# NotebookLM Notebook Registry

Configure your notebooks in `.claude/notebook-config.json`. Use `nlm notebook list` to discover your notebook IDs.

## Recommended Notebooks

| # | Notebook | Purpose | ID |
|---|----------|---------|-----|
| 1 | Operating Brain | Core vault synthesis, daily digests, strategic patterns | (configure) |
| 2 | Intellectual Capital | Book frameworks, thought leadership, research insights | (configure) |
| 3 | Team Performance | Staff patterns, accountability data, quarterly reviews | (configure) |
| 4 | Workshop IP | Training curriculum, workshop materials, facilitation guides | (configure) |
| 5 | Revenue & Sales | Pipeline data, commission structures, deal context | (configure) |

## Routing Rules

- Default queries → Operating Brain
- Financial/revenue queries → Revenue & Sales
- Team/performance queries → Team Performance
- Content/workshop queries → Workshop IP or Intellectual Capital
- Research queries → Operating Brain (broadest context)

## Source Management

- Use Conduit agent for bulk source operations
- Max 500 sources per notebook
- Deduplicate before adding (check with `nlm source list -n <id>`)
- Preferred source types: URL (web content), file (vault .md files), text (raw content)

## Quick Commands

```bash
# List all notebooks
nlm notebook list

# Add a source
nlm source add -n <notebook_id> <url_or_file>

# Query a notebook
nlm query -n <notebook_id> "your question"

# List sources in a notebook
nlm source list -n <notebook_id>
```
