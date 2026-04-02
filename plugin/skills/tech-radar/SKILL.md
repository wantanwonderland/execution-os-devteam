---
name: tech-radar
description: Wiz's ThoughtWorks-format tech radar skill. Track technology adoption decisions in four rings, display the current radar, and add or move entries with rationale.
---

# Tech Radar Workflow

When Wiz is dispatched for tech radar management, follow this workflow.

## Overview

The tech radar is a living map of technology decisions. It tracks where each technology stands: actively adopted, under trial, being assessed, or on hold. It is grounded in actual decisions made by the team — every entry must link to a decision record in `vault/04-decisions/log/`.

---

## Ring Definitions

| Ring | Meaning | Action |
|------|---------|--------|
| **Adopt** | We use this in production. Proven, recommended for all new work. | Default choice — no justification needed to use it |
| **Trial** | We are actively using this on a project to evaluate it. | Use it, but with intentional evaluation underway |
| **Assess** | We are aware of this and watching it. Not yet trialing. | Worth tracking; investigate before committing |
| **Hold** | We are stopping new use. May still exist in legacy code. | Do not start new projects with this technology |

Quadrants (optional grouping):

| Quadrant | Examples |
|----------|---------|
| **Languages & Frameworks** | TypeScript, React, FastAPI, Go, Next.js |
| **Infrastructure & Platforms** | AWS, Terraform, Docker, Kubernetes, Vercel |
| **Data & Storage** | PostgreSQL, Redis, SQLite, Kafka, S3 |
| **Tools & Techniques** | GitHub Actions, OpenTelemetry, Playwright, Sentry |

---

## Mode 1: Display Current Radar

Read all decision records in `vault/04-decisions/log/` where `type: tech-radar`:

```bash
grep -rl "type: tech-radar" vault/04-decisions/log/
```

For each matching file, extract frontmatter fields:
- `title` — technology name
- `tags` — includes the ring: `adopt`, `trial`, `assess`, or `hold`
- `created` — date added
- Any `updated` field for date last moved

Display as a text table grouped by ring:

```markdown
## Tech Radar — {date}

### Adopt
Technologies proven in production — use by default.

| Technology | Quadrant | Since | Decision |
|------------|----------|-------|----------|
| TypeScript | Languages & Frameworks | 2024-03-15 | [ADR-012](path) |
| PostgreSQL | Data & Storage | 2023-11-01 | [ADR-005](path) |
| GitHub Actions | Tools & Techniques | 2024-01-10 | [ADR-008](path) |

### Trial
Actively evaluating on a live project.

| Technology | Quadrant | Since | Decision | Trial End Target |
|------------|----------|-------|----------|-----------------|
| Bun | Languages & Frameworks | 2025-02-20 | [ADR-021](path) | 2025-05-01 |

### Assess
On our radar — not yet trialing.

| Technology | Quadrant | Added | Decision |
|------------|----------|-------|----------|
| Deno 2.0 | Languages & Frameworks | 2025-03-10 | [ADR-024](path) |

### Hold
Do not start new use. Migrate existing usage when feasible.

| Technology | Quadrant | Since | Reason | Decision |
|------------|----------|-------|--------|----------|
| Moment.js | Languages & Frameworks | 2024-06-01 | Unmaintained; use date-fns | [ADR-015](path) |
| JavaScript (untyped) | Languages & Frameworks | 2024-03-15 | All new code in TypeScript | [ADR-012](path) |

---
**Total entries**: {n} | **Last updated**: {date of most recent decision}
```

If no tech-radar decisions exist, output:
```
No tech radar entries found. Use `/radar add` to start building the radar.
```

---

## Mode 2: Add Entry

When adding a new technology to the radar:

### Step 1: Check for Existing Entry

Search `vault/04-decisions/log/` for an existing entry with the same technology name:

```bash
grep -rl "{tech-name}" vault/04-decisions/log/
```

If found, surface the existing entry and ask whether to update it (use Mode 3: Move) rather than create a duplicate.

### Step 2: Determine Quadrant

Map the technology to the most appropriate quadrant. If unclear, ask the caller.

### Step 3: Create Decision Record

