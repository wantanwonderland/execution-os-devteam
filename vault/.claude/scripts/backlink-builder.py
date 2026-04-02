#!/usr/bin/env python3
"""
Backlink Builder for Execution-OS vault.

Scans all vault .md files, computes pairwise relatedness scores,
and updates the `related: []` YAML frontmatter field with auto-generated backlinks.

Preserves all existing manual entries. Dry-run by default.

Usage:
    python3 .claude/scripts/backlink-builder.py              # Dry run
    python3 .claude/scripts/backlink-builder.py --write       # Apply changes
    python3 .claude/scripts/backlink-builder.py --verbose     # Show scoring details
    python3 .claude/scripts/backlink-builder.py --file PATH   # Single file only
"""

import argparse
import re
from collections import defaultdict
from datetime import datetime, timedelta
from pathlib import Path

try:
    import yaml
except ImportError:
    print("ERROR: PyYAML required. Install with: pip install pyyaml")
    raise SystemExit(1)

# ── Configuration ──────────────────────────────────────────────

VAULT_ROOT = Path(__file__).resolve().parent.parent.parent  # .claude/scripts/ -> vault root

EXCLUDE_DIRS = {'.claude', '.git', '.agents', 'node_modules'}

WEIGHTS = {
    'reciprocal_link': 10,
    'team_co_mentions': 8,
    'shared_tag': 4,        # per tag
    'venture_type_match': 3,
    'temporal_proximity': 2,
    'directory_proximity': 1,
}

MIN_SCORE_DEFAULT = 6
MAX_LINKS_DEFAULT = 7

# Tags too common to be meaningful for relatedness
EXCLUDED_TAGS = {'needs-review', 'team'}

TEAM_MEMBERS = [
    # Add your team member first names here for cross-reference scoring
]
TEAM_MEMBERS_MULTIWORD = []


# ── Data Structures ───────────────────────────────────────────

class VaultFile:
    def __init__(self, path, rel_path, frontmatter, body):
        self.path = path
        self.rel_path = rel_path  # relative to vault root
        self.title = frontmatter.get('title', '')
        self.tags = set(frontmatter.get('tags', []) or [])
        venture = frontmatter.get('venture', '')
        self.venture = venture if isinstance(venture, str) else str(venture)
        self.type = frontmatter.get('type', '')
        self.status = frontmatter.get('status', '')

        # Parse created date
        created = frontmatter.get('created', '')
        if isinstance(created, datetime):
            self.created = created
        elif isinstance(created, str) and created:
            try:
                self.created = datetime.strptime(created, '%Y-%m-%d')
            except ValueError:
                self.created = None
        else:
            self.created = created if created else None

        # Parse existing related links
        raw_related = frontmatter.get('related', [])
        if raw_related is None:
            raw_related = []
        self.existing_related = set(raw_related)

        # Detect team mentions in body
        self.team_mentions = detect_team_mentions(body)

        # Directory for proximity
        self.parent_dir = str(Path(rel_path).parent)


# ── Parsing ───────────────────────────────────────────────────

def split_frontmatter(text):
    """Split file text into (frontmatter_str, body_str). Returns (None, text) if no frontmatter."""
    if not text.startswith('---'):
        return None, text
    parts = text.split('---', 2)
    if len(parts) < 3:
        return None, text
    return parts[1], parts[2]


def parse_frontmatter(fm_str):
    """Parse YAML frontmatter string into dict."""
    try:
        data = yaml.safe_load(fm_str)
        return data if isinstance(data, dict) else {}
    except yaml.YAMLError:
        return {}


def detect_team_mentions(text):
    """Scan text for team member names. Returns set of names found."""
    mentions = set()
    for name in TEAM_MEMBERS:
        if re.search(r'\b' + re.escape(name) + r'\b', text):
            mentions.add(name)
    for name in TEAM_MEMBERS_MULTIWORD:
        if name in text:
            mentions.add(name)
    return mentions


# ── Scoring ───────────────────────────────────────────────────

