---
name: security-scan
description: Itachi's security scanning skill. Dependency audits, SAST, secrets detection, supply chain risk analysis. Reverse-engineered from Trail of Bits security skills.
---

# Security Scan Workflow

When Itachi is dispatched to scan a repo, follow this workflow exactly.

## Input

Itachi receives a repo name and optional scan type (dependency, sast, secrets, supply-chain, full).
Default is "full" — run all scan types.

## Scan Type 1: Dependency Audit
(From Trail of Bits supply-chain-risk-auditor)

1. **GitHub Dependabot alerts**: `gh api repos/{owner}/{repo}/dependabot/alerts --jq '.[] | select(.state=="open") | {number, severity: .security_advisory.severity, package: .dependency.package.name, cve: .security_advisory.cve_id, title: .security_advisory.summary}'`
2. **Lock file analysis**: Read package-lock.json / yarn.lock / pnpm-lock.yaml / Gemfile.lock / go.sum. Flag:
   - Packages with known CVEs
   - Packages not updated in >12 months
   - Packages with <100 weekly downloads (supply chain risk)
3. **Transitive dependency depth**: Flag packages pulling in >50 transitive deps (attack surface)

## Scan Type 2: Static Analysis (SAST)
(From Trail of Bits static-analysis + insecure-defaults)

Check every changed file for:

### Injection Vulnerabilities
- **SQL injection**: String concatenation in SQL queries (not parameterized)
- **Command injection**: User input in shell exec, child_process, os.system
- **Path traversal**: User input in file paths without sanitization
- **XSS**: User input rendered in HTML without escaping
- **Template injection**: User input in template strings evaluated server-side

### Insecure Defaults
- Hardcoded `admin/admin`, `password`, `secret` credentials
- `cors: { origin: '*' }` or equivalent permissive CORS
- Disabled CSRF protection
- `eval()` or `Function()` with dynamic input
- `dangerouslySetInnerHTML` or equivalent without sanitization
- HTTP instead of HTTPS for API calls
- JWT tokens without expiration
- Debug/verbose error messages in production code

### Cryptographic Issues
(From Trail of Bits constant-time-analysis)
- Non-constant-time string comparison for auth tokens/passwords
- Weak hash algorithms (MD5, SHA1) for security purposes
- Hardcoded encryption keys or IVs
- Math.random() for security-sensitive values

## Scan Type 3: Secrets Detection

Grep for patterns indicating leaked secrets:

```bash
# API keys and tokens
grep -rn --include='*.{js,ts,py,go,rb,java,yaml,yml,json,env}' \
  -E '(api[_-]?key|api[_-]?secret|access[_-]?token|auth[_-]?token|private[_-]?key|client[_-]?secret)' \
  --exclude-dir=node_modules --exclude-dir=.git

# AWS keys
grep -rn -E 'AKIA[0-9A-Z]{16}' --exclude-dir=node_modules --exclude-dir=.git

# Generic secrets
grep -rn -E '(password|passwd|pwd)\s*[=:]\s*["\x27][^"\x27]{8,}' --exclude-dir=node_modules --exclude-dir=.git
```

Verify each match: is it a real secret or a variable name / test fixture?
- Real secret → CRITICAL finding
- Test fixture → skip
- Variable name referencing env var → skip

## Scan Type 4: Supply Chain Risk
(From Trail of Bits supply-chain-risk-auditor)

1. **New dependencies**: Check git diff for new entries in package.json / requirements.txt / go.mod
2. **For each new dep**: Check npm/PyPI for:
   - Package age (created <6 months ago = risk)
   - Maintainer count (1 maintainer = bus factor risk)
   - Weekly downloads (<1000 = low adoption risk)
   - Known typosquatting patterns (names similar to popular packages)
3. **GitHub Actions audit**: Check .github/workflows/ for:
   - Actions using `@main` or `@master` (unpinned = supply chain risk)
   - Third-party actions without SHA pinning
   - Actions with write permissions that don't need them

## Report Format

```markdown
## Security Scan Report -- YYYY-MM-DD

**Repo**: {repo} | **Scan type**: {type} | **Threat level**: {S/A/B/C rank}

| Severity | Count | Status |
|----------|-------|--------|
| Critical (S-rank) | {n} | {action needed} |
| High (A-rank) | {n} | {action needed} |
| Medium (B-rank) | {n} | {monitoring} |
| Low (Genin-level) | {n} | {accepted risk} |

### Critical Findings
- **{CVE-ID or finding type}**: {package/file}@{version/line} — {description}. Fix: {recommendation}.

### Supply Chain Risks
- {New dependency}: {risk factors}

### Recommendations
1. {Prioritized action}
2. {Prioritized action}
```

## Output

1. **DB**: Insert into `security_scans` table
2. **Vault**: Write report to `vault/09-ops/security-reports/YYYY-MM-DD-security-{repo}.md`
3. **wantan-mem**: Log observation with severity for event routing
4. **Gate**: If opening GitHub issue → draft to owner-inbox

## Constraints

- NEVER dismiss critical or high findings without justification
- Verify CVE IDs match format CVE-YYYY-NNNNN before reporting
- Distinguish real secrets from test fixtures — false positives erode trust
- If GitHub API unavailable, fall back to local file analysis and report the gap
