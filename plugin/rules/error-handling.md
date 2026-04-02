# Error Handling Rules

## Never Return Generic Errors

When any tool call, MCP query, database operation, or file operation fails, NEVER return a generic "failed" or "skip silently." Always include structured error context.

## Error Classification

| Type | Examples | Action |
|------|----------|--------|
| **transient** | MCP timeout, network error, rate limit | Retry 2x with 2s delay. If still failing, report with context. |
| **auth** | Gmail token invalid, GitHub token expired | Report with self-heal instructions. Report if self-heal fails. |
| **data** | Missing frontmatter field, type mismatch, invalid date | Fix immediately if auto-fixable. Report what was wrong and what was fixed. |
| **fatal** | Data corruption, conflicting sources, file not found for critical operation | Escalate to the owner with full context. Do not attempt to fix silently. |

## Required Error Format

When reporting an error (to the owner or to the coordinating agent), always include:

1. **What failed**: The specific tool/operation that errored
2. **What was tried**: The input/parameters used
3. **Partial results**: Any data successfully retrieved before failure
4. **Alternatives**: What could be tried instead
5. **Severity**: transient | auth | data | fatal

## Example

Bad: "GitHub API query failed. Skipping PR data."

Good: "GitHub API query failed (rate limit — 429 on pull_requests endpoint). Retry in 60s. Partial results: 3 of 12 PRs retrieved. Alternative: use cached data from last Forge run in vault/09-ops/deploys/."

## Agent-Specific Error Handling

- **Kazuma**: If database query fails, check if `vault/data/company.db` exists and has expected tables before retrying
- **Wiz**: If WebSearch/WebFetch fails, fall back to vault-only search and note the gap
- **Forge**: If GitHub MCP fails, report which PR/CI data is missing and suggest manual check as fallback

## Retry Policy (Quality Gates Layer 3)

When an agent dispatch fails:

| Attempt | Delay | Strategy |
|---------|-------|----------|
| 1 | 0s | Immediate retry, same prompt |
| 2 | 2s | Add error context: "Previous attempt failed: {error}" |
| 3 | 5s | Simplify prompt: fewer files, less context |
| After 3 | — | Stop. Log circuit event. Escalate to user. |

### What to Retry

- Network timeouts (curl errors, MCP disconnects)
- Rate limits (GitHub API 429, wantan-mem busy)
- Database locks (SQLite WAL contention)

### What NOT to Retry

- Validation failures (agent output was wrong — fix the prompt)
- Permission errors (auth expired — user must re-authenticate)
- Gate rejections (user said no — respect their decision)
- Logic errors (wrong agent dispatched — re-route, don't retry)

## Circuit Breaker

Derived from wantan-mem observations. No separate state storage.

### State Transitions

```
CLOSED → 3+ errors in last 5 dispatches → OPEN
OPEN → 60s cooldown → HALF-OPEN
HALF-OPEN → success → CLOSED
HALF-OPEN → failure → OPEN
```

### Checking Circuit State

```
Query: wantan-mem observations WHERE agent = '{name}' AND type IN ('error', 'insight', 'review') ORDER BY created_at DESC LIMIT 5
Count errors: if errors >= 3 → OPEN
If most recent is not error → CLOSED
```

### User Override

User can force-close a circuit: "reset {agent} circuit" or "dispatch {agent} anyway". This logs an override event and immediately dispatches.
