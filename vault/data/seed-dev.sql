-- Seed data for Dev Performance Hub dashboard testing
-- Run: sqlite3 data/company.db < data/seed-dev.sql

-- Staff
INSERT INTO staff (name, role, squad, discipline, github_handle, status) VALUES
('Alice Chen', 'Senior Engineer', 'frontend', 'engineering', 'alicechen', 'active'),
('Bob Park', 'Engineer', 'frontend', 'engineering', 'bobpark', 'active'),
('Carol Wu', 'Senior Engineer', 'backend', 'engineering', 'carolwu', 'active'),
('Dave Kim', 'Tech Lead', 'backend', 'engineering', 'davekim', 'active'),
('Eve Santos', 'Engineer', 'platform', 'engineering', 'evesantos', 'active'),
('Frank Liu', 'SRE', 'platform', 'engineering', 'frankliu', 'active');

-- Sprint metrics (last 4 sprints)
INSERT INTO sprint_metrics (sprint_id, squad, velocity_committed, velocity_completed, stories_committed, stories_completed, bugs_found, bugs_fixed, week_of) VALUES
('S-2026-01', 'frontend', 34, 28, 8, 6, 3, 2, '2026-01-13'),
('S-2026-01', 'backend', 42, 40, 10, 9, 2, 2, '2026-01-13'),
('S-2026-02', 'frontend', 30, 30, 7, 7, 4, 3, '2026-01-27'),
('S-2026-02', 'backend', 38, 35, 9, 8, 1, 1, '2026-01-27'),
('S-2026-03', 'frontend', 32, 26, 8, 6, 5, 4, '2026-02-10'),
('S-2026-03', 'backend', 40, 38, 10, 9, 3, 3, '2026-02-10'),
('S-2026-04', 'frontend', 28, 27, 7, 7, 2, 2, '2026-02-24'),
('S-2026-04', 'backend', 36, 36, 9, 9, 1, 1, '2026-02-24'),
('S-2026-05', 'frontend', 30, 24, 8, 6, 4, 3, '2026-03-10'),
('S-2026-05', 'backend', 44, 42, 11, 10, 2, 2, '2026-03-10'),
('S-2026-06', 'frontend', 32, 30, 8, 7, 3, 2, '2026-03-24'),
('S-2026-06', 'backend', 40, 39, 10, 10, 1, 1, '2026-03-24');

-- Pull requests (last 30 days)
INSERT INTO pull_requests (repo, pr_number, title, author, reviewer, status, opened_at, merged_at, review_time_hours, files_changed, additions, deletions, squad) VALUES
('frontend-app', 142, 'feat: add search filters', 'alicechen', 'bobpark', 'merged', '2026-03-15 09:00', '2026-03-15 14:00', 5.0, 8, 240, 30, 'frontend'),
('frontend-app', 143, 'fix: mobile nav overflow', 'bobpark', 'alicechen', 'merged', '2026-03-16 10:00', '2026-03-16 12:00', 2.0, 3, 45, 12, 'frontend'),
('frontend-app', 144, 'feat: dark mode toggle', 'alicechen', NULL, 'open', '2026-03-28 09:00', NULL, NULL, 12, 380, 45, 'frontend'),
('frontend-app', 145, 'fix: login redirect loop', 'bobpark', 'alicechen', 'merged', '2026-03-20 08:00', '2026-03-20 11:00', 3.0, 4, 60, 20, 'frontend'),
('api-service', 200, 'feat: rate limiting middleware', 'carolwu', 'davekim', 'merged', '2026-03-14 11:00', '2026-03-15 09:00', 22.0, 6, 180, 10, 'backend'),
('api-service', 201, 'refactor: user service extraction', 'davekim', 'carolwu', 'merged', '2026-03-18 14:00', '2026-03-19 10:00', 20.0, 15, 520, 340, 'backend'),
('api-service', 202, 'feat: webhook retry queue', 'carolwu', NULL, 'open', '2026-03-27 09:00', NULL, NULL, 9, 310, 20, 'backend'),
('api-service', 203, 'fix: connection pool leak', 'davekim', 'carolwu', 'merged', '2026-03-22 16:00', '2026-03-22 18:00', 2.0, 2, 25, 8, 'backend'),
('infra-config', 300, 'chore: upgrade k8s to 1.29', 'evesantos', 'frankliu', 'merged', '2026-03-10 09:00', '2026-03-12 14:00', 53.0, 20, 400, 200, 'platform'),
('infra-config', 301, 'feat: auto-scaling policy', 'frankliu', 'evesantos', 'merged', '2026-03-19 11:00', '2026-03-20 09:00', 22.0, 5, 150, 30, 'platform'),
('frontend-app', 146, 'feat: notification center', 'alicechen', 'bobpark', 'merged', '2026-03-25 09:00', '2026-03-25 15:00', 6.0, 10, 420, 15, 'frontend'),
('api-service', 204, 'feat: batch API endpoint', 'carolwu', 'davekim', 'merged', '2026-03-26 10:00', '2026-03-26 16:00', 6.0, 7, 280, 20, 'backend');