def compute_score(a, b):
    """Compute relatedness score between two VaultFiles."""
    score = 0
    signals = []

    # Reciprocal link: A links B or B links A
    if a.rel_path in b.existing_related or b.rel_path in a.existing_related:
        score += WEIGHTS['reciprocal_link']
        signals.append('reciprocal')

    # Team co-mentions: both mention 2+ same people
    shared_team = a.team_mentions & b.team_mentions
    if len(shared_team) >= 2:
        score += WEIGHTS['team_co_mentions']
        signals.append(f'team:{",".join(sorted(shared_team))}')

    # Shared tags (excluding noisy ones)
    meaningful_a = a.tags - EXCLUDED_TAGS
    meaningful_b = b.tags - EXCLUDED_TAGS
    shared_tags = meaningful_a & meaningful_b
    if shared_tags:
        tag_score = WEIGHTS['shared_tag'] * len(shared_tags)
        score += tag_score
        signals.append(f'tags:{",".join(sorted(shared_tags))}')

    # Venture + type match
    if a.venture and a.venture == b.venture and a.type and a.type == b.type:
        score += WEIGHTS['venture_type_match']
        signals.append(f'venture+type:{a.venture}/{a.type}')

    # Temporal proximity: created within 7 days + at least 1 shared tag
    if a.created and b.created and shared_tags:
        days_apart = abs((a.created - b.created).days)
        if days_apart <= 7:
            score += WEIGHTS['temporal_proximity']
            signals.append(f'temporal:{days_apart}d')

    # Directory proximity
    if a.parent_dir == b.parent_dir:
        score += WEIGHTS['directory_proximity']
        signals.append(f'dir:{a.parent_dir}')

    return score, signals


# ── Frontmatter Surgery ──────────────────────────────────────

def update_related_field(filepath, new_related_list):
    """Update ONLY the related: field in YAML frontmatter via regex. Preserves all other formatting."""
    text = filepath.read_text(encoding='utf-8')

    if not text.startswith('---'):
        return False

    # Find frontmatter boundaries
    second_fence = text.index('---', 3)
    frontmatter = text[3:second_fence]
    rest = text[second_fence:]

    # Build new related value
    if not new_related_list:
        new_val = 'related: []'
    else:
        new_val = 'related: [' + ', '.join(sorted(new_related_list)) + ']'

    # Pattern 1: Multiline related with - items
    multiline_pattern = r'related:\s*\n(?:\s+-\s+.+\n)+'
    if re.search(multiline_pattern, frontmatter):
        frontmatter = re.sub(multiline_pattern, new_val + '\n', frontmatter)
    # Pattern 2: Inline related: [...]
    elif re.search(r'related:\s*\[.*?\]', frontmatter):
        frontmatter = re.sub(r'related:\s*\[.*?\]', new_val, frontmatter)
    # Pattern 3: Bare related: (no value)
    elif re.search(r'related:\s*$', frontmatter, re.MULTILINE):
        frontmatter = re.sub(r'related:\s*$', new_val, frontmatter, flags=re.MULTILINE)
    else:
        return False  # No related field found

    filepath.write_text('---' + frontmatter + rest, encoding='utf-8')
    return True


# ── Main ──────────────────────────────────────────────────────

def scan_vault(vault_root, exclude_dirs):
    """Scan vault for .md files, parse frontmatter and body."""
    files = {}
    for md_path in sorted(vault_root.rglob('*.md')):
        # Skip excluded directories
        rel = md_path.relative_to(vault_root)
        if any(part in exclude_dirs for part in rel.parts):
            continue

        text = md_path.read_text(encoding='utf-8')
        fm_str, body = split_frontmatter(text)
        if fm_str is None:
            continue

        fm = parse_frontmatter(fm_str)
        if not fm:
            continue

        rel_path = str(rel)
        files[rel_path] = VaultFile(md_path, rel_path, fm, body)

    return files


def build_inverted_indexes(files):
    """Build indexes for efficient pair filtering."""
    tag_index = defaultdict(set)      # tag -> set of rel_paths
    venture_index = defaultdict(set)  # venture -> set of rel_paths
    dir_index = defaultdict(set)      # parent_dir -> set of rel_paths
    team_index = defaultdict(set)     # team_member -> set of rel_paths

    for rel_path, vf in files.items():
        for tag in vf.tags - EXCLUDED_TAGS:
            tag_index[tag].add(rel_path)
        if vf.venture:
            venture_index[vf.venture].add(rel_path)
        dir_index[vf.parent_dir].add(rel_path)
        for name in vf.team_mentions:
            team_index[name].add(rel_path)

    return tag_index, venture_index, dir_index, team_index


def find_candidate_pairs(files, tag_index, venture_index, dir_index, team_index):
    """Find file pairs that share at least one signal (avoid full O(n^2))."""
    candidates = set()

    # From tag co-occurrence
    for tag, paths in tag_index.items():
        path_list = sorted(paths)
        for i in range(len(path_list)):
            for j in range(i + 1, len(path_list)):
                candidates.add((path_list[i], path_list[j]))

    # From team co-occurrence
    for name, paths in team_index.items():
        path_list = sorted(paths)
        for i in range(len(path_list)):
            for j in range(i + 1, len(path_list)):
                candidates.add((path_list[i], path_list[j]))

    # From existing related links (for reciprocal check)
    for rel_path, vf in files.items():
        for linked in vf.existing_related:
            if linked in files and linked != rel_path:
                pair = tuple(sorted([rel_path, linked]))
                candidates.add(pair)

    # From directory proximity
    for dir_path, paths in dir_index.items():
        path_list = sorted(paths)
        for i in range(len(path_list)):
            for j in range(i + 1, len(path_list)):
                candidates.add((path_list[i], path_list[j]))

    return candidates


