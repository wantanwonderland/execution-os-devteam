# Use Case: Using wantan-mem (Cross-Session Memory)

wantan-mem is Execution-OS's native memory system. It captures observations from every agent dispatch, stores them in SQLite + FTS5 + ChromaDB, and makes them searchable across sessions. Your AI team builds institutional knowledge over time.

---

## How Memory Works

```
Session 1: Levi reviews PR #42, finds auth bug
  → Observation saved: "Levi found missing auth check in /api/users/:id"

Session 2 (next day): You ask about the users endpoint
  → Wantan queries wantan-mem before dispatching
  → Injects context: "Levi flagged an auth issue here yesterday"
  → Agent starts with relevant history, not from scratch
```

Memory is captured **automatically** via hooks — you don't need to do anything special.

---

## Scenario 1: "What did we find last week?"

You're starting Monday morning and want to know what happened while you were away.

```
/today
```

Wantan's briefing includes recent wantan-mem observations — what agents found, what decisions were made, what incidents occurred.

For deeper context:

```
What has Levi flagged in the last 7 days?
```

Wantan uses the `agent_query` MCP tool:

```
agent_query(agent="levi", days=7)
```

Returns a compact table:

```
| ID  | Type   | Agent | Snippet                                          | Date       |
|-----|--------|-------|--------------------------------------------------|------------|
| 142 | review | levi  | PR #89: Missing input validation on /api/orders  | 2026-03-28 |
| 138 | review | levi  | PR #87: Clean refactor, approved 9/10            | 2026-03-27 |
| 135 | review | levi  | PR #85: SQL injection risk in search endpoint    | 2026-03-26 |
```

Want full details on the SQL injection finding?

```
Show me the full details on observation 135
```

Wantan uses `get_observations(ids=[135])` — the third layer of progressive disclosure.

---

## Scenario 2: "Have we seen this bug before?"

You hit a `TypeError: Cannot read properties of undefined (reading 'map')` in the dashboard.

```
/debug "TypeError: Cannot read properties of undefined (reading 'map')"
```

Before dispatching Hange + Levi, Wantan **automatically searches wantan-mem**:

```
search(query="TypeError undefined map")
```

If a past observation matches:

> **Found in memory**: Killua reported a similar error 2 weeks ago in PR #72. Root cause was the API returning `null` instead of an empty array when no results found. Fix was adding `data ?? []` fallback.

The agent starts with this context instead of investigating from scratch.

---

## Scenario 3: "What decisions did we make about auth?"

You're onboarding a new developer who asks why you use JWT instead of sessions.

```
Search memory for decisions about authentication
```

Wantan queries:

```
search(query="authentication JWT session decision", type="decision")
```

Returns:

```
| ID  | Type     | Agent  | Snippet                                              | Date       |
|-----|----------|--------|------------------------------------------------------|------------|
| 89  | decision | wantan | Chose JWT over sessions: SPA + mobile need stateless | 2026-02-15 |
| 45  | decision | wantan | Refresh token rotation: one-time use per spec        | 2026-02-16 |
| 112 | review   | levi   | Approved auth middleware PR — bcrypt + httpOnly       | 2026-02-20 |
```

For timeline context around the JWT decision:

```
Show me the timeline around observation 89
```

Wantan uses `timeline(anchor=89, depth_before=3, depth_after=3)`:

```
    [86] 2026-02-14 | hange (research): JWT vs Session comparison — JWT wins for multi-platform
    [87] 2026-02-14 | hange (research): Refresh token strategies — rotation recommended
    [88] 2026-02-15 | senku (review): Architecture review approved JWT approach
>>> [89] 2026-02-15 | wantan (decision): Chose JWT over sessions for SPA + mobile
    [90] 2026-02-16 | wantan (decision): Refresh tokens: one-time use, httpOnly cookie
    [91] 2026-02-17 | tanjiro (insight): Auth middleware implemented with bcrypt + argon2
    [92] 2026-02-20 | levi (review): Auth PR approved — clean implementation 9/10
```

The new developer now has full context: research → decision → implementation → review.

---

## Scenario 4: "Why did we change the database schema?"

Three months from now, someone asks why the `orders` table has a `metadata` JSON column instead of a separate `order_details` table.

```
Search memory for orders table schema decision
```

wantan-mem finds the original decision, the ADR, and the tech debt discussion:

```
| ID  | Type     | Agent  | Snippet                                                  |
|-----|----------|--------|----------------------------------------------------------|
| 201 | decision | wantan | Used JSON metadata column for order flexibility           |
| 198 | review   | senku  | Architecture review: JSON column OK for v1, revisit at scale |
| 245 | insight  | senku  | Tech debt logged: normalize order_details when >10k orders |
```

The full history is preserved — why it was decided, who reviewed it, and when to revisit.

---

## Scenario 5: "What patterns keep recurring?"

At retrospective time:

```
/retro
```

**Erwin** queries wantan-mem for patterns:

```
search(query="error bug fail", type="error", days=14)
```

Finds that 4 of the last 6 errors involved missing null checks on API responses. Surfaces this as a pattern:

> **Pattern detected**: 67% of bugs this sprint were null-safety issues on API responses. Consider adding a global response wrapper that guarantees arrays are never null.

This becomes a retro action item → tech debt item → Senku designs the fix → Tanjiro implements.

---

## Scenario 6: "What has Itachi been finding?"

