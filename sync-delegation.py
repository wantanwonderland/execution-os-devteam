#!/usr/bin/env python3
"""
sync-delegation.py

Syncs the delegation block in CLAUDE.md across all projects that have the
execution-os-devteam plugin installed.

The delegation block is delimited by:
    <!-- WANTAN:DELEGATION:START -->
    ...
    <!-- WANTAN:DELEGATION:END -->

Usage:
    python3 sync-delegation.py              # dry run (shows what would change)
    python3 sync-delegation.py --apply      # apply changes
    python3 sync-delegation.py --apply --path /path/to/project  # single project
"""

import json
import os
import re
import sys
from pathlib import Path

MARKER_START = "<!-- WANTAN:DELEGATION:START -->"
MARKER_END = "<!-- WANTAN:DELEGATION:END -->"
PLUGIN_ID = "execution-os-devteam@execution-os-devteam"

TEMPLATE_PATH = Path(__file__).parent / "vault" / "CLAUDE.md"
INSTALLED_PLUGINS_PATH = Path.home() / ".claude" / "plugins" / "installed_plugins.json"


def extract_delegation_block(text: str) -> str | None:
    """Extract the content between delegation markers (inclusive of markers)."""
    pattern = re.compile(
        rf"({re.escape(MARKER_START)}.*?{re.escape(MARKER_END)})",
        re.DOTALL,
    )
    match = pattern.search(text)
    return match.group(1) if match else None


def replace_delegation_block(text: str, new_block: str) -> tuple[str, bool]:
    """Replace the delegation block in text. Returns (new_text, changed)."""
    pattern = re.compile(
        rf"{re.escape(MARKER_START)}.*?{re.escape(MARKER_END)}",
        re.DOTALL,
    )
    new_text, count = pattern.subn(new_block, text)
    return new_text, count > 0 and new_text != text


def get_installed_project_paths() -> list[Path]:
    """Read all project paths that have the plugin installed from installed_plugins.json."""
    if not INSTALLED_PLUGINS_PATH.exists():
        print(f"  ⚠  installed_plugins.json not found at {INSTALLED_PLUGINS_PATH}")
        return []

    with open(INSTALLED_PLUGINS_PATH) as f:
        data = json.load(f)

    # Support both flat {plugin_id: [...]} and wrapped {"plugins": {plugin_id: [...]}}
    plugins = data.get("plugins", data)
    entries = plugins.get(PLUGIN_ID, [])
    seen = set()
    paths = []
    for entry in entries:
        project_path = entry.get("projectPath")
        if project_path and project_path not in seen:
            seen.add(project_path)
            paths.append(Path(project_path))
    return paths


def sync_project(project_path: Path, new_block: str, apply: bool) -> str:
    """Sync a single project's CLAUDE.md. Returns a status string."""
    claude_md = project_path / "CLAUDE.md"

    if not claude_md.exists():
        return "SKIP  (no CLAUDE.md)"

    text = claude_md.read_text(encoding="utf-8")

    if MARKER_START not in text:
        return "SKIP  (no delegation markers — add them manually first)"

    new_text, changed = replace_delegation_block(text, new_block)

    if not changed:
        return "OK    (already up to date)"

    if apply:
        claude_md.write_text(new_text, encoding="utf-8")
        return "UPDATED"
    else:
        return "STALE (run with --apply to update)"


def main():
    apply = "--apply" in sys.argv
    single_path = None
    if "--path" in sys.argv:
        idx = sys.argv.index("--path")
        if idx + 1 < len(sys.argv):
            single_path = Path(sys.argv[idx + 1])

    # Load template
    if not TEMPLATE_PATH.exists():
        print(f"ERROR: Template not found at {TEMPLATE_PATH}")
        sys.exit(1)

    template_text = TEMPLATE_PATH.read_text(encoding="utf-8")
    new_block = extract_delegation_block(template_text)

    if not new_block:
        print("ERROR: No delegation markers found in vault/CLAUDE.md")
        print(f"  Expected: {MARKER_START} ... {MARKER_END}")
        sys.exit(1)

    print(f"Execution-OS delegation sync {'(DRY RUN)' if not apply else '(APPLYING)'}")
    print(f"Template: {TEMPLATE_PATH}\n")

    # Determine target projects
    if single_path:
        projects = [single_path]
    else:
        projects = get_installed_project_paths()

    if not projects:
        print("No projects found.")
        sys.exit(0)

    updated = 0
    skipped = 0
    already_ok = 0

    for project_path in projects:
        status = sync_project(project_path, new_block, apply)
        label = status.split()[0]
        print(f"  [{label:7}] {project_path}")
        if status.startswith("SKIP"):
            skipped += 1
        elif status.startswith("OK"):
            already_ok += 1
        else:
            updated += 1

    print(f"\nDone. {updated} {'updated' if apply else 'stale'} · {already_ok} up to date · {skipped} skipped")

    if not apply and updated > 0:
        print("Run with --apply to apply changes.")


if __name__ == "__main__":
    main()
