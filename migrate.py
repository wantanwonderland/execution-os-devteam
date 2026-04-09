#!/usr/bin/env python3
"""
migrate.py — Upgrade existing Execution-OS projects to v2.0.0

Handles all migrations from v1.x → v2.0.0 (and is safe to re-run):

  DB migrations (wantan-mem.db — shared, run once):
    - Create compaction_snapshots table (v2.0.0)
    - Add facts.superseded, superseded_by, git_branch columns (v2.0.0)
    - Create episodes table (v1.4.0)
    - Scrub credentials from existing observations and facts
    - Prune noise observations (git status, ls, cat, etc.)
    - Clean up orphaned worktree project data
    - Rebuild L1 indexes with quality filters

  Per-project migrations:
    - CLAUDE.md delegation block sync
    - Deploy .claude/context-essentials.md  (v2.0.0 — compaction anchor)
    - Update .claude/hooks/pre-compact.sh   (v2.0.0 — rewritten)
    - Deploy .claude/hooks/session-start-compact.sh  (v2.0.0 — new)
    - Patch .claude/settings.json: add SessionStart(compact) hook,
      remove PostCompact if present (v2.0.0)
    - Vault MANIFEST.md generation
    - .claude/context/ directory creation (context bus)
    - Dead table cleanup (pr_observations, test_observations, security_observations)

Usage:
    python3 migrate.py                          # dry run — shows what would change
    python3 migrate.py --apply                  # apply to all installed projects
    python3 migrate.py --apply --path /path     # single project
    python3 migrate.py --apply --db-only        # only run database migrations
    python3 migrate.py --apply --vault-only     # only run vault migrations
"""

import json
import os
import re
import sqlite3
import subprocess
import sys
from datetime import datetime
from pathlib import Path

# ── Config ──────────────────────────────────────────────────────────────────

PLUGIN_ID = "execution-os-devteam@execution-os-devteam"
TEMPLATE_PATH = Path(__file__).parent / "vault" / "CLAUDE.md"
VAULT_DOT_CLAUDE = Path(__file__).parent / "vault" / ".claude"
INSTALLED_PLUGINS_PATH = Path.home() / ".claude" / "plugins" / "installed_plugins.json"
WANTAN_MEM_DB = Path.home() / ".wantan-mem" / "wantan-mem.db"

MARKER_START = "<!-- WANTAN:DELEGATION:START -->"
MARKER_END = "<!-- WANTAN:DELEGATION:END -->"

# Credential patterns to scrub
CREDENTIAL_PATTERNS = [
    (re.compile(r'(-p|--password[= ])[\'\"]\S+[\'\"]'), r'\1[REDACTED]'),
    (re.compile(r'(-p|--password[= ])\S+'), r'\1[REDACTED]'),
    (re.compile(r'(mysql|postgres|mongodb|redis)://\S+:\S+@'), r'\1://[REDACTED]@'),
    (re.compile(r'(Bearer |Authorization: |token[= ]|api[_-]?key[= ])\S+'), r'\1[REDACTED]'),
    (re.compile(r'(AKIA|AIza|sk-|ghp_|gho_|github_pat_)\S+'), '[REDACTED_KEY]'),
    (re.compile(r'(PASSWORD|SECRET|TOKEN|PRIVATE_KEY)[= ]\S+', re.IGNORECASE), r'\1=[REDACTED]'),
]

# Noise patterns for observation pruning
NOISE_OBSERVATION_PATTERNS = re.compile(
    r'^Bash:\s*(git\s+(status|log|diff|branch|stash|fetch|pull|show|remote)|'
    r'ls(\s|$)|cat\s|head\s|tail\s|wc\s|grep\s|sed\s|awk\s|'
    r'echo\s|pwd|cd\s|which\s|whoami|date|clear|'
    r'node\s+--version|python3?\s+--version|npm\s+(--version|ls)|'
    r'docker\s+(ps|images|logs)|'
    r'curl\s.*localhost:37778)',
    re.IGNORECASE
)


# ── Helpers ─────────────────────────────────────────────────────────────────

def scrub_credentials(text: str) -> str:
    for pattern, replacement in CREDENTIAL_PATTERNS:
        text = pattern.sub(replacement, text)
    return text


