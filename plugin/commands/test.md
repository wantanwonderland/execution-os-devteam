Trigger Killua for browser/E2E testing, unit tests, integration tests, performance tests, visual regression, and accessibility audits. View results and coverage trends.

Usage:
- `/test` — show test status summary and available scenarios
- `/test run {scenario-tag}` — run scenarios matching a tag (e.g., `smoke`, `auth`, `critical`)
- `/test run all` — run all active scenarios
- `/test results` — show latest test run results
- `/test coverage` — show which flows have scenarios and which don't
- `/test unit {file or dir}` — generate and run unit tests for changed or specified files
- `/test integration {service}` — scaffold integration tests for an API service or route file
- `/test perf {endpoint}` — generate k6 load test script and run against target endpoint
- `/test visual {url}` — capture or compare visual regression screenshots (multi-viewport)
- `/test a11y {url}` — run WCAG 2.1 AA accessibility audit with axe-core

## Steps

### Mode: Status (default, no arguments)

1. **Latest test run**: Query `test_runs` table in `data/company.db` for the most recent entry. Show: date, trigger, test type, pass/fail/skip counts, coverage percentage.

2. **Available scenarios**: List all `.md` files in `02-docs/test-scenarios/` (excluding _template.md). For each, show: title, priority, project, status. Group by priority (critical first).

3. **Coverage gaps**: Check which projects in `01-projects/` have test scenarios vs which don't. Flag projects with zero scenarios.

4. **Test pass rates by type**: Query `test_runs` for last 7 days, grouped by `test_type` (browser, unit, integration, perf, visual, a11y). Show trend: pass rate per day per type.

### Mode: Run (with tag or "all")

1. **Select scenarios**: Read all `.md` files in `02-docs/test-scenarios/` where `status: active`. If a tag was provided, filter to scenarios containing that tag.

2. **Dispatch Killua**: For each matching scenario, dispatch Killua with:
   - The full scenario content (steps, URLs, viewports, browsers)
   - Instruction to use Playwright MCP for browser automation
   - Instruction to save screenshots for failures to `.claude/test-evidence/YYYY-MM-DD/`
   - Instruction to write results summary

3. **Collect results**: After Killua returns, compile results into a browser test report using the standard format:

```markdown
## Browser Test Report -- YYYY-MM-DD

**Trigger**: manual (/test run {tag})
**Duration**: {time}
**Scenarios**: {count} run, {passed} passed, {failed} failed

| Scenario | Chromium | Firefox | WebKit | Result |
|----------|----------|---------|--------|--------|
| {title}  | PASS/FAIL | PASS/FAIL | PASS/FAIL | PASS/FAIL |

### Failures
- {Scenario > Step (Browser/Viewport)}: {description}. Screenshot: {path}

### Recommendation
{next action}
```

4. **Write results**:
   - Insert into `test_runs` table: repo, test_type='browser', total, passed, failed, skipped, run_at, triggered_by='killua'
   - Write vault report to `09-ops/test-reports/YYYY-MM-DD-test-summary.md`

5. **Route failures**: If any tests failed, surface them:
   - Severity critical → "Block deploy. Route to Shikamaru."
   - Severity high → "Route to Levi for PR review."
   - Severity medium → "Flag in next standup."

### Mode: Results

1. Query `test_runs` table for last 5 runs. Show: date, type, pass/fail counts, triggered_by.
2. If the most recent run has failures, show the failure details from `09-ops/test-reports/`.

### Mode: Coverage

1. List all projects from `01-projects/`.
2. For each project, count scenarios in `02-docs/test-scenarios/` matching that project.
3. Show coverage table:

```markdown
| Project | Scenarios | Critical | High | Medium | Coverage |
|---------|-----------|----------|------|--------|----------|
| {name}  | {count}   | {count}  | {n}  | {n}    | {status} |
```

4. Flag projects with zero scenarios as "NO COVERAGE".

### Mode: Unit (with file or directory)

Dispatch Killua to generate and run unit tests for the specified target.

1. **Detect framework**: Check `package.json` (Jest/Vitest), `pyproject.toml`/`pytest.ini` (Pytest), or `go.mod` (Go).

2. **Identify testable units**: From the target file(s), extract exported functions, classes, and methods. If target is a directory, list all source files and prioritize those with no existing test file.

3. **Dispatch Killua** with:
   - Target file path(s)
   - Detected framework
   - Instruction to follow `plugin/skills/unit-test-gen/SKILL.md`
   - Instruction to write test files alongside source files