def main():
    parser = argparse.ArgumentParser(description='Backlink Builder for Execution-OS vault')
    parser.add_argument('--write', action='store_true', help='Actually update files (default: dry-run)')
    parser.add_argument('--min-score', type=int, default=MIN_SCORE_DEFAULT, help=f'Minimum relatedness score (default: {MIN_SCORE_DEFAULT})')
    parser.add_argument('--max-links', type=int, default=MAX_LINKS_DEFAULT, help=f'Max related links per file (default: {MAX_LINKS_DEFAULT})')
    parser.add_argument('--verbose', action='store_true', help='Show scoring details')
    parser.add_argument('--file', type=str, help='Only compute for a single file (relative path from vault root)')
    args = parser.parse_args()

    vault_root = VAULT_ROOT
    print(f"Vault root: {vault_root}")

    # Scan
    files = scan_vault(vault_root, EXCLUDE_DIRS)
    print(f"Scanned: {len(files)} files")

    if args.file and args.file not in files:
        print(f"ERROR: File not found in vault: {args.file}")
        raise SystemExit(1)

    # Build indexes
    tag_idx, venture_idx, dir_idx, team_idx = build_inverted_indexes(files)

    # Find candidate pairs
    candidates = find_candidate_pairs(files, tag_idx, venture_idx, dir_idx, team_idx)
    print(f"Candidate pairs: {len(candidates)}")

    # Score all candidates
    scores = {}  # (path_a, path_b) -> (score, signals)
    for path_a, path_b in candidates:
        score, signals = compute_score(files[path_a], files[path_b])
        if score >= args.min_score:
            scores[(path_a, path_b)] = (score, signals)

    print(f"Pairs above threshold (>={args.min_score}): {len(scores)}")

    # Build new links per file
    new_links = defaultdict(list)  # rel_path -> [(score, target_path, signals)]
    for (path_a, path_b), (score, signals) in scores.items():
        new_links[path_a].append((score, path_b, signals))
        new_links[path_b].append((score, path_a, signals))

    # Filter: only target file if --file specified
    if args.file:
        new_links = {k: v for k, v in new_links.items() if k == args.file}

    # Apply caps and preserve existing
    changes = {}  # rel_path -> (existing, to_add)
    total_added = 0

    for rel_path, candidates_list in sorted(new_links.items()):
        vf = files[rel_path]
        existing = set(vf.existing_related)

        # Sort candidates by score descending
        candidates_list.sort(key=lambda x: x[0], reverse=True)

        slots = args.max_links - len(existing)
        to_add = []

        for score, target, signals in candidates_list:
            if slots <= 0:
                break
            if target not in existing and target != rel_path:
                to_add.append((score, target, signals))
                slots -= 1

        if to_add:
            changes[rel_path] = (existing, to_add)
            total_added += len(to_add)

    # Report
    mode = "WRITE" if args.write else "DRY RUN"
    print(f"\n{'=' * 50}")
    print(f"  Backlink Builder ({mode})")
    print(f"{'=' * 50}")
    print(f"  Files scanned:    {len(files)}")
    print(f"  Pairs evaluated:  {len(candidates)}")
    print(f"  New links to add: {total_added}")
    print(f"  Files to update:  {len(changes)}")
    print(f"{'=' * 50}\n")

    if not changes:
        print("No new backlinks to add.")
        return

    for rel_path, (existing, to_add) in sorted(changes.items()):
        print(f"FILE: {rel_path}")
        for e in sorted(existing):
            print(f"  KEEP (existing): {e}")
        for score, target, signals in to_add:
            sig_str = ' + '.join(signals) if args.verbose else ''
            score_str = f"(score={score})"
            if args.verbose:
                print(f"  + ADD {score_str}: {target}")
                print(f"      Signals: {sig_str}")
            else:
                print(f"  + ADD {score_str}: {target}")
        print()

    # Write changes
    if args.write:
        written = 0
        for rel_path, (existing, to_add) in changes.items():
            vf = files[rel_path]
            final_related = sorted(existing | {t for _, t, _ in to_add})
            if update_related_field(vf.path, final_related):
                written += 1
            else:
                print(f"  WARNING: Could not update {rel_path}")

        print(f"Updated {written}/{len(changes)} files.")
    else:
        print("Run with --write to apply changes.")


if __name__ == '__main__':
    main()
