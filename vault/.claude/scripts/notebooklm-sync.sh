#!/usr/bin/env bash
# notebooklm-sync.sh — Batch sync recent vault files to NotebookLM
#
# Usage:
#   .claude/scripts/notebooklm-sync.sh [days]
#
# Arguments:
#   days — Number of days to look back (default: 7)
#
# Requires:
#   - notebooklm-mcp-cli installed (pip install notebooklm-mcp-cli)
#   - Valid auth via `nlm login`
#   - Run from the Execution-OS repo root

set -euo pipefail

DAYS="${1:-7}"
VAULT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

# Notebook IDs — Configure these with your NotebookLM notebook IDs
# Run `nlm notebook list` to discover your notebook IDs
# Topic notebooks (most specific)
TEAM_PERFORMANCE="${TEAM_PERFORMANCE_NOTEBOOK_ID:-YOUR_NOTEBOOK_ID}"  # Set your Team Performance notebook ID
AI_TOOLS="${AI_TOOLS_NOTEBOOK_ID:-YOUR_NOTEBOOK_ID}"              # Set your AI Tools notebook ID
# General notebooks (fallback)
OPERATING_BRAIN="${OPERATING_BRAIN_NOTEBOOK_ID:-YOUR_NOTEBOOK_ID}"
INTELLECTUAL_CAPITAL="${INTELLECTUAL_CAPITAL_NOTEBOOK_ID:-YOUR_NOTEBOOK_ID}"

echo "=== NotebookLM Vault Sync ==="
echo "Looking back: ${DAYS} days"
echo "Vault root: ${VAULT_ROOT}"
echo ""

# Find recently modified .md files (excluding .claude/, .git/, node_modules/)
RECENT_FILES=$(find "$VAULT_ROOT" \
  -name "*.md" \
  -mtime -"$DAYS" \
  -not -path "*/.claude/*" \
  -not -path "*/.git/*" \
  -not -path "*/node_modules/*" \
  -not -name "CLAUDE.md" \
  -not -name "CLAUDE.local.md" \
  -not -name "README.md" \
  | sort)

if [ -z "$RECENT_FILES" ]; then
  echo "No files modified in the last ${DAYS} days."
  exit 0
fi

echo "Found files to sync:"
echo "$RECENT_FILES" | while read -r f; do
  echo "  $(basename "$f")"
done
echo ""

# Determine notebook for each file — topic notebooks first, then general fallback
route_to_notebook() {
  local filepath="$1"
  case "$filepath" in
    # Topic notebooks (most specific, checked first)
    *appraisal*|*pip*|*compensation*|*performance*|*tier-rating*|*people-action*)
      echo "$TEAM_PERFORMANCE"
      ;;
    *ai-*|*llm*|*model*|*prompt*|*agent*)
      echo "$AI_TOOLS"
      ;;
    # General fallback
    */00-identity/*|*/01-projects/*|*/04-decisions/*|*/05-goals/*|*/06-ceremonies/*|*/08-inbox/*)
      echo "$OPERATING_BRAIN"
      ;;
    */02-docs/*|*/03-research/*|*/07-personal/*)
      echo "$INTELLECTUAL_CAPITAL"
      ;;
    *)
      echo "SKIP"
      ;;
  esac
}

INGESTED=0
SKIPPED=0
ERRORS=0

while IFS= read -r filepath; do
  NOTEBOOK=$(route_to_notebook "$filepath")
  if [ "$NOTEBOOK" = "SKIP" ]; then
    echo "  SKIP: $(basename "$filepath") (not mapped to a notebook)"
    SKIPPED=$((SKIPPED + 1))
    continue
  fi

  TITLE=$(basename "$filepath" .md)
  CONTENT=$(cat "$filepath")

  if nlm source add "$NOTEBOOK" --text "$CONTENT" --title "$TITLE" > /dev/null 2>&1; then
    echo "  ✓ ${TITLE}"
    INGESTED=$((INGESTED + 1))
  else
    echo "  ✗ ${TITLE}"
    ERRORS=$((ERRORS + 1))
  fi
done <<< "$RECENT_FILES"

echo ""
echo "=== Sync complete: ${INGESTED} ingested, ${SKIPPED} skipped, ${ERRORS} errors ==="
