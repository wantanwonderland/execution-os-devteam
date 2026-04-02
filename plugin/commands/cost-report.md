Token usage and cost analysis. Parses Claude Code session transcripts for detailed breakdown.

Usage:
- `/cost-report` — current session summary
- `/cost-report today` — all sessions today
- `/cost-report all` — all sessions for this project

## Steps

### Mode: Current Session (default)

1. **Find the active transcript**: Read the `transcript_path` from the current session context, or find the most recent `.jsonl` file in `~/.claude/projects/` matching the current working directory.

2. **Parse token usage**: Read each line of the JSONL transcript. For lines with `message.usage`, extract:
   - `input_tokens`
   - `output_tokens`
   - `cache_read_input_tokens`
   - `cache_creation_input_tokens`
   - `model` (from `message.model`)

3. **Calculate costs** using these rates (Claude 2026 pricing):

| Model | Input (per 1M) | Output (per 1M) | Cache Read (per 1M) | Cache Write (per 1M) |
|-------|----------------|------------------|---------------------|---------------------|
| claude-opus-4-6 | $15.00 | $75.00 | $1.50 | $18.75 |
| claude-sonnet-4-6 | $3.00 | $15.00 | $0.30 | $3.75 |
| claude-haiku-4-5 | $0.80 | $4.00 | $0.08 | $1.00 |

4. **Present summary**:

```markdown
## Cost Report — Current Session

**Duration**: {start_time} → {end_time} ({minutes} min)
**Model**: {model}
**Turns**: {count}

| Metric | Tokens | Cost |
|--------|--------|------|
| Input | {n} | ${cost} |
| Output | {n} | ${cost} |
| Cache Read | {n} | ${cost} |
| Cache Write | {n} | ${cost} |
| **Total** | **{n}** | **${cost}** |

### Per-Turn Breakdown (top 5 most expensive)
| Turn | Input | Output | Cache | Cost | What |
|------|-------|--------|-------|------|------|
| {n} | {tokens} | {tokens} | {tokens} | ${cost} | {first tool used} |
```

### Mode: Today

1. Find all `.jsonl` files in the project's Claude directory modified today.
2. Parse each file separately.
3. Present a summary table with one row per session.

```markdown
## Cost Report — Today ({date})

| Session | Duration | Model | Turns | Input | Output | Cache | Total Cost |
|---------|----------|-------|-------|-------|--------|-------|------------|
| {id} | {min}m | {model} | {n} | {n} | {n} | {n} | ${cost} |
| **Total** | | | | | | | **${total}** |
```

### Mode: All

1. Find all `.jsonl` files for this project (including subagents).
2. Aggregate by date.

```markdown
## Cost Report — All Sessions

| Date | Sessions | Turns | Input | Output | Cache | Total Cost |
|------|----------|-------|-------|--------|-------|------------|
| {date} | {n} | {n} | {n} | {n} | {n} | ${cost} |
| **Total** | {n} | {n} | {n} | {n} | {n} | **${total}** |

### By Model
| Model | Turns | Tokens | Cost | % of Total |
|-------|-------|--------|------|-----------|

### By Agent (subagent transcripts)
| Agent | Turns | Tokens | Cost |
|-------|-------|--------|------|
```

## Implementation

Use bash to parse the JSONL files:

```bash
# Find project transcript directory
PROJECT_DIR=$(echo "$PWD" | sed 's|/|-|g; s|^-||')
TRANSCRIPT_DIR="$HOME/.claude/projects/-$PROJECT_DIR"

# Parse a single transcript
python3 -c "
import json, os, sys, glob
from datetime import datetime

transcript_dir = '$TRANSCRIPT_DIR'
# Find all .jsonl files
files = glob.glob(f'{transcript_dir}/**/*.jsonl', recursive=True)
# ... parse and aggregate
"
```

The key insight is that Claude Code stores every message with full token usage in the JSONL transcript. The transcript path follows the pattern: `~/.claude/projects/-{project-path-with-dashes}/{session-id}.jsonl`.

Subagent transcripts are in: `~/.claude/projects/-{project-path}/{session-id}/subagents/{agent-id}.jsonl`.
