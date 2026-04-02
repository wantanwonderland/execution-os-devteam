# RIPER Workflow

For major features and non-trivial changes, Wantan follows the RIPER workflow phases.
(Reverse-engineered from the RIPER-5 methodology)

## When to Use

- New feature development spanning multiple agents
- Architecture changes affecting multiple repos
- Major refactoring or migration efforts
- NOT for: bug fixes, routine captures, simple queries

## Phases

### R — Research

Before any implementation, gather context:
1. Dispatch Wiz for background research (tech evaluation, alternatives)
2. Query wantan-mem for past decisions on the topic
3. Check existing ADRs and RFC docs
4. Present findings to user before proceeding

### I — Innovate

Explore design options:
1. Brainstorm 2-3 approaches with trade-offs
2. Dispatch Senku for architecture evaluation if needed
3. Present options with recommendation
4. Get user approval before proceeding

### P — Plan

Create implementation plan:
1. Use the writing-plans skill to create a detailed plan
2. Define tasks, file changes, and acceptance criteria
3. Identify which agents will be dispatched for each task
4. Get user approval of the plan

### E — Execute

Implement the plan:
1. Dispatch agents per the plan (Diablo for reviews, Killua for tests, etc.)
2. Follow quality gates (validation, gate checks)
3. Track progress via tasks/checkpoints
4. Commit frequently

### R — Review

Verify the work:
1. Dispatch Byakuya for vault audit
2. Dispatch Killua for test execution
3. Dispatch Diablo for code review of changes
4. Run verification checks
5. Present results to user

## Phase Transitions

```
Research → findings presented → user says "proceed" → Innovate
Innovate → options presented → user picks approach → Plan
Plan → plan written → user approves → Execute
Execute → all tasks done → Review
Review → all checks pass → DONE
```

Any phase can loop back: "Let's rethink this" → back to Innovate.
User can skip phases: "Just do it" → jump to Execute.

## Logging

Each phase transition is logged to wantan-mem:
- type: 'decision'
- content: 'RIPER phase {from} → {to}: {reason}'