Write a new file to `vault/04-decisions/log/YYYY-MM-DD-radar-{tech-slug}.md`:

```markdown
---
title: "Tech Radar: {Technology Name}"
created: YYYY-MM-DD
type: tech-radar
tags: [tech-radar, {ring}, {quadrant-tag}]
status: active
project: []
related: []
---

## Technology

**Name**: {Technology Name}
**Ring**: {Adopt | Trial | Assess | Hold}
**Quadrant**: {Languages & Frameworks | Infrastructure & Platforms | Data & Storage | Tools & Techniques}

## Rationale

{reason}

## Context

{What problem does this solve? Why now?}

## Trade-offs

### Why {ring}

{specific reasoning for this ring placement}

### Risks / Watch Points

{What could cause us to move this technology to a different ring?}

## References

- {Links to relevant ADRs, RFCs, or external resources}
```

Quadrant tags: `languages-frameworks`, `infrastructure-platforms`, `data-storage`, `tools-techniques`

### Step 4: Confirm

Report: "Added {Technology} to {Ring} on {date}. Decision record: `{path}`."

---

## Mode 3: Move Entry

When moving a technology from one ring to another:

### Step 1: Find Existing Entry

```bash
grep -rl "{tech-name}" vault/04-decisions/log/
```

If not found, suggest using Mode 2 (Add) instead.

### Step 2: Update Decision Record

Read the existing file. Update:
- `tags` — replace old ring tag with new ring tag
- Add a `## Movement History` section at the bottom if not present, and append the move:

```markdown
## Movement History

| Date | From | To | Reason |
|------|------|----|--------|
| YYYY-MM-DD | {old-ring} | {new-ring} | {reason} |
```

If a `## Movement History` section already exists, append a new row to the table.

Do NOT overwrite the original rationale — movement history is additive.

### Step 3: Confirm

Report: "Moved {Technology} from {old-ring} to {new-ring}. Updated: `{path}`."

---

## Mode 4: Assess (Research a Technology)

When asked to assess a technology and recommend a ring:

### Step 1: Vault Search

Check if any existing decision records or research notes mention the technology:

```bash
grep -rl "{tech-name}" vault/04-decisions/log/ vault/03-research/
```

### Step 2: Research Brief (via Wiz's primary role)

Research the technology:
1. **Maturity**: How long has it existed? Is it v1.0+ with stable API?
2. **Adoption**: Who is using it in production? (Large companies = signal of production-readiness)
3. **Community**: Active maintainers? Recent commits? Response to issues?
4. **Fit**: Does it solve a real problem we have or anticipate?
5. **Risk**: Breaking changes history, security track record, license

### Step 3: Recommend Ring

Apply this decision matrix:

| Condition | Recommended Ring |
|-----------|-----------------|
| Used in production by 10+ large companies, stable API, actively maintained | Adopt |
| Promising, we have a real use case, low switching cost if it fails | Trial |
| Interesting, watching the space, no immediate use case | Assess |
| Unmaintained, superseded by something better, security concerns | Hold |

### Step 4: Output Research Briefing

```markdown
## Tech Radar Assessment: {Technology Name}

**Recommendation**: {Ring}
**Confidence**: HIGH / MEDIUM / LOW

### Summary

{1-2 sentences: what it is and why this ring}

### Evidence

| Factor | Finding | Signal |
|--------|---------|--------|
| Maturity | {e.g., v3.2, released 2020} | Positive |
| Adoption | {e.g., used by Stripe, Vercel, Shopify} | Strong positive |
| Community | {e.g., 2,400 GitHub stars, weekly releases} | Positive |
| Fit | {e.g., solves our current problem with X} | Relevant |
| Risk | {e.g., breaking changes in v2→v3} | Watch point |

### Gaps

- {Information not found that would increase confidence}

### Next Steps

If you agree with the {Ring} recommendation, run: `/radar add {tech} {ring} "{rationale}"`
```

---

## Constraints

- Every radar entry MUST link to a decision record in `vault/04-decisions/log/`
- Rings are an opinion, not a fact — always include rationale
- Movement history is never deleted — moves are additive to the record
- Hold does not mean "delete" — the technology may exist in legacy code
- Assessments without research are guesses — Wiz always researches before recommending
