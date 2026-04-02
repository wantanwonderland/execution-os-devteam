---
name: database-design
description: Conan's database design skill. Schema modeling, normalization, indexing strategy, ORM setup, and migration patterns. Reverse-engineered from alirezarezvani.
---

# Database Design

## Schema Modeling Workflow

### Step 1: Identify Entities
From requirements, list every noun that needs persistence: User, Post, Comment, Order, Product, etc.

### Step 2: Define Relationships
| Relationship | SQL Pattern | ORM Pattern |
|-------------|------------|-------------|
| One-to-One | FK + UNIQUE | `@relation` / `relationship()` |
| One-to-Many | FK on many side | `@relation` / `relationship(back_populates)` |
| Many-to-Many | Junction table | Implicit many-to-many or explicit join model |
| Self-referential | FK to same table | `parentId` → `parent` relation |

### Step 3: Normalize (3NF)
1. **1NF**: No repeating groups, atomic values
2. **2NF**: All non-key columns depend on the FULL primary key
3. **3NF**: No transitive dependencies (non-key depending on non-key)

Denormalize deliberately for read performance only when profiling proves need.

### Step 4: Indexing Strategy
| Query Pattern | Index Type |
|--------------|-----------|
| Equality lookup (`WHERE email = ?`) | B-tree (default) |
| Range query (`WHERE created_at > ?`) | B-tree |
| Full-text search | GIN / FTS |
| Geospatial (`WHERE location NEAR ?`) | GiST |
| Composite filter (`WHERE status = ? AND date > ?`) | Composite index (status, date) |

Rules:
- Index every foreign key
- Index every column used in WHERE/ORDER BY/JOIN
- Composite indexes: most selective column first
- Don't over-index — each index slows writes

### Step 5: Choose ORM

| Stack | ORM | Why |
|-------|-----|-----|
| TypeScript | Prisma | Type-safe, great DX, migrations built-in |
| TypeScript | Drizzle | Lighter, SQL-first, better for complex queries |
| Python | SQLAlchemy | Mature, flexible, async support |
| Python | Django ORM | Built into Django, good for CRUD-heavy apps |
| Go | GORM | Most popular, conventions over configuration |
| Rust | Diesel | Compile-time query checking |

### Prisma Schema Example

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String
  password  String
  role      Role     @default(USER)
  posts     Post[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([email])
}

model Post {
  id        String   @id @default(cuid())
  title     String
  content   String
  published Boolean  @default(false)
  author    User     @relation(fields: [authorId], references: [id])
  authorId  String
  tags      Tag[]
  createdAt DateTime @default(now())

  @@index([authorId])
  @@index([published, createdAt])
}

enum Role {
  USER
  ADMIN
}
```

## Anti-Patterns to Avoid

- **God table**: One table with 50+ columns → split into related tables
- **Stringly-typed**: Status as free text → use enum
- **Missing timestamps**: Every table needs `createdAt`, `updatedAt`
- **No soft delete strategy**: Decide upfront: hard delete vs `deletedAt` column
- **N+1 queries**: Always use joins/includes, never query in a loop

## Constraints

- Every table gets `id`, `createdAt`, `updatedAt`
- Every FK gets an index
- Use UUIDs/CUIDs for public-facing IDs, auto-increment for internal
- Schema changes always go through migration (never raw ALTER TABLE)
- Test with seed data that covers edge cases
