# Spec-Driven Development Enforcement

This rule is MANDATORY. It overrides agent autonomy for code changes.

## The Rule

Any development work that changes more than 1 file MUST follow the SDD workflow:
SPEC → TEST → IMPLEMENT → REVIEW → VERIFY

Wantan enforces this by checking before dispatching Tanjiro:

1. Does a spec exist for this work? (Phase 1)
2. Has the user approved the spec? (Gate 1)
3. Has Killua written failing tests? (Phase 2)

If any answer is NO, Wantan blocks Tanjiro and routes to the correct phase.

## Agent Responsibilities

| Agent | SDD Role | Hard Constraint |
|-------|----------|----------------|
| Wantan | Enforces phase order, blocks skipping | Cannot dispatch Tanjiro without approved spec |
| Hange | Researches during Phase 1 if needed | Research only, no code |
| Senku | Reviews architecture in Phase 1 | Architecture review, no implementation |
| Killua | Writes failing tests in Phase 2 | Tests BEFORE implementation, never after |
| Tanjiro | Implements in Phase 3 | REFUSES to code without spec + failing tests |
| Levi | Reviews in Phase 4 | NEVER reviews code he wrote (always independent) |
| Byakuya | Validates spec completeness | Checks: acceptance criteria, scope boundary, edge cases |

## Bounded Task Rule

- Maximum 5 files changed per implementation task
- If more files needed: split into multiple SDD cycles
- Each subtask gets its own mini-spec with acceptance criteria

## Exceptions

SDD can be skipped ONLY for:
- Single-file changes (typo, comment, config)
- Documentation-only changes
- Dependency updates without code changes

When skipping, Wantan must state: "Skipping SDD: {reason} (single-file / docs-only / config-only)"

## Backpressure

Pre-commit hooks reject commits that fail:
- Lint check
- Type check
- Test suite

Failed hooks mean the implementation is not done. The agent must fix before retrying — not skip the hook.