def get_installed_project_paths() -> list[Path]:
    if not INSTALLED_PLUGINS_PATH.exists():
        return []
    with open(INSTALLED_PLUGINS_PATH) as f:
        data = json.load(f)
    plugins = data.get("plugins", data)
    entries = plugins.get(PLUGIN_ID, [])
    return [Path(e["projectPath"]) for e in entries if e.get("projectPath")]


# ── Database Migrations ────────────────────────────────────────────────────

def migrate_database(apply: bool) -> dict:
    """Run all database migrations on wantan-mem.db"""
    stats = {
        "episodes_table": False,
        "credentials_scrubbed": 0,
        "noise_pruned": 0,
        "worktrees_cleaned": 0,
        "dead_tables_dropped": 0,
        "indexes_rebuilt": 0,
    }

    if not WANTAN_MEM_DB.exists():
        print(f"  ⚠  wantan-mem.db not found at {WANTAN_MEM_DB}")
        return stats

    db = sqlite3.connect(str(WANTAN_MEM_DB))
    db.row_factory = sqlite3.Row

    # ── v2.0.0 migrations ─────────────────────────────────────────────────

    # 0a. compaction_snapshots table (ruvnet two-hook pattern)
    tables = [r[0] for r in db.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]
    if "compaction_snapshots" not in tables:
        stats["episodes_table"] = True  # reuse flag for reporting
        if apply:
            db.executescript("""
                CREATE TABLE IF NOT EXISTS compaction_snapshots (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    project TEXT NOT NULL DEFAULT 'default',
                    captured_at TEXT NOT NULL DEFAULT (datetime('now')),
                    git_branch TEXT,
                    sdd_state TEXT,
                    top_facts TEXT NOT NULL DEFAULT '[]',
                    recent_obs_summary TEXT NOT NULL DEFAULT '[]',
                    context_tokens_estimate INTEGER DEFAULT 0,
                    restored INTEGER DEFAULT 0,
                    restored_at TEXT
                );
                CREATE INDEX IF NOT EXISTS idx_snapshots_project ON compaction_snapshots(project);
                CREATE INDEX IF NOT EXISTS idx_snapshots_captured ON compaction_snapshots(captured_at DESC);
            """)
            print("  ✓  Created compaction_snapshots table")
        else:
            print("  ○  Would create compaction_snapshots table")
    else:
        print("  ─  compaction_snapshots table already exists")

    # 0b. facts columns: superseded, superseded_by, git_branch
    fact_cols = [r[1] for r in db.execute("PRAGMA table_info(facts)").fetchall()]
    new_cols = 0

    if "superseded" not in fact_cols:
        new_cols += 1
        if apply:
            db.execute("ALTER TABLE facts ADD COLUMN superseded INTEGER DEFAULT 0")
            db.execute("CREATE INDEX IF NOT EXISTS idx_facts_superseded ON facts(superseded)")
    if "superseded_by" not in fact_cols:
        new_cols += 1
        if apply:
            db.execute("ALTER TABLE facts ADD COLUMN superseded_by INTEGER REFERENCES facts(id)")
    if "git_branch" not in fact_cols:
        new_cols += 1
        if apply:
            db.execute("ALTER TABLE facts ADD COLUMN git_branch TEXT")
            db.execute("CREATE INDEX IF NOT EXISTS idx_facts_branch ON facts(git_branch)")

    if new_cols > 0:
        if apply:
            db.commit()
            print(f"  ✓  Added {new_cols} column(s) to facts table (superseded, superseded_by, git_branch)")
        else:
            print(f"  ○  Would add {new_cols} column(s) to facts table (superseded, superseded_by, git_branch)")
    else:
        print("  ─  facts table already has v2.0.0 columns")

    # ── v1.4.0 migrations (kept for first-time installs) ──────────────────

    # Refresh tables list after v2.0.0 DDL above
    tables = [r[0] for r in db.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]

    # 1. Create episodes table if not exists
    if "episodes" not in tables:
        stats["episodes_table"] = True
        if apply:
            db.executescript("""
                CREATE TABLE IF NOT EXISTS episodes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    agent TEXT NOT NULL,
                    task_summary TEXT NOT NULL,
                    solution_summary TEXT NOT NULL,
                    files_touched TEXT,
                    project TEXT NOT NULL,
                    success INTEGER DEFAULT 1,
                    created_at TEXT NOT NULL DEFAULT (datetime('now')),
                    retrieval_count INTEGER DEFAULT 0,
                    content_hash TEXT
                );
                CREATE VIRTUAL TABLE IF NOT EXISTS episodes_fts USING fts5(
                    task_summary, solution_summary, agent, project,
                    content=episodes, content_rowid=id
                );
                CREATE TRIGGER IF NOT EXISTS episodes_ai AFTER INSERT ON episodes BEGIN
                    INSERT INTO episodes_fts(rowid, task_summary, solution_summary, agent, project)
                    VALUES (new.id, new.task_summary, new.solution_summary, new.agent, new.project);
                END;
                CREATE TRIGGER IF NOT EXISTS episodes_ad AFTER DELETE ON episodes BEGIN
                    INSERT INTO episodes_fts(episodes_fts, rowid, task_summary, solution_summary, agent, project)
                    VALUES ('delete', old.id, old.task_summary, old.solution_summary, old.agent, old.project);
                END;
                CREATE INDEX IF NOT EXISTS idx_episodes_agent ON episodes(agent);
                CREATE INDEX IF NOT EXISTS idx_episodes_project ON episodes(project);
                CREATE INDEX IF NOT EXISTS idx_episodes_hash ON episodes(content_hash);
            """)
            print("  ✓  Created episodes table + FTS + indexes")
        else:
            print("  ○  Would create episodes table")

    # 2. Scrub credentials from existing observations and facts
    cred_pattern = re.compile(
        r'(sshpass\s+-p\s|--password[= ]|-p[\'\"]\S+|'
        r'mysql://\S+:\S+@|postgres://\S+:\S+@|'
        r'Bearer \S{20,}|AKIA\S{16,}|sk-\S{20,}|ghp_\S{20,})',
        re.IGNORECASE
    )

    # Check observations
    obs_with_creds = db.execute(
        "SELECT id, content FROM observations WHERE content LIKE '%password%' "
        "OR content LIKE '%sshpass%' OR content LIKE '%Bearer %' "
        "OR content LIKE '%AKIA%' OR content LIKE '%sk-%'"
    ).fetchall()
    stats["credentials_scrubbed"] = len(obs_with_creds)

    if obs_with_creds:
        if apply:
            for row in obs_with_creds:
                scrubbed = scrub_credentials(row["content"])
                if scrubbed != row["content"]:
                    db.execute("UPDATE observations SET content = ? WHERE id = ?", (scrubbed, row["id"]))
            # Also scrub facts
            facts_with_creds = db.execute(
                "SELECT id, content FROM facts WHERE content LIKE '%password%' "
                "OR content LIKE '%sshpass%' OR content LIKE '%Bearer %' "
                "OR content LIKE '%AKIA%' OR content LIKE '%sk-%'"
            ).fetchall()
            for row in facts_with_creds:
                scrubbed = scrub_credentials(row["content"])
                if scrubbed != row["content"]:
                    db.execute("UPDATE facts SET content = ? WHERE id = ?", (scrubbed, row["id"]))
            db.commit()
            print(f"  ✓  Scrubbed credentials from {len(obs_with_creds)} observations + associated facts")
        else:
            print(f"  ○  Would scrub credentials from {len(obs_with_creds)} observations")

    # 3. Prune noise observations
    noise_obs = db.execute("SELECT id, content FROM observations").fetchall()
    noise_ids = [r["id"] for r in noise_obs if NOISE_OBSERVATION_PATTERNS.match(r["content"])]
    stats["noise_pruned"] = len(noise_ids)

    if noise_ids:
        if apply:
            placeholders = ",".join("?" * len(noise_ids))
            db.execute(f"DELETE FROM observations WHERE id IN ({placeholders})", noise_ids)
            db.commit()
            print(f"  ✓  Pruned {len(noise_ids)} noise observations")
        else:
            print(f"  ○  Would prune {len(noise_ids)} noise observations")

    # 4. Clean worktree orphans
    worktree_count = db.execute(
        "SELECT COUNT(*) as c FROM observations WHERE project LIKE 'agent-%'"
    ).fetchone()["c"]
    stats["worktrees_cleaned"] = worktree_count

    if worktree_count > 0:
        if apply:
            db.execute("DELETE FROM observations WHERE project LIKE 'agent-%'")
            db.execute("DELETE FROM facts WHERE project LIKE 'agent-%'")
            db.execute("DELETE FROM memory_index WHERE project LIKE 'agent-%'")
            db.commit()
            print(f"  ✓  Cleaned {worktree_count} orphaned worktree observations")
        else:
            print(f"  ○  Would clean {worktree_count} orphaned worktree observations")

    # 5. Drop dead tables (0 rows, never used)
    for dead_table in ["pr_observations", "test_observations", "security_observations"]:
        if dead_table in tables:
            count = db.execute(f"SELECT COUNT(*) as c FROM {dead_table}").fetchone()["c"]
            if count == 0:
                stats["dead_tables_dropped"] += 1
                if apply:
                    db.execute(f"DROP TABLE IF EXISTS {dead_table}")
                    print(f"  ✓  Dropped empty table: {dead_table}")
                else:
                    print(f"  ○  Would drop empty table: {dead_table}")

    if apply:
        db.commit()

    # 6. Rebuild L1 indexes for all active projects
    projects = db.execute(
        "SELECT DISTINCT project FROM facts WHERE project NOT LIKE 'agent-%'"
    ).fetchall()
    stats["indexes_rebuilt"] = len(projects)

    if projects:
        if apply:
            # Trigger rebuild via worker API if running, otherwise skip
            for p in projects:
                try:
                    subprocess.run(
                        ["curl", "-s", "-X", "POST", "http://localhost:37778/api/facts/rebuild-index",
                         "-H", "Content-Type: application/json",
                         "-d", json.dumps({"project": p["project"]}),
                         "--connect-timeout", "2", "--max-time", "3"],
                        capture_output=True, timeout=5
                    )
                except (subprocess.TimeoutExpired, FileNotFoundError):
                    pass
            print(f"  ✓  Triggered L1 index rebuild for {len(projects)} projects")
        else:
            print(f"  ○  Would rebuild L1 indexes for {len(projects)} projects")

    db.close()
    return stats


