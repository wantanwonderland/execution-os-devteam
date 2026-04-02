Tech debt dashboard. View inventory, add items, and track resolution.

Usage:
- `/debt` — show tech debt inventory (dispatches Senku)
- `/debt add {repo} "{title}" {severity} {category}` — add tech debt item
- `/debt resolve {id}` — mark item as resolved

## Steps

### Mode: Inventory (default)

Dispatch Senku with the tech-debt-tracker skill to show the full inventory.

### Mode: Add

1. Parse: repo, title, severity (critical/high/medium/low), category (dependency/architecture/testing/documentation/performance/security)
2. Insert into `tech_debt` table
3. Confirm: "Tech debt item added: {title} ({severity}/{category}) for {repo}"

### Mode: Resolve

1. Mark item as resolved: `UPDATE tech_debt SET resolved_at = datetime('now') WHERE id = {id}`
2. Confirm: "Tech debt #{id} resolved"
