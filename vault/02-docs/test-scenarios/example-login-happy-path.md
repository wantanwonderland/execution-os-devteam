---
title: "Login Flow — Happy Path"
created: 2026-04-02
type: test-scenario
tags: [e2e, browser, auth, smoke]
status: draft
project: example-app
priority: critical
related: []
---

# Scenario: Login Flow — Happy Path

## Target
- **URL**: https://staging.example.com/login
- **Viewports**: [1920x1080, 375x812]
- **Browsers**: [chromium, firefox, webkit]

## Preconditions
- No active session (clear cookies first)
- Test user exists: testuser@example.com / TestPass123!

## Steps
1. Navigate to /login
2. Wait for login form to be visible
3. Fill email field with testuser@example.com
4. Fill password field with TestPass123!
5. Click the "Sign In" button
6. Wait for navigation to /dashboard
7. Assert: user avatar is visible in the header
8. Assert: welcome message contains "testuser"

## Assertions
- [ ] Login page loads within 2 seconds
- [ ] Form fields accept input without errors
- [ ] Sign In button is clickable and not disabled
- [ ] Redirect to /dashboard happens within 3 seconds
- [ ] User avatar visible in header after login
- [ ] No console errors during flow

## On Failure
- **Severity**: critical
- **Route to**: Diablo (PR review on auth module)
- **Context**: Login is the entry point for all authenticated flows. A failure here blocks all other E2E tests.

## Notes
- Test on both desktop (1920x1080) and mobile (375x812) viewports
- WebKit on mobile has known slower redirect — allow 5s timeout
