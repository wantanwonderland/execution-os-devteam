---
title: "Scenario Name — Variant"
created: YYYY-MM-DD
type: test-scenario
tags: [e2e, browser, FEATURE_TAG]
status: active
project: PROJECT_NAME
priority: critical | high | medium | low
related: []
---

# Scenario: {Name}

## Target
- **URL**: https://staging.example.com/path
- **Viewports**: [1920x1080, 768x1024, 375x812]
- **Browsers**: [chromium, firefox, webkit]

## Preconditions
- User is logged in as {role}
- Feature flag {flag} is enabled
- Test data: {describe any required state}

## Steps
1. Navigate to {URL}
2. {Action}: {element} — {expected result}
3. {Action}: {element} — {expected result}
4. Assert: {what should be true}
5. Assert: {what should be true}

## Assertions
- [ ] Page loads within 3 seconds
- [ ] {Critical assertion}
- [ ] {Critical assertion}
- [ ] No console errors

## On Failure
- **Severity**: critical | high | medium
- **Route to**: Diablo (PR review) | Shikamaru (deploy block) | Kazuma (sprint flag)
- **Context**: {What this failure likely means}

## Notes
- {Any special instructions for Killua}
- {Known flaky conditions}
