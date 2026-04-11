-- Staff table (adapted: track->squad, department->discipline)
CREATE TABLE IF NOT EXISTS staff (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  squad TEXT NOT NULL,
  discipline TEXT,
  github_handle TEXT,
  status TEXT DEFAULT 'active',
  notes TEXT
);

-- KPI metrics (kept, dev-focused)
CREATE TABLE IF NOT EXISTS kpi_metrics (
  id INTEGER PRIMARY KEY,
  department TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  value REAL NOT NULL,
  target REAL,
  period TEXT NOT NULL,
  recorded_at TEXT DEFAULT (datetime('now'))
);

-- Contacts (kept as-is)
CREATE TABLE IF NOT EXISTS contacts (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  company TEXT,
  role TEXT,
  email TEXT,
  phone TEXT,
  category TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Interactions (kept as-is)
CREATE TABLE IF NOT EXISTS interactions (
  id INTEGER PRIMARY KEY,
  contact_id INTEGER REFERENCES contacts(id),
  type TEXT NOT NULL,
  summary TEXT,
  date TEXT NOT NULL,
  follow_up TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Projects (adapted for repos)
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  repo_url TEXT,
  default_branch TEXT DEFAULT 'main',
  squad TEXT,
  environments TEXT,
  ci_provider TEXT DEFAULT 'github-actions',
  status TEXT DEFAULT 'active',
  owner TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Pull requests
CREATE TABLE IF NOT EXISTS pull_requests (
  id INTEGER PRIMARY KEY,
  repo TEXT NOT NULL,
  pr_number INTEGER NOT NULL,
  title TEXT,
  author TEXT,
  reviewer TEXT,
  status TEXT,
  opened_at TEXT,
  merged_at TEXT,
  review_time_hours REAL,
  files_changed INTEGER,
  additions INTEGER,
  deletions INTEGER,
  squad TEXT
);

-- Test runs
CREATE TABLE IF NOT EXISTS test_runs (
  id INTEGER PRIMARY KEY,
  repo TEXT NOT NULL,
  branch TEXT,
  pr_number INTEGER,
  test_type TEXT,
  total INTEGER,
  passed INTEGER,
  failed INTEGER,
  skipped INTEGER,
  coverage_pct REAL,
  duration_seconds REAL,
  run_at TEXT,
  triggered_by TEXT
);

-- Deployments
CREATE TABLE IF NOT EXISTS deployments (
  id INTEGER PRIMARY KEY,
  repo TEXT NOT NULL,
  environment TEXT,
  version TEXT,
  branch TEXT,
  deployed_by TEXT,
  deployed_at TEXT,
  status TEXT,
  rollback_of INTEGER REFERENCES deployments(id)
);

-- Incidents
CREATE TABLE IF NOT EXISTS incidents (
  id INTEGER PRIMARY KEY,
  severity TEXT,
  title TEXT NOT NULL,
  repo TEXT,
  detected_at TEXT,
  resolved_at TEXT,
  mttr_minutes REAL,
  root_cause TEXT,
  postmortem_path TEXT,
  on_call TEXT
);

-- Security scans
CREATE TABLE IF NOT EXISTS security_scans (
  id INTEGER PRIMARY KEY,
  repo TEXT NOT NULL,
  scan_type TEXT,
  critical INTEGER DEFAULT 0,
  high INTEGER DEFAULT 0,
  medium INTEGER DEFAULT 0,
  low INTEGER DEFAULT 0,
  scanned_at TEXT,
  triggered_by TEXT
);

-- Sprint metrics
CREATE TABLE IF NOT EXISTS sprint_metrics (
  id INTEGER PRIMARY KEY,
  sprint_id TEXT,
  squad TEXT,
  velocity_committed INTEGER,
  velocity_completed INTEGER,
  stories_committed INTEGER,
  stories_completed INTEGER,
  bugs_found INTEGER,
  bugs_fixed INTEGER,
  week_of TEXT
);

-- Tech debt
CREATE TABLE IF NOT EXISTS tech_debt (
  id INTEGER PRIMARY KEY,
  repo TEXT NOT NULL,
  title TEXT NOT NULL,
  severity TEXT,
  category TEXT,
  created_at TEXT,
  resolved_at TEXT,
  decision_path TEXT,
  owner TEXT
);

-- Contribution reviews
CREATE TABLE IF NOT EXISTS contribution_reviews (
  id INTEGER PRIMARY KEY,
  staff_id INTEGER REFERENCES staff(id),
  period TEXT,
  delivery_score REAL,
  quality_score REAL,
  citizenship_score REAL,
  overall_score REAL,
  notes TEXT,
  reviewed_at TEXT,
  reviewer TEXT
);

-- On-call rotation
CREATE TABLE IF NOT EXISTS oncall_rotation (
  id INTEGER PRIMARY KEY,
  staff_id INTEGER REFERENCES staff(id),
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  squad TEXT,
  escalation_order INTEGER
);

-- Agent usage tracking
CREATE TABLE IF NOT EXISTS agent_usage (
  id INTEGER PRIMARY KEY,
  agent TEXT NOT NULL,
  dispatched_at TEXT NOT NULL,
  tokens_in INTEGER,
  tokens_out INTEGER,
  model TEXT,
  task_type TEXT,
  duration_seconds REAL,
  project TEXT
);

-- Sprint carryover ledger
-- Records explicit decisions for every incomplete story at sprint close.
-- decision: 'carry_forward' | 'deprioritized' | 'split'
CREATE TABLE IF NOT EXISTS sprint_carryover (
  id INTEGER PRIMARY KEY,
  story_id TEXT NOT NULL,
  title TEXT NOT NULL,
  from_sprint TEXT NOT NULL,
  to_sprint TEXT,
  decision TEXT NOT NULL CHECK (decision IN ('carry_forward', 'deprioritized', 'split')),
  reason TEXT,
  stub_path TEXT,
  agent TEXT,
  resolved_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
