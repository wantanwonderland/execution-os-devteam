---
title: "Smoke Test — Critical Paths"
created: 2026-04-02
type: test-scenario
tags: [e2e, browser, smoke, critical]
status: draft
project: example-app
priority: critical
related: []
---

# Scenario: Smoke Test — Critical Paths

This is the minimum test suite that MUST pass before any production deploy.
Killua runs this automatically on every staging deploy.

## Target
- **URL**: https://staging.example.com
- **Viewports**: [1920x1080]
- **Browsers**: [chromium]

## Preconditions
- Fresh staging deploy completed
- Test user exists

## Steps

### 1. Homepage loads
1. Navigate to /
2. Assert: page title is correct
3. Assert: main content area is visible
4. Assert: no 5xx errors in network tab

### 2. Login works
1. Navigate to /login
2. Login with test credentials
3. Assert: redirect to /dashboard

### 3. Core feature accessible
1. Navigate to /dashboard
2. Assert: main feature panel is visible
3. Click primary action button
4. Assert: expected response within 5 seconds

### 4. API health
1. Navigate to /api/health (or equivalent)
2. Assert: returns 200 status
3. Assert: response contains expected fields

## Assertions
- [ ] All 4 critical paths pass
- [ ] Total execution time under 30 seconds
- [ ] No 5xx errors on any page
- [ ] No unhandled JavaScript exceptions

## On Failure
- **Severity**: critical
- **Route to**: Shikamaru (block production deploy) + Diablo (identify breaking change)
- **Context**: If smoke tests fail, production deploy MUST be blocked. Rollback staging if recently deployed.

## Notes
- Run on Chromium only for speed (full browser matrix in regression suite)
- This is the post-deploy gate — fast execution is prioritized over coverage
