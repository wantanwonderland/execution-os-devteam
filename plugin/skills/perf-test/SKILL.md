---
name: perf-test
description: Killua generates k6 load test scripts from API endpoints, captures baseline metrics, and detects performance regressions (>10% latency increase). Tracks p95 latency, error rate, and throughput.
---

# Performance Test (Load Testing)

When Killua is dispatched to run performance tests, follow this workflow exactly.

## Input

Killua receives one of:
- An API endpoint path (e.g., `POST /api/orders`)
- A service name to test all its endpoints
- A "baseline" or "compare" instruction

## Execution Flow

### 1. Identify Endpoints to Test

If given a single endpoint, use it directly.

If given a service name, discover endpoints:
```bash
# From route files
grep -r "router\.\(get\|post\|put\|delete\|patch\)" src/routes/
# From OpenAPI spec
cat openapi.json | jq '.paths | keys[]'
# From FastAPI
grep -r "@app\.\(get\|post\|put\|delete\)" app/
```

Prioritize endpoints by load risk:
1. **High priority**: Auth endpoints, checkout/payment flows, search, data-heavy GETs
2. **Medium priority**: CRUD operations, dashboard APIs
3. **Low priority**: Admin endpoints, rarely-called utilities

### 2. Generate k6 Script

```javascript
// k6 load test script — generated for {endpoint}
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const reqDuration = new Trend('req_duration', true);
const requestCount = new Counter('request_count');

// Test configuration
export const options = {
  // Ramp-up → steady state → ramp-down
  stages: [
    { duration: '30s', target: 10 },   // ramp up to 10 VUs
    { duration: '1m',  target: 10 },   // hold at 10 VUs
    { duration: '30s', target: 50 },   // ramp up to 50 VUs
    { duration: '2m',  target: 50 },   // hold at 50 VUs
    { duration: '30s', target: 0  },   // ramp down
  ],

  // Pass/fail thresholds
  thresholds: {
    // p95 latency under 500ms
    'http_req_duration': ['p(95)<500'],
    // p99 latency under 1500ms
    'http_req_duration{expected_response:true}': ['p(99)<1500'],
    // Error rate below 1%
    'errors': ['rate<0.01'],
    // At least 100 requests/second at steady state
    'http_reqs': ['rate>100'],
  },
};

// Test data — use realistic payloads
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${AUTH_TOKEN}`,
};

// Scenario: {endpoint description}
export default function () {
  // ---- Replace with actual endpoint details ----
  const payload = JSON.stringify({
    // Insert realistic test payload here
  });

  const res = http.post(`${BASE_URL}/api/endpoint`, payload, { headers });

  // Assertions
  const success = check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
    'response has expected field': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.id !== undefined;
      } catch {
        return false;
      }
    },
  });

  // Record custom metrics
  errorRate.add(!success);
  reqDuration.add(res.timings.duration);
  requestCount.add(1);

  // Realistic think time between requests
  sleep(Math.random() * 2 + 0.5); // 0.5–2.5 seconds
}
```

#### Multi-Endpoint Script (service-level test)

```javascript
import http from 'k6/http';
import { check, group, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 20 },
    { duration: '3m', target: 20 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    'http_req_duration': ['p(95)<500'],
    'http_req_failed': ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  group('Create resource', () => {
    const res = http.post(`${BASE_URL}/api/resources`, JSON.stringify({
      name: `test-${Date.now()}`,
    }), { headers: { 'Content-Type': 'application/json' } });

    check(res, { 'created': (r) => r.status === 201 });
    const id = JSON.parse(res.body).id;

    group('Read resource', () => {
      const getRes = http.get(`${BASE_URL}/api/resources/${id}`);
      check(getRes, { 'found': (r) => r.status === 200 });
    });

    group('Update resource', () => {
      const putRes = http.put(`${BASE_URL}/api/resources/${id}`,
        JSON.stringify({ name: 'updated' }),
        { headers: { 'Content-Type': 'application/json' } }
      );
      check(putRes, { 'updated': (r) => r.status === 200 });
    });
  });

  sleep(1);
}
```

### 3. Baseline Capture Workflow

Run once on a known-good build to capture baseline metrics.

```bash
# Run test and save baseline results to JSON
k6 run \
  --env BASE_URL=http://localhost:3000 \
  --env AUTH_TOKEN=${AUTH_TOKEN} \
  --out json=.claude/perf-baselines/YYYY-MM-DD-{endpoint-slug}.json \
  plugin/skills/perf-test/scripts/{endpoint-slug}.js

# Extract key metrics from JSON output
cat .claude/perf-baselines/YYYY-MM-DD-{endpoint-slug}.json | \
  jq '{
    p50: .metrics.http_req_duration.values."p(50)",
    p95: .metrics.http_req_duration.values."p(95)",
    p99: .metrics.http_req_duration.values."p(99)",
    rps: .metrics.http_reqs.values.rate,
    error_rate: .metrics.http_req_failed.values.rate
  }'
