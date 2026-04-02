Itachi's security dashboard. View scan results, CVE status, and dependency health.

Usage:
- `/security` — show security posture summary across all repos
- `/security scan {repo}` — trigger Itachi to scan a specific repo
- `/security cve` — show open CVEs and Dependabot alerts

## Steps

### Mode: Summary (default)

1. **Security posture**: Query `security_scans` table in `data/company.db` for the most recent scan per repo. Show:

```markdown
## Security Posture -- YYYY-MM-DD

| Repo | Last Scan | Critical | High | Medium | Low | Status |
|------|-----------|----------|------|--------|-----|--------|
```

2. **Open alerts**: Dispatch Itachi to run `gh api repos/{owner}/{repo}/dependabot/alerts --jq '[.[] | select(.state=="open")] | length'` for each repo in `01-projects/`. Show alert counts.

3. **Recommendation**: If any repo has critical or high findings, flag: "Action needed — dispatch Itachi for full scan with `/security scan {repo}`."

### Mode: Scan (with repo)

1. **Dispatch Itachi**: Send Itachi to perform a full security scan on the specified repo:
   - Dependency audit via `gh api repos/{owner}/{repo}/dependabot/alerts`
   - Code scanning alerts via `gh api repos/{owner}/{repo}/code-scanning/alerts`
   - Secrets check (grep for API key patterns in recent commits)

2. **Collect results**: Itachi returns a Security Scan Report in the standard format.

3. **Write results**:
   - Insert into `security_scans` table: repo, scan_type, critical, high, medium, low, scanned_at, triggered_by='itachi'
   - Write vault report to `09-ops/security-reports/YYYY-MM-DD-security-{repo}.md`

4. **Route critical findings**: If critical findings exist, create event observation for Wantan to route to Shikamaru (block deploy).

### Mode: CVE

1. **Open CVEs**: Query all repos for Dependabot alerts via `gh api`. Show:
   - CVE ID, package, severity, affected version, fix available (yes/no)
2. **Resolution tracking**: Query `security_scans` history to show CVE resolution time trends.