You want a security posture summary from memory, not just the latest scan.

```
What security issues has Itachi found across all projects this month?
```

Wantan queries:

```
agent_query(agent="itachi", days=30)
```

Returns chronological findings:

```
| ID  | Type  | Agent  | Snippet                                              | Date       |
|-----|-------|--------|------------------------------------------------------|------------|
| 310 | event | itachi | S-rank: CVE-2026-1234 in lodash — upgraded           | 2026-03-28 |
| 298 | event | itachi | B-rank: outdated express-validator — flagged          | 2026-03-25 |
| 275 | event | itachi | A-rank: hardcoded API key in test file — removed      | 2026-03-20 |
| 260 | event | itachi | Genin: 3 low-severity npm audit findings — monitoring | 2026-03-15 |
```

You can see the trend: one critical, one high, mostly under control.

---

## Scenario 7: Maintaining Memory Health

### Check memory stats

```
What's the wantan-mem status?
```

Wantan uses the `mem_stats` MCP tool:

```json
{
  "total_observations": 847,
  "total_sessions": 42,
  "oldest_observation": "2026-01-15",
  "newest_observation": "2026-04-02",
  "observations_by_agent": {
    "levi": 186,
    "killua": 142,
    "itachi": 98,
    "tanjiro": 124,
    "erwin": 87,
    "shikamaru": 65,
    "hange": 52,
    "l": 48,
    "ochaco": 23,
    "senku": 15,
    "byakuya": 7
  },
  "observations_by_type": {
    "tool_use": 312,
    "review": 186,
    "insight": 142,
    "event": 98,
    "decision": 67,
    "error": 42
  },
  "db_size_bytes": 2456789
}
```

### Prune old observations

Over time, memory grows. Prune observations older than 90 days (they get summarized into weekly digests):

```
Prune wantan-mem observations older than 90 days
```

Wantan calls `POST /api/prune` with `{ "older_than_days": 90 }`:

```json
{
  "pruned": 234,
  "summarized": 18
}
```

234 old observations compressed into 18 weekly digest summaries. Search still works — summaries capture the key topics.

### Export memory for backup

```
Export wantan-mem for backup
```

Wantan calls `GET /api/export`:

```json
{
  "exported_at": "2026-04-02T10:30:00Z",
  "project": "all",
  "count": 613,
  "observations": [...]
}
```

Save this JSON for disaster recovery or migration to a new machine.

### Import memory on a new machine

```
Import wantan-mem from backup file
```

Wantan calls `POST /api/import` with the exported JSON. Skips duplicates.

---

## Scenario 8: Cross-Agent Memory

Agents build on each other's findings across sessions:

**Session 1 (Monday):**
```
/security
```
Itachi finds: "A-rank: `jsonwebtoken` package has CVE-2026-5678. Upgrade to v10.0.1."

**Session 2 (Tuesday):**
```
Tell Tanjiro to upgrade jsonwebtoken to v10.0.1 and update all imports
```

Before Tanjiro starts, Wantan injects Itachi's finding:

> **Context from memory**: Itachi flagged CVE-2026-5678 in jsonwebtoken yesterday. The fix is upgrading to v10.0.1. The package is used in `src/lib/auth.ts` and `src/middleware/jwt.ts`.

Tanjiro starts with full context — no re-investigation needed.

**Session 3 (Wednesday):**
```
Tell Levi to review PR #95
```

Levi sees the jsonwebtoken upgrade PR. Wantan injects:

> **Context from memory**: This PR addresses CVE-2026-5678 flagged by Itachi. Tanjiro upgraded from v9.x to v10.0.1 yesterday. Breaking changes: `verify()` now returns a Promise instead of using callbacks.

Levi focuses on verifying the migration is correct, not re-discovering why the change was made.

---

## The 3-Layer Search Pattern

wantan-mem uses progressive disclosure to save tokens:

### Layer 1: Search (cheap — ~50-100 tokens/result)

```
search("auth middleware bug")
```

Returns: ID, type, agent, snippet (120 chars), date. Scan to find what's relevant.

### Layer 2: Timeline (medium — shows context around a result)

```
timeline(anchor=142, depth_before=3, depth_after=3)
```

Returns: 7 observations showing what happened before and after observation 142. Gives you the story.

### Layer 3: Full Details (expensive — ~500-1000 tokens/result)

```
get_observations(ids=[142, 138])
```

Returns: Complete observation content with full metadata (repo, branch, PR number, severity, etc.).

**Rule**: Always search first, then timeline for context, then fetch full details only for what you actually need. This pattern uses 10x fewer tokens than fetching everything.

---

## Memory Tips

1. **Memory is automatic.** You don't need to manually save — hooks capture observations from every tool use, agent dispatch, and session event.

2. **Search before you dispatch.** Before asking an agent to investigate something, check if memory already has the answer: "Has anyone looked at this before?"

3. **Prune quarterly.** Run `POST /api/prune` with `older_than_days=90` every quarter to keep the database fast. Old observations become weekly digests.

4. **Export before major changes.** Before upgrading the OS, migrating machines, or restructuring the project, export your memory as backup.

5. **Memory makes agents smarter over time.** The longer you use the system, the more context agents have. A 6-month-old memory system catches patterns a fresh one can't.

6. **Use timeline for "why" questions.** When you need to understand why something happened, timeline shows the sequence of events — research → decision → implementation → review.