4. **Run tests**:
   ```bash
   # Jest/Vitest
   npx jest {testfile} --coverage
   # Pytest
   pytest {testfile} -v --tb=short
   # Go
   go test ./{package}/... -v
   ```

5. **Write results**: Insert into `test_runs` (test_type='unit'). Write vault report to `09-ops/test-reports/YYYY-MM-DD-unit-tests.md`.

6. **Route failures**: If tests fail after generation, surface to Wantan with root cause (missing mock, untestable unit needing refactor, implementation bug).

### Mode: Integration (with service name)

Dispatch Killua to scaffold integration tests for a service or API.

1. **Discover endpoints**: Find route files in `src/routes/`, `app/routers/`, or equivalent for the named service.

2. **Classify test types needed**: API endpoint tests, DB integration tests, or contract tests (if multiple services are involved).

3. **Dispatch Killua** with:
   - Service name and route file paths
   - Instruction to follow `plugin/skills/integration-test/SKILL.md`
   - DB strategy preference (test containers if Docker available, else in-memory SQLite)

4. **Write test files**: Scaffolded to `tests/integration/{service}/` or equivalent per project convention.

5. **Write results**: Insert into `test_runs` (test_type='integration'). Write vault report to `09-ops/test-reports/YYYY-MM-DD-integration-{service}.md`.

### Mode: Perf (with endpoint)

Dispatch Killua to generate and run a k6 load test for the specified endpoint.

1. **Parse endpoint**: Extract method + path (e.g., `POST /api/orders`).

2. **Check for existing baseline**: Look in `09-ops/perf-baselines/` for a saved baseline for this endpoint.

3. **Dispatch Killua** with:
   - Endpoint details (method, path, example payload)
   - Baseline path if it exists
   - Instruction to follow `plugin/skills/perf-test/SKILL.md`
   - `BASE_URL` from environment or ask Wantan

4. **Run k6**:
   ```bash
   k6 run --env BASE_URL={url} --out json=/tmp/perf-result.json 02-docs/perf-tests/{endpoint-slug}.js
   ```
   If k6 not available, generate the script and report the install command.

5. **Regression check**: If baseline exists, compare p95 latency. Flag if >10% regression.

6. **Write results**: Insert into `test_runs` (test_type='perf'). Write vault report to `09-ops/test-reports/YYYY-MM-DD-perf-{endpoint-slug}.md`.

7. **Route failures**: If thresholds fail → "Performance regression detected. Route to Levi before deploy."

### Mode: Visual (with URL)

Dispatch Killua to capture or compare visual regression screenshots.

1. **Determine mode**: If no baseline exists in `.claude/visual-baselines/` for the URL, capture. If baseline exists, compare.

2. **Dispatch Killua** with:
   - Target URL
   - Instruction to follow `plugin/skills/visual-regression/SKILL.md`
   - Viewports: desktop (1280x800), tablet (768x1024), mobile (375x812)

3. **Run Playwright**:
   ```bash
   # Capture baseline
   npx playwright test visual-regression.spec.ts --update-snapshots
   # Compare
   npx playwright test visual-regression.spec.ts
   ```

4. **Report diffs**: Any screenshot exceeding `maxDiffPixels: 100` is a failure. Save diffs to `.claude/test-evidence/YYYY-MM-DD/`.

5. **Write results**: Insert into `test_runs` (test_type='visual'). Write vault report to `09-ops/test-reports/YYYY-MM-DD-visual-{page-slug}.md`.

6. **Route failures**: Visual diff found → "Visual regression detected on {viewport}. Review diff at {path}. Route to Levi."

### Mode: a11y (with URL)

Dispatch Killua to run a WCAG 2.1 AA accessibility audit.

1. **Verify tooling**: Check that `@axe-core/playwright` is installed. If not, generate audit spec and surface install command.

2. **Dispatch Killua** with:
   - Target URL
   - Instruction to follow `plugin/skills/a11y-test/SKILL.md`
   - Full WCAG 2.1 AA rule set (`wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`)

3. **Run audit**:
   ```bash
   TARGET_URL={url} npx playwright test a11y-audit.spec.ts --reporter=html
   ```

4. **Classify violations by severity**: critical (P0), serious (P1), moderate (P2), minor (P3).

5. **Write results**: Insert into `test_runs` (test_type='a11y'). Write vault report to `09-ops/test-reports/YYYY-MM-DD-a11y-{page-slug}.md`.

6. **Route failures**:
   - Critical/Serious → "Block deploy. Accessibility violations prevent users from completing tasks. Route to Levi."
   - Moderate/Minor → "Log as tech-debt. Fix in next sprint. File in `04-decisions/log/`."
