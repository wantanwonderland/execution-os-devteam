-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project TEXT NOT NULL,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  ended_at TEXT,
  summary TEXT,
  agent TEXT DEFAULT 'wantan'
);

-- Observations table
CREATE TABLE IF NOT EXISTS observations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER REFERENCES sessions(id),
  type TEXT NOT NULL,
  agent TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  project TEXT NOT NULL
);

-- FTS5 index for full-text search
CREATE VIRTUAL TABLE IF NOT EXISTS observations_fts USING fts5(
  content,
  type,
  agent,
  project,
  content=observations,
  content_rowid=id
);

-- Triggers to keep FTS in sync
CREATE TRIGGER IF NOT EXISTS observations_ai AFTER INSERT ON observations BEGIN
  INSERT INTO observations_fts(rowid, content, type, agent, project)
  VALUES (new.id, new.content, new.type, new.agent, new.project);
END;

CREATE TRIGGER IF NOT EXISTS observations_ad AFTER DELETE ON observations BEGIN
  INSERT INTO observations_fts(observations_fts, rowid, content, type, agent, project)
  VALUES ('delete', old.id, old.content, old.type, old.agent, old.project);
END;

CREATE TRIGGER IF NOT EXISTS observations_au AFTER UPDATE ON observations BEGIN
  INSERT INTO observations_fts(observations_fts, rowid, content, type, agent, project)
  VALUES ('delete', old.id, old.content, old.type, old.agent, old.project);
  INSERT INTO observations_fts(rowid, content, type, agent, project)
  VALUES (new.id, new.content, new.type, new.agent, new.project);
END;

-- PR observations (dev-team context)
CREATE TABLE IF NOT EXISTS pr_observations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  observation_id INTEGER REFERENCES observations(id),
  repo TEXT NOT NULL,
  pr_number INTEGER,
  branch TEXT,
  review_status TEXT,
  files_changed TEXT
);

-- Test observations
CREATE TABLE IF NOT EXISTS test_observations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  observation_id INTEGER REFERENCES observations(id),
  test_type TEXT,
  passed INTEGER,
  failed INTEGER,
  skipped INTEGER,
  coverage_pct REAL,
  url_tested TEXT
);

-- Security observations
CREATE TABLE IF NOT EXISTS security_observations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  observation_id INTEGER REFERENCES observations(id),
  severity TEXT,
  cve_id TEXT,
  package TEXT,
  recommendation TEXT
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_observations_session ON observations(session_id);
CREATE INDEX IF NOT EXISTS idx_observations_agent ON observations(agent);
CREATE INDEX IF NOT EXISTS idx_observations_project ON observations(project);
CREATE INDEX IF NOT EXISTS idx_observations_type ON observations(type);
CREATE INDEX IF NOT EXISTS idx_observations_created ON observations(created_at);
