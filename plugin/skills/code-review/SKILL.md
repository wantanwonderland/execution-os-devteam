---
name: code-review
description: Levi's structured PR review skill. Multi-angle code review with architecture, bugs, security, and style checks. Reverse-engineered from AgentSys patterns.
---

# Code Review Workflow

When Levi is dispatched to review a PR, follow this workflow exactly.

## Input

Levi receives a PR number and repo. Gather context before reviewing.

## Phase 1: Context Gathering

1. **Read the diff**: `gh pr diff {number} --repo {repo}`
2. **Read PR description**: `gh pr view {number} --repo {repo} --json title,body,labels,files`
3. **Check file count**: If >500 lines changed, recommend splitting: "This PR is too large for thorough review. Consider splitting into {suggested splits based on file groupings}."
4. **Load ADRs**: Read `02-docs/adr/` for relevant architecture decisions
5. **Check history**: Query wantan-mem for previous reviews on the same repo/module

## Phase 2: Four-Angle Review

Review the diff from four independent angles. For each, scan every changed file.

### Angle 1: Architecture & Drift Detection
(From AgentSys drift-detect pattern — regex + AST analysis before LLM judgment)

- Does this change follow existing code patterns in the repo?
- Are imports, file structure, naming conventions consistent with the codebase?
- Does it introduce new patterns that diverge from established ADRs?
- Is there unnecessary coupling between modules?
- Grade each finding: HIGH/MEDIUM/LOW certainty

### Angle 2: Bug Hunting

- Null/undefined access without guards
- Race conditions in async code
- Missing error handling on external calls (API, DB, file I/O)
- Off-by-one errors in loops/pagination
- Resource leaks (unclosed connections, streams, file handles)
- Edge cases: empty arrays, zero values, missing optional fields

### Angle 3: Security Surface
(From Trail of Bits audit-context-building + insecure-defaults patterns)

- User input flowing to SQL, shell commands, file paths, HTML output without sanitization
- Hardcoded credentials, API keys, secrets in code
- Insecure defaults: fail-open auth, permissive CORS, disabled CSRF
- Dependency changes: new packages added — check for known vulnerabilities
- Timing side-channels in authentication/comparison logic

### Angle 4: Readability & AI Artifact Cleanup
(From AgentSys deslop pattern)

- Variable/function names: do they describe what the code does?
- Comments: present where logic is non-obvious, absent where code is self-documenting
- Dead code: unused imports, unreachable branches, commented-out code
- AI artifacts: excessive console.log, TODO markers that should be issues, overly verbose error messages
- Test quality: do tests verify behavior (not just mock behavior)?

## Phase 3: Compile Review

Combine findings from all 4 angles into one structured review:

```markdown
## PR Review: #{number} — {title}

**Author**: {name} | **Files changed**: {count} | **Lines**: +{additions} -{deletions}
**Cleanliness**: {N}/10

### Critical (must fix before merge)
- `file.ts:42` — [BUG] {description}
- `file.ts:78` — [SECURITY] {description}

### Warnings (should fix, not blocking)
- `file.ts:15` — [ARCHITECTURE] {description}
- `file.ts:90` — [READABILITY] {description}

### Nits (optional improvements)
- `file.ts:3` — [STYLE] {description}

### Drift Detection
{HIGH/MEDIUM/LOW findings on pattern divergence, if any}

### Verdict: APPROVE / CHANGES REQUESTED / COMMENT
{one-line summary with rationale}
```

## Phase 4: Gate Check

Per Levi's gate policy:
- If verdict includes GitHub comment → write draft to `.claude/owner-inbox/` with full review text
- If verdict is vault-only → write to `09-ops/` directly
- Log review to wantan-mem as observation

## Constraints

- NEVER auto-approve without reading the full diff
- EVERY comment must have file:line reference
- Rate cleanliness honestly — 10/10 is rare and earned
- If PR is too large (>500 lines), recommend splitting BEFORE reviewing
- Do not rewrite code — review only. Wantan routes fixes.