# ── Vault Migrations ───────────────────────────────────────────────────────

def generate_manifest(vault_path: Path, apply: bool) -> bool:
    """Generate vault/MANIFEST.md for a project."""
    if not vault_path.exists():
        return False

    manifest_path = vault_path / "MANIFEST.md"
    skip_dirs = {"dashboard", "data", ".claude", "node_modules"}
    entries = []

    for root, dirs, files in os.walk(vault_path):
        dirs[:] = [d for d in dirs if d not in skip_dirs]
        for f in files:
            if not f.endswith(".md") or f == "MANIFEST.md":
                continue
            path = os.path.join(root, f)
            rel = os.path.relpath(path, vault_path)
            try:
                with open(path, encoding="utf-8") as fh:
                    content = fh.read(2000)
            except (UnicodeDecodeError, PermissionError):
                continue

            title = ""
            tags = []
            summary = ""

            tm = re.search(r'^title:\s*["\']?(.+?)["\']?\s*$', content, re.M)
            if tm:
                title = tm.group(1)
            tgm = re.search(r'^tags:\s*\[(.+?)\]', content, re.M)
            if tgm:
                tags = [t.strip().strip("\"'") for t in tgm.group(1).split(",")]

            # Find first meaningful line for summary
            for line in content.split("\n"):
                line = line.strip()
                if (len(line) > 20 and not line.startswith("---") and
                    not line.startswith("title:") and not line.startswith("tags:") and
                    not line.startswith("#") and not line.startswith("type:") and
                    not line.startswith("status:") and not line.startswith("created:") and
                    not line.startswith("related:")):
                    summary = line[:120]
                    break

            entries.append({
                "path": rel,
                "title": title or f,
                "tags": tags,
                "summary": summary,
            })

    if not entries:
        return False

    entries.sort(key=lambda x: x["path"])

    lines = [
        "# Vault Manifest",
        f"Last updated: {datetime.now().strftime('%Y-%m-%d %H:%M')}",
        "",
    ]

    current_dir = ""
    for m in entries:
        d = os.path.dirname(m["path"])
        if d != current_dir:
            current_dir = d
            lines.append(f"\n## {d}/")
        tag_str = ", ".join(m["tags"]) if m["tags"] else "untagged"
        lines.append(f'- [{m["title"]}]({m["path"]}) — tags: {tag_str} | {m["summary"]}')

    if apply:
        manifest_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
        return True
    return True