-- Test runs
INSERT INTO test_runs (repo, branch, pr_number, test_type, total, passed, failed, skipped, coverage_pct, duration_seconds, run_at, triggered_by) VALUES
('frontend-app', 'main', NULL, 'unit', 245, 243, 2, 0, 82.5, 45.2, '2026-03-28 06:00', 'ci'),
('frontend-app', 'main', NULL, 'e2e', 48, 46, 2, 0, NULL, 180.5, '2026-03-28 06:05', 'ci'),
('frontend-app', 'main', NULL, 'browser', 36, 35, 1, 0, NULL, 220.0, '2026-03-28 06:10', 'killua'),
('api-service', 'main', NULL, 'unit', 312, 312, 0, 0, 88.3, 32.1, '2026-03-28 06:00', 'ci'),
('api-service', 'main', NULL, 'integration', 67, 65, 2, 0, NULL, 95.0, '2026-03-28 06:05', 'ci'),
('frontend-app', 'feat/dark-mode', 144, 'unit', 248, 247, 1, 0, 82.8, 46.0, '2026-03-28 10:00', 'ci'),
('frontend-app', 'main', NULL, 'browser', 36, 36, 0, 0, NULL, 215.0, '2026-03-27 06:10', 'killua'),
('frontend-app', 'main', NULL, 'browser', 36, 34, 2, 0, NULL, 225.0, '2026-03-26 06:10', 'killua'),
('api-service', 'main', NULL, 'unit', 310, 310, 0, 0, 87.9, 31.5, '2026-03-27 06:00', 'ci'),
('frontend-app', 'main', NULL, 'unit', 244, 244, 0, 0, 82.1, 44.8, '2026-03-27 06:00', 'ci');

-- Deployments
INSERT INTO deployments (repo, environment, version, branch, deployed_by, deployed_at, status, rollback_of) VALUES
('frontend-app', 'production', 'v1.4.2', 'main', 'alicechen', '2026-03-27 14:00', 'success', NULL),
('frontend-app', 'staging', 'v1.4.3-rc1', 'main', 'bobpark', '2026-03-28 09:00', 'success', NULL),
('api-service', 'production', 'v2.8.0', 'main', 'davekim', '2026-03-26 16:00', 'success', NULL),
('api-service', 'staging', 'v2.8.1-rc1', 'main', 'carolwu', '2026-03-28 10:00', 'success', NULL),
('frontend-app', 'production', 'v1.4.1', 'main', 'alicechen', '2026-03-20 14:00', 'rolled_back', NULL),
('frontend-app', 'production', 'v1.4.0', 'main', 'alicechen', '2026-03-20 14:30', 'success', 5),
('api-service', 'production', 'v2.7.5', 'main', 'davekim', '2026-03-19 11:00', 'success', NULL),
('infra-config', 'production', 'v1.2.0', 'main', 'frankliu', '2026-03-12 15:00', 'success', NULL);

