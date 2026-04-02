---
name: notebooklm
description: "Query, synthesize, and ingest content using {{OWNER_NAME}}'s NotebookLM knowledge base via MCP. Use when: (1) researching any topic where {{OWNER_NAME}}'s curated notebooks likely hold grounded answers, (2) synthesizing across multiple notebooks for complex strategy or content questions, (3) ingesting new vault content into the right notebook, (4) using notebook answers as the grounded foundation for producing a document, report, email, or slide deck. Also use when {{OWNER_NAME}} says 'check my notebook', 'ask NotebookLM', 'pull from my knowledge base', or any query that would benefit from grounded, source-backed answers. Always filter outputs through {{OWNER_NAME}}'s 2026 goals — see references/notebooks.md."
---

# NotebookLM — {{OWNER_NAME}}Tay-Brain

NotebookLM MCP calls take 5–15 seconds (browser automation) — do not retry prematurely.

**Before routing any query: read `references/notebooks.md`** — it contains {{OWNER_NAME}}'s notebook registry, routing rules, multi-notebook combinations, and the 2026 goal filter.

## Core Workflow

### 1. Route

Read `references/notebooks.md` routing table. Match the query to the right notebook(s). For complex queries, identify 2–3 notebooks for synthesis. When intent is ambiguous, default to **Operating Brain** for operational/current questions and **Intellectual Capital** for frameworks/content questions.

### 2. Query

Use `select_notebook` then `ask_question`. Frame questions precisely — NotebookLM answers from sources only. For multi-notebook queries, run each in sequence and record which answer came from which notebook.

### 3. Synthesize

When pulling from multiple notebooks:
1. Combine answers, noting source notebook for each key insight
2. Identify complementary perspectives (e.g., Operating Brain = current reality, Intellectual Capital = frameworks to apply)
3. Flag any gap — "This wasn't in the notebooks. Worth adding as a source?"

### 4. Produce

Use notebook answers as the grounded foundation. Extend with Claude's structuring, formatting, and reasoning — but clearly distinguish notebook-sourced content from Claude's own additions.

### 5. Ingest Loop

After producing valuable output, offer to ingest it back:
- New strategic insight → **Operating Brain**
- New framework, workshop content, book material → **Intellectual Capital**
- New AI trend or external intelligence → a dedicated research notebook
- Route per `references/notebooks.md` ingest rules

## MCP Tools

| Tool | Use |
|------|-----|
| `list_notebooks` | Show all notebooks |
| `select_notebook` | Activate a notebook |
| `ask_question` | Query active notebook |
| `search_notebooks` | Find by topic/keyword |
| `add_notebook` | Add a new NotebookLM URL |
| `update_notebook` | Update notebook metadata |
| `setup_auth` | Re-authenticate (Google sign-in via Chrome) |

## Auth Issues

If queries fail: run `setup_auth`. After re-auth, retry original query.
