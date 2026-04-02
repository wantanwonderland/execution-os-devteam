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

-- Facts table: distilled knowledge extracted from observations
-- Inspired by SimpleMem's atomic memory units and Memori's structured facts
CREATE TABLE IF NOT EXISTS facts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_observation_id INTEGER REFERENCES observations(id),
  category TEXT NOT NULL,        -- 'decision', 'pattern', 'preference', 'learned', 'blocker', 'architecture', 'error', 'security'
  content TEXT NOT NULL,          -- The distilled fact: "JWT chosen over sessions for mobile compatibility"
  importance INTEGER DEFAULT 5,  -- 1-10 score (10 = critical decision, 1 = minor observation)
  project TEXT NOT NULL,
  agent TEXT,
  tags TEXT,                      -- JSON array of tags for filtering
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_accessed_at TEXT,          -- Updated on retrieval for decay scoring
  access_count INTEGER DEFAULT 0, -- How often this fact is retrieved
  content_hash TEXT               -- SHA256 for deduplication
);

-- FTS5 index for facts
CREATE VIRTUAL TABLE IF NOT EXISTS facts_fts USING fts5(
  content, category, tags, project,
  content=facts,
  content_rowid=id
);

-- Triggers for facts FTS
CREATE TRIGGER IF NOT EXISTS facts_ai AFTER INSERT ON facts BEGIN
  INSERT INTO facts_fts(rowid, content, category, tags, project)
  VALUES (new.id, new.content, new.category, new.tags, new.project);
END;

CREATE TRIGGER IF NOT EXISTS facts_ad AFTER DELETE ON facts BEGIN
  INSERT INTO facts_fts(facts_fts, rowid, content, category, tags, project)
  VALUES ('delete', old.id, old.content, old.category, old.tags, old.project);
END;

-- Memory index: L1 always-loaded summary per project
-- Inspired by the 59-compaction system's MEMORY.md
CREATE TABLE IF NOT EXISTS memory_index (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project TEXT NOT NULL UNIQUE,
  summary TEXT NOT NULL,          -- ~500 token summary of what we know about this project
  key_facts TEXT,                 -- JSON: top 10 most important facts (by importance * access_count)
  last_updated TEXT NOT NULL DEFAULT (datetime('now')),
  total_facts INTEGER DEFAULT 0,
  total_observations INTEGER DEFAULT 0
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_observations_session ON observations(session_id);
CREATE INDEX IF NOT EXISTS idx_observations_agent ON observations(agent);
CREATE INDEX IF NOT EXISTS idx_observations_project ON observations(project);
CREATE INDEX IF NOT EXISTS idx_observations_type ON observations(type);
CREATE INDEX IF NOT EXISTS idx_observations_created ON observations(created_at);

-- Indexes for facts
CREATE INDEX IF NOT EXISTS idx_facts_hash ON facts(content_hash);
CREATE INDEX IF NOT EXISTS idx_facts_project ON facts(project);
CREATE INDEX IF NOT EXISTS idx_facts_category ON facts(category);
CREATE INDEX IF NOT EXISTS idx_facts_importance ON facts(importance DESC);