```

Save baseline summary to `vault/09-ops/perf-baselines/YYYY-MM-DD-{endpoint-slug}-baseline.json`:

```json
{
  "endpoint": "POST /api/endpoint",
  "captured_at": "YYYY-MM-DD",
  "git_sha": "{commit hash}",
  "metrics": {
    "p50_ms": 45,
    "p95_ms": 120,
    "p99_ms": 280,
    "rps": 340,
    "error_rate": 0.001
  }
}
```

### 4. Regression Detection

Compare current run against saved baseline.

```bash
# Run current test
k6 run --out json=/tmp/current-run.json scripts/{endpoint-slug}.js

# Extract current metrics
CURRENT_P95=$(cat /tmp/current-run.json | jq '.metrics.http_req_duration.values."p(95)"')
BASELINE_P95=$(cat vault/09-ops/perf-baselines/{endpoint-slug}-baseline.json | jq '.metrics.p95_ms')

# Calculate regression
python3 -c "
current = $CURRENT_P95
baseline = $BASELINE_P95
delta = ((current - baseline) / baseline) * 100
print(f'p95 delta: {delta:+.1f}%')
if abs(delta) > 10:
    print('REGRESSION DETECTED' if delta > 0 else 'IMPROVEMENT DETECTED')
"
```

**Regression thresholds** — flag as regression when:
- p95 latency increases >10% from baseline
- Error rate increases >50% from baseline (e.g., 0.1% → 0.15%)
- Throughput (RPS) drops >15% from baseline

### 5. Thresholds Reference

| Metric | Green | Yellow (investigate) | Red (block deploy) |
|--------|-------|---------------------|-------------------|
| p95 latency | <200ms | 200–500ms | >500ms |
| p99 latency | <500ms | 500ms–1500ms | >1500ms |
| Error rate | <0.1% | 0.1–1% | >1% |
| Throughput | >baseline | 85–100% of baseline | <85% of baseline |
| Regression vs baseline | <5% delta | 5–10% delta | >10% delta |

### 6. Run Commands

```bash
# Basic run (stdout only)
k6 run script.js

# With environment variables
k6 run --env BASE_URL=http://localhost:3000 --env AUTH_TOKEN=xxx script.js

# Save to JSON for comparison
k6 run --out json=results.json script.js

# Real-time dashboard (requires k6 web dashboard)
K6_WEB_DASHBOARD=true k6 run script.js

# Cloud run (requires k6 cloud account)
k6 cloud script.js
```

If k6 is not installed:
```bash
# macOS
brew install k6
# Docker
docker run --rm -i grafana/k6 run - < script.js
```

### 7. Write Results

1. **k6 script**: Save to `vault/02-docs/perf-tests/{endpoint-slug}.js`
2. **Baseline** (if captured): Save to `vault/09-ops/perf-baselines/YYYY-MM-DD-{endpoint-slug}-baseline.json`
3. **Insert into DB**:
   ```bash
   sqlite3 vault/data/company.db "INSERT INTO test_runs (repo, test_type, total, passed, failed, skipped, run_at, triggered_by) VALUES ('{repo}', 'perf', {total}, {passed}, {failed}, 0, datetime('now'), 'killua');"
   ```
4. **Vault report**: Write to `vault/09-ops/test-reports/YYYY-MM-DD-perf-test.md`:

```markdown
---
title: "Perf Test -- {endpoint} -- YYYY-MM-DD"
created: YYYY-MM-DD
type: note
tags: [testing, perf-test, performance]
status: active
project: []
related: []
---

## Performance Test Report -- YYYY-MM-DD

**Endpoint**: {endpoint}
**VU Profile**: ramp 10→50, 5m total
**Baseline**: {baseline date or "first run — baseline captured"}

| Metric | Baseline | Current | Delta | Status |
|--------|----------|---------|-------|--------|
| p50 latency | {x}ms | {y}ms | {+/-z}% | {green/yellow/red} |
| p95 latency | {x}ms | {y}ms | {+/-z}% | {green/yellow/red} |
| p99 latency | {x}ms | {y}ms | {+/-z}% | {green/yellow/red} |
| Error rate | {x}% | {y}% | {+/-z}% | {green/yellow/red} |
| Throughput | {x} RPS | {y} RPS | {+/-z}% | {green/yellow/red} |

### Threshold Results
- All thresholds passed: {YES/NO}
- {Any failed threshold with value}

### Recommendation
{GREEN: No regressions detected. Safe to deploy. / YELLOW: Investigate before deploy. / RED: Block deploy. Route to Diablo.}
```

## Constraints

- Never run load tests against production without explicit confirmation from Wantan
- Always use `--env BASE_URL` — never hardcode URLs in scripts
- Baseline files are stored in `vault/09-ops/perf-baselines/` — never delete them
- If k6 is not available, report clearly: "k6 not installed. Script generated at {path}. Install k6 to run."
- Regression threshold is 10% — do not soften this without explicit instruction
- Report exact metric values — never round or approximate