-- Incidents
INSERT INTO incidents (severity, title, repo, detected_at, resolved_at, mttr_minutes, root_cause, postmortem_path, on_call) VALUES
('P1', 'Login page 500 after deploy v1.4.1', 'frontend-app', '2026-03-20 14:05', '2026-03-20 14:35', 30, 'Missing env var in production config', '09-ops/incidents/2026-03-20-login-500.md', 'alicechen'),
('P2', 'Slow API responses on /users endpoint', 'api-service', '2026-03-15 10:00', '2026-03-15 11:30', 90, 'Connection pool exhaustion under load', '09-ops/incidents/2026-03-15-slow-api.md', 'carolwu'),
('P3', 'Stale cache serving old dashboard data', 'frontend-app', '2026-03-10 09:00', '2026-03-10 09:20', 20, 'CDN cache not invalidated on deploy', NULL, 'bobpark');

-- Security scans
INSERT INTO security_scans (repo, scan_type, critical, high, medium, low, scanned_at, triggered_by) VALUES
('frontend-app', 'dependency', 0, 1, 3, 8, '2026-03-28 02:00', 'itachi'),
('api-service', 'dependency', 0, 0, 2, 5, '2026-03-28 02:00', 'itachi'),
('infra-config', 'dependency', 0, 0, 1, 2, '2026-03-28 02:00', 'itachi'),
('frontend-app', 'sast', 0, 0, 1, 3, '2026-03-28 02:30', 'itachi'),
('api-service', 'sast', 0, 1, 0, 2, '2026-03-28 02:30', 'itachi');

-- Tech debt
INSERT INTO tech_debt (repo, title, severity, category, created_at, resolved_at, owner) VALUES
('frontend-app', 'Migrate from webpack to vite', 'medium', 'dependency', '2026-01-15', NULL, 'alicechen'),
('api-service', 'Replace express-validator with zod', 'low', 'dependency', '2026-02-01', NULL, 'carolwu'),
('frontend-app', 'Extract shared components library', 'high', 'architecture', '2026-01-20', NULL, 'bobpark'),
('api-service', 'Add integration test suite', 'high', 'testing', '2026-02-10', '2026-03-18', 'davekim'),
('infra-config', 'Upgrade to Terraform 1.8', 'medium', 'dependency', '2026-03-01', NULL, 'frankliu'),
('frontend-app', 'Remove legacy auth flow', 'critical', 'architecture', '2025-11-01', NULL, 'alicechen'),
('api-service', 'Database query N+1 in reports', 'high', 'performance', '2026-03-10', NULL, 'carolwu');

-- Agent usage
INSERT INTO agent_usage (agent, dispatched_at, tokens_in, tokens_out, model, task_type, duration_seconds, project) VALUES
('levi', '2026-03-28 09:00', 42000, 6500, 'opus', 'pr_review', 45.2, 'frontend-app'),
('killua', '2026-03-28 09:10', 28000, 3200, 'sonnet', 'browser_test', 220.0, 'frontend-app'),
('itachi', '2026-03-28 02:00', 35000, 5100, 'opus', 'security_scan', 38.5, 'frontend-app'),
('shikamaru', '2026-03-28 09:30', 18000, 3000, 'sonnet', 'deploy_check', 12.3, 'api-service'),
('erwin', '2026-03-28 08:00', 22000, 5500, 'sonnet', 'sprint_review', 28.7, 'all'),
('levi', '2026-03-27 14:00', 45000, 7200, 'opus', 'pr_review', 52.1, 'api-service'),
('killua', '2026-03-27 06:10', 26000, 2800, 'sonnet', 'browser_test', 215.0, 'frontend-app'),
('byakuya', '2026-03-27 22:00', 12000, 1500, 'haiku', 'vault_audit', 8.2, 'all'),
('hange', '2026-03-26 10:00', 48000, 7800, 'opus', 'research', 65.3, 'api-service'),
('itachi', '2026-03-27 02:00', 33000, 4900, 'opus', 'security_scan', 36.1, 'api-service');

-- Projects
INSERT INTO projects (name, repo_url, default_branch, squad, environments, ci_provider, status, owner) VALUES
('Frontend App', 'https://github.com/company/frontend-app', 'main', 'frontend', 'staging,production', 'github-actions', 'active', 'alicechen'),
('API Service', 'https://github.com/company/api-service', 'main', 'backend', 'staging,production', 'github-actions', 'active', 'davekim'),
('Infra Config', 'https://github.com/company/infra-config', 'main', 'platform', 'production', 'github-actions', 'active', 'frankliu');
