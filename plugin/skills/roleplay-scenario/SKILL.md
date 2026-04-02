---
name: roleplay-scenario
description: Generate persona-driven roleplay test scenarios for live browser testing. Each scenario defines a user persona, their goals, device, and step-by-step journey through the app. Used by Killua for E2E live testing.
---

# Roleplay Scenario Generator

Roleplay scenarios are structured test plans written from the perspective of a specific user persona. Each scenario walks through a real user journey — not abstract test cases — making them ideal for live browser testing with `live-browser-test` skill.

## When to Use

- After Lelouch writes a spec (Phase 1) — generate scenarios from acceptance criteria
- After Rohan delivers design specs (Phase 2) — add visual verification steps
- Before Killua runs live tests (Phase 3.5) — scenarios drive the test execution
- When a new feature needs E2E coverage
- When a bug report needs a reproduction scenario

## Input

To generate a roleplay scenario, Killua needs:
1. **The approved spec** — acceptance criteria and edge cases from Lelouch
2. **Design specs** (if UI) — Rohan's aesthetic direction, responsive breakpoints
3. **Target URL** — where the feature lives in the running app

## Scenario Structure

Each scenario follows this template:

```markdown
---
title: "{Feature} — {Persona Name} Journey"
created: YYYY-MM-DD
type: test-scenario
tags: [roleplay, e2e, {feature-tag}]
status: active
project: {project}
related: [{spec-file}, {design-spec-file}]
persona: {persona-name}
device: {desktop | tablet | mobile}
---

## Persona

**Name**: {persona name}
**Role**: {who they are — e.g., "first-time visitor," "returning customer," "admin user"}
**Goal**: {what they want to accomplish}
**Device**: {device + viewport — e.g., "iPhone 14 Pro (393x852)" or "MacBook Pro (1440x900)"}
**Behavior**: {how they interact — e.g., "impatient, skips instructions" or "methodical, reads everything"}
**Technical level**: {novice | intermediate | power user}

## Preconditions

- {app state required — e.g., "logged out," "has existing account," "empty cart"}
- {test data needed — e.g., "product with ID 123 exists," "user has 3 items in cart"}
- {feature flags — e.g., "dark mode enabled"}

## Journey

### Step 1: {action name}
- **Action**: {what the persona does — e.g., "Lands on homepage from Google search"}
- **URL**: {target URL}
- **Interact**: {specific interactions — click, scroll, type}
- **Expect**: {what they should see — visible elements, text, layout}
- **Screenshot**: {yes/no — capture evidence at this step}

### Step 2: {action name}
- **Action**: {next action}
- **Interact**: {interactions}
- **Expect**: {expected state}
- **Screenshot**: {yes/no}

### Step N: {completion}
- **Action**: {final action — e.g., "Sees confirmation page"}
- **Expect**: {success state}
- **Screenshot**: yes

## Edge Cases to Test

- {edge case from spec — e.g., "What if the user double-clicks the submit button?"}
- {edge case — e.g., "What if the network is slow (3G)?"}
- {edge case — e.g., "What if the user navigates back mid-flow?"}

## On Failure

- **Severity**: {critical | high | medium | low}
- **Route to**: {Conan for fix | Diablo for review | Shikamaru to block deploy}
- **Notes**: {context for the fixer}
```

## Persona Library

Generate personas based on the feature's target users. Common personas:

| Persona | Device | Behavior | Use When |
|---------|--------|----------|----------|
| **First-Time Visitor** | Mobile (375px) | Impatient, skips instructions | Onboarding, landing pages, sign-up |
| **Returning User** | Desktop (1440px) | Knows the UI, uses shortcuts | Core workflows, dashboards |
| **Power User** | Desktop (1280px) | Tests edge cases naturally | Complex features, admin panels |
| **Distracted Mobile User** | Mobile (393px) | Interrupted, resumes later | Forms, checkout, multi-step flows |
| **Accessibility User** | Desktop (1280px) | Keyboard-only, screen reader | All features — a11y compliance |
| **Slow Connection User** | Mobile (375px) | 3G throttled, impatient | Loading states, offline behavior |
| **Admin / Staff** | Desktop (1440px) | Manages other users' data | Admin panels, moderation tools |

## Generation Workflow

1. **Read the spec** — extract acceptance criteria and edge cases
2. **Identify personas** — pick 2-4 personas that represent the feature's users
3. **Map journeys** — for each persona, write the step-by-step journey
4. **Add edge cases** — assign spec edge cases to the most relevant persona
5. **Set viewports** — match each persona to their likely device
6. **Write scenarios** — one file per persona, saved to `vault/02-docs/test-scenarios/roleplay/`

## Naming Convention

```
vault/02-docs/test-scenarios/roleplay/YYYY-MM-DD-{feature}-{persona-slug}.md
```

Examples:
- `2026-04-02-checkout-flow-first-time-visitor.md`
- `2026-04-02-checkout-flow-returning-user.md`
- `2026-04-02-checkout-flow-mobile-distracted.md`

## How Killua Uses These

1. Killua reads the roleplay scenario
2. For each step, Killua uses `live-browser-test` skill to execute in a real browser
3. At each "Expect" assertion, Killua verifies the UI matches
4. At each "Screenshot: yes" step, Killua captures evidence
5. Results are compiled into a per-persona test report

## Constraints

- Minimum 2 personas per feature (happy path user + edge case user)
- Every scenario must have at least one mobile viewport persona
- Every step must have an explicit "Expect" — no steps without assertions
- Edge cases from the spec MUST be covered — assign each to a persona
- Scenarios are living documents — update when the spec changes
- Never write vague expectations like "page loads correctly" — be specific about what is visible
