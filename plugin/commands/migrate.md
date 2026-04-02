Generate and manage database migrations. L handles migration creation and tracking.

Usage:
- `/migrate create {description}` — generate a new migration file
- `/migrate apply` — apply pending migrations
- `/migrate rollback` — rollback the last applied migration
- `/migrate status` — show migration history and pending state

## Steps

### Mode: Create (default when description provided)

#### Step 1: Determine Next Migration Number

Scan the migrations directory to find the highest existing number:

```bash
ls vault/02-docs/migrations/ | grep -oP '^\d+' | sort -n | tail -1
```

Increment by 1. If no migrations exist, start at `0001`. Zero-pad to 4 digits.

#### Step 2: Detect Migration Type

Infer the file extension from the project context:
- If project uses TypeScript/Drizzle/Prisma/Knex: `.ts`
- If project uses Python/Alembic/SQLAlchemy: `.py`
- If project uses raw SQL or no ORM detected: `.sql`
- If ambiguous: default to `.sql` and note the assumption

#### Step 3: Generate Migration File

Create `vault/02-docs/migrations/{NNNN}-{description-slug}.{ext}` with this structure:

**For `.sql`**:

```sql
-- Migration: {NNNN} — {description}
-- Created: YYYY-MM-DD
-- Author: L

-- ============================================================
-- UP (apply)
-- ============================================================

{SQL statements to apply the migration}

-- ============================================================
-- DOWN (rollback)
-- ============================================================

{SQL statements to reverse the migration exactly}
```

**For `.ts` (Knex-style)**:

```typescript
// Migration: {NNNN} — {description}
// Created: YYYY-MM-DD

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // {apply changes}
}

export async function down(knex: Knex): Promise<void> {
  // {reverse changes exactly}
}
```

**For `.py` (Alembic-style)**:

```python
"""
Migration: {NNNN} — {description}
Created: YYYY-MM-DD
"""

from alembic import op
import sqlalchemy as sa


def upgrade() -> None:
    # {apply changes}
    pass


def downgrade() -> None:
    # {reverse changes exactly}
    pass
```

#### Step 4: Validate SQL Syntax (for .sql files)

Run a dry-run validation to catch syntax errors:

```bash
sqlite3 :memory: < vault/02-docs/migrations/{NNNN}-{description-slug}.sql
```

If validation fails: fix the syntax error, re-run until clean.

For `.ts` or `.py` migrations, skip this step — syntax is validated at runtime.

#### Step 5: Confirm

Report:
```
Migration created: vault/02-docs/migrations/{NNNN}-{description-slug}.{ext}
Type: {sql/ts/py}
Syntax: {valid / not validated}

Review the file before applying. Run `/migrate apply` when ready.
```

---

### Mode: Apply

1. List migration files in `vault/02-docs/migrations/` sorted by number
2. Query `vault/data/company.db` migrations table (if exists) for already-applied migrations:
   ```sql
   SELECT migration_id FROM schema_migrations ORDER BY applied_at;
   ```
3. Identify pending migrations (files not in the applied list)
4. For each pending migration (in order):
   - Show the UP section to Wantan
   - **Wait for explicit approval** before executing: "Apply migration {NNNN}?"
   - On approval: execute against `vault/data/company.db`
   - Record in `schema_migrations` table

---

### Mode: Rollback

1. Query the most recently applied migration from `schema_migrations`
2. Show the DOWN section of that migration file to Wantan
3. **Wait for explicit approval** before executing: "Roll back migration {NNNN}?"
4. On approval: execute the DOWN section against `vault/data/company.db`
5. Remove the record from `schema_migrations`

---

### Mode: Status

Query migration state and present:

```markdown
## Migration Status — YYYY-MM-DD

| # | File | Status | Applied At |
|---|------|--------|-----------|
| 0001 | create-users-table | ✓ applied | 2026-01-15 09:23 |
| 0002 | add-email-index | ✓ applied | 2026-02-01 14:07 |
| 0003 | add-role-column | ⏳ pending | — |

**Applied**: {count} | **Pending**: {count}
**Last applied**: {migration name and date}
```

---

## Constraints

- Always generate BOTH up and down sections — a migration without rollback is incomplete
- Never apply a migration without Wantan's explicit approval
- Never skip migration numbers — always increment sequentially
- SQL validation is mandatory for `.sql` files before reporting the file as ready
- If `vault/02-docs/migrations/` does not exist, create it with a `.gitkeep` before proceeding
- Migration filenames use kebab-case slugs: `0001-add-users-table.sql`
