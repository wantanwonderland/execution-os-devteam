#!/bin/bash
# PreCompact hook: Backup conversation transcript before context compression
# Reads JSON payload from stdin with transcript_path field

INPUT=$(cat)
TRANSCRIPT=$(echo "$INPUT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('transcript_path',''))" 2>/dev/null)

if [[ -z "$TRANSCRIPT" || ! -f "$TRANSCRIPT" ]]; then
  exit 0
fi

# Derive vault root from this script's location (.claude/hooks/ → vault root)
VAULT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
BACKUP_DIR="$VAULT_ROOT/08-inbox/captures"
mkdir -p "$BACKUP_DIR"

BACKUP_FILE="$BACKUP_DIR/session-backup-$(date +%Y%m%d-%H%M).jsonl"
cp "$TRANSCRIPT" "$BACKUP_FILE"

# Keep only last 5 backups
ls -t "$BACKUP_DIR"/session-backup-*.jsonl 2>/dev/null | tail -n +6 | xargs rm -f 2>/dev/null

exit 0