def migrate_v200_hooks(project_path: Path, apply: bool) -> dict:
    """
    v2.0.0: Deploy anti-compaction drift infrastructure to a project.
    - context-essentials.md — identity anchor injected post-compaction
    - pre-compact.sh        — updated hook (archives snapshot before compaction)
    - session-start-compact.sh — new hook (restores context after compaction)
    - settings.json         — add SessionStart(matcher:compact), remove PostCompact
    """
    stats = {"essentials": False, "pre_compact": False, "session_start": False, "settings": False}

    project_dot_claude = project_path / ".claude"
    if not project_dot_claude.exists():
        print("  ─  No .claude/ directory — skipping hook migration")
        return stats

    hooks_dir = project_dot_claude / "hooks"

    # 1. context-essentials.md
    src = VAULT_DOT_CLAUDE / "context-essentials.md"
    dst = project_dot_claude / "context-essentials.md"
    if src.exists():
        if not dst.exists():
            stats["essentials"] = True
            if apply:
                dst.write_text(src.read_text(encoding="utf-8"), encoding="utf-8")
                print("  ✓  Deployed .claude/context-essentials.md")
            else:
                print("  ○  Would deploy .claude/context-essentials.md")
        else:
            print("  ─  .claude/context-essentials.md already exists")
    else:
        print(f"  ⚠  Source not found: {src}")

    # 2. pre-compact.sh (overwrite — hook was rewritten in v2.0.0)
    src = VAULT_DOT_CLAUDE / "hooks" / "pre-compact.sh"
    if src.exists() and hooks_dir.exists():
        dst = hooks_dir / "pre-compact.sh"
        src_text = src.read_text(encoding="utf-8")
        dst_text = dst.read_text(encoding="utf-8") if dst.exists() else ""
        if src_text != dst_text:
            stats["pre_compact"] = True
            if apply:
                dst.write_text(src_text, encoding="utf-8")
                dst.chmod(0o755)
                print("  ✓  Updated .claude/hooks/pre-compact.sh")
            else:
                print("  ○  Would update .claude/hooks/pre-compact.sh")
        else:
            print("  ─  pre-compact.sh already up to date")

    # 3. session-start-compact.sh (new in v2.0.0)
    src = VAULT_DOT_CLAUDE / "hooks" / "session-start-compact.sh"
    if src.exists():
        if not hooks_dir.exists():
            if apply:
                hooks_dir.mkdir(parents=True, exist_ok=True)
        dst = hooks_dir / "session-start-compact.sh"
        if not dst.exists():
            stats["session_start"] = True
            if apply:
                dst.write_text(src.read_text(encoding="utf-8"), encoding="utf-8")
                dst.chmod(0o755)
                print("  ✓  Deployed .claude/hooks/session-start-compact.sh")
            else:
                print("  ○  Would deploy .claude/hooks/session-start-compact.sh")
        else:
            print("  ─  session-start-compact.sh already exists")

    # 4. settings.json — add SessionStart(compact), remove PostCompact
    settings_path = project_dot_claude / "settings.json"
    if settings_path.exists():
        try:
            settings = json.loads(settings_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            print("  ⚠  Could not parse .claude/settings.json — skipping")
            return stats

        hooks = settings.setdefault("hooks", {})
        changed = False

        # Remove PostCompact — this hook event doesn't exist in Claude Code
        if "PostCompact" in hooks:
            del hooks["PostCompact"]
            changed = True
            print("  ─  Removed non-existent PostCompact hook from settings.json")

        # Add SessionStart with matcher:"compact" if not already present
        session_start = hooks.get("SessionStart", [])
        has_compact = any(
            isinstance(h, dict) and h.get("matcher") == "compact"
            for h in session_start
        )
        if not has_compact:
            session_start.append({
                "matcher": "compact",
                "hooks": [{
                    "type": "command",
                    "command": "bash .claude/hooks/session-start-compact.sh",
                    "timeout": 15,
                }]
            })
            hooks["SessionStart"] = session_start
            changed = True

        if changed:
            stats["settings"] = True
            if apply:
                settings_path.write_text(
                    json.dumps(settings, indent=2) + "\n", encoding="utf-8"
                )
                print("  ✓  Patched .claude/settings.json (SessionStart hook)")
            else:
                print("  ○  Would patch .claude/settings.json (SessionStart hook)")
        else:
            print("  ─  .claude/settings.json already has SessionStart(compact) hook")
    else:
        print("  ─  No .claude/settings.json — skipping settings patch")

    return stats


def migrate_project(project_path: Path, delegation_block: str | None, apply: bool) -> dict:
    """Run all project-level migrations."""
    stats = {"delegation": "skip", "manifest": False, "context_bus": False}

    print(f"\n  Project: {project_path}")

    # 1. Sync delegation block in CLAUDE.md
    claude_md = project_path / "CLAUDE.md"
    if claude_md.exists() and delegation_block:
        text = claude_md.read_text(encoding="utf-8")
        if MARKER_START in text:
            pattern = re.compile(
                rf"{re.escape(MARKER_START)}.*?{re.escape(MARKER_END)}",
                re.DOTALL,
            )
            new_text, count = pattern.subn(delegation_block, text)
            if count > 0 and new_text != text:
                stats["delegation"] = "updated"
                if apply:
                    claude_md.write_text(new_text, encoding="utf-8")
                    print("  ✓  CLAUDE.md delegation block synced")
                else:
                    print("  ○  Would sync CLAUDE.md delegation block")
            else:
                stats["delegation"] = "ok"
                print("  ─  CLAUDE.md delegation already up to date")
        else:
            stats["delegation"] = "no-markers"
            print("  ⚠  CLAUDE.md has no delegation markers")
    else:
        print("  ─  No CLAUDE.md found")

    # 2. Generate vault MANIFEST.md
    vault_path = project_path / "vault"
    if vault_path.exists():
        has_entries = generate_manifest(vault_path, apply)
        stats["manifest"] = has_entries
        if has_entries:
            if apply:
                print("  ✓  Generated vault/MANIFEST.md")
            else:
                print("  ○  Would generate vault/MANIFEST.md")
        else:
            print("  ─  Vault has no markdown files")
    else:
        print("  ─  No vault/ directory")

    # 3a. v2.0.0 hook + settings migration
    migrate_v200_hooks(project_path, apply)

    # 3b. Create .claude/context/ directory (context bus)
    context_dir = project_path / ".claude" / "context"
    if not context_dir.exists():
        stats["context_bus"] = True
        if apply:
            context_dir.mkdir(parents=True, exist_ok=True)
            (context_dir / ".gitkeep").touch()
            print("  ✓  Created .claude/context/ (context bus)")
        else:
            print("  ○  Would create .claude/context/")
    else:
        print("  ─  .claude/context/ already exists")

    return stats


# ── Main ───────────────────────────────────────────────────────────────────

def main():
    apply = "--apply" in sys.argv
    db_only = "--db-only" in sys.argv
    vault_only = "--vault-only" in sys.argv
    single_path = None
    if "--path" in sys.argv:
        idx = sys.argv.index("--path")
        if idx + 1 < len(sys.argv):
            single_path = Path(sys.argv[idx + 1])

    print(f"Execution-OS v2.0.0 Migration {'(DRY RUN)' if not apply else '(APPLYING)'}")
    print(f"{'=' * 60}\n")

    # Load delegation template
    delegation_block = None
    if TEMPLATE_PATH.exists():
        template_text = TEMPLATE_PATH.read_text(encoding="utf-8")
        pattern = re.compile(
            rf"({re.escape(MARKER_START)}.*?{re.escape(MARKER_END)})",
            re.DOTALL,
        )
        match = pattern.search(template_text)
        if match:
            delegation_block = match.group(1)

    # Phase 1: Database migrations (global — shared across all projects)
    if not vault_only:
        print("Phase 1: Database migrations (wantan-mem.db)")
        print("-" * 40)
        db_stats = migrate_database(apply)
        print()

    # Phase 2: Per-project migrations
    if not db_only:
        print("Phase 2: Project migrations")
        print("-" * 40)

        if single_path:
            projects = [single_path]
        else:
            projects = get_installed_project_paths()

        if not projects:
            print("  No installed projects found.")
        else:
            for project_path in projects:
                if project_path.exists():
                    migrate_project(project_path, delegation_block, apply)
                else:
                    print(f"\n  Project: {project_path}")
                    print(f"  ⚠  Path does not exist")

    print(f"\n{'=' * 60}")
    if not apply:
        print("DRY RUN complete. Run with --apply to execute changes.")
    else:
        print("Migration complete.")
        print("\nNext steps:")
        print("  1. Restart wantan-mem worker: cd plugin/mem && npx tsx src/worker/server.ts")
        print("     (worker restart auto-applies DB schema changes via runMigrations)")
        print("  2. Reload plugins in Claude Code: /reload-plugins")
        print("  3. Verify delegation still works: tell wantan to 'build X' — should route to Lelouch")
        print("  4. Verify compaction recovery: /compact, then check Wantan delegates correctly")


if __name__ == "__main__":
    main()
