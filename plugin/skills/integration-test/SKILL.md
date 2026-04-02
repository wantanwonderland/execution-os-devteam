---
name: integration-test
description: Killua scaffolds integration tests for APIs, databases, and service-to-service contracts. Covers supertest (Express), httpx (FastAPI), test containers, and consumer-driven contract testing.
---

# Integration Test Scaffolding

When Killua is dispatched to scaffold integration tests, follow this workflow exactly.

## Input

Killua receives one of:
- A service name or directory to scaffold tests for
- An API route file or OpenAPI spec
- A service pair for contract testing (consumer + provider)

## Execution Flow

### 1. Classify the Integration Scope

Determine which integration layer to test:

| Signal | Test Type |
|--------|-----------|
| Express/Fastify/Koa routes | API endpoint tests (supertest) |
| FastAPI/Flask/Django routes | API endpoint tests (httpx/pytest) |
| Database queries, ORM models | Database integration tests |
| Two services calling each other | Contract tests (Pact) |
| External HTTP dependencies | Service mock tests (WireMock/nock) |

Multiple types may apply — scaffold all relevant layers.

### 2. API Endpoint Tests

#### Express / Node.js (supertest)

```typescript
import request from 'supertest';
import { app } from '../src/app';
import { db } from '../src/db';

// Setup: real app instance, isolated test DB
beforeAll(async () => {
  await db.migrate.latest();
  await db.seed.run();
});

afterAll(async () => {
  await db.destroy();
});

describe('POST /api/users', () => {
  // Happy path
  it('creates a user and returns 201', async () => {
    const response = await request(app)
      .post('/api/users')
      .send({ email: 'test@example.com', name: 'Test User' })
      .expect(201);

    expect(response.body).toMatchObject({
      id: expect.any(String),
      email: 'test@example.com',
    });
  });

  // Validation
  it('returns 400 for missing required fields', async () => {
    const response = await request(app)
      .post('/api/users')
      .send({ name: 'No Email' })
      .expect(400);

    expect(response.body.error).toMatch(/email/i);
  });

  // Auth
  it('returns 401 when Authorization header is missing', async () => {
    await request(app)
      .get('/api/users/me')
      .expect(401);
  });

  it('returns 403 when user lacks required role', async () => {
    const token = generateToken({ role: 'viewer' });
    await request(app)
      .delete('/api/users/123')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  // Not found
  it('returns 404 for non-existent resource', async () => {
    await request(app)
      .get('/api/users/nonexistent-id')
      .expect(404);
  });
});
```

#### FastAPI / Python (httpx + pytest)

```python
import pytest
import httpx
from httpx import AsyncClient
from app.main import app
from app.database import get_db, Base, engine

# Setup: test DB with rollback per test
@pytest.fixture(scope="session")
def test_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
async def client(test_db):
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac

class TestCreateUser:
    # Happy path
    async def test_creates_user_returns_201(self, client):
        response = await client.post("/api/users", json={
            "email": "test@example.com",
            "name": "Test User"
        })
        assert response.status_code == 201
        data = response.json()
        assert data["email"] == "test@example.com"
        assert "id" in data

    # Validation
    async def test_missing_email_returns_422(self, client):
        response = await client.post("/api/users", json={"name": "No Email"})
        assert response.status_code == 422
        assert "email" in response.text.lower()

    # Duplicate
    async def test_duplicate_email_returns_409(self, client):
        payload = {"email": "dup@example.com", "name": "User"}
        await client.post("/api/users", json=payload)
        response = await client.post("/api/users", json=payload)
        assert response.status_code == 409
```

### 3. Database Integration Tests

#### Test Containers Pattern (real DB in Docker)

```typescript
// Jest + testcontainers (Node.js)
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { Knex, knex } from 'knex';

let container: StartedPostgreSqlContainer;
let db: Knex;

beforeAll(async () => {
  container = await new PostgreSqlContainer().start();
  db = knex({
    client: 'pg',
    connection: container.getConnectionUri(),
  });
  await db.migrate.latest();
}, 60_000); // container startup timeout

afterAll(async () => {
  await db.destroy();
  await container.stop();
});

describe('UserRepository', () => {
  beforeEach(async () => {
    await db('users').truncate();
  });

  it('inserts and retrieves a user', async () => {
    const repo = new UserRepository(db);
    const created = await repo.create({ email: 'a@b.com', name: 'Test' });
    const found = await repo.findById(created.id);
    expect(found).toMatchObject({ email: 'a@b.com' });
  });

  it('enforces unique email constraint', async () => {
    await db('users').insert({ email: 'dup@b.com', name: 'A' });
    await expect(
      db('users').insert({ email: 'dup@b.com', name: 'B' })
    ).rejects.toThrow(/unique/i);
  });
});
```

#### In-Memory SQLite Pattern (lightweight, no Docker)

```python
# Pytest + SQLite in-memory (Python)
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import Base, User
from app.repositories.user_repo import UserRepository

@pytest.fixture(scope="function")
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()
    Base.metadata.drop_all(engine)

class TestUserRepository:
    def test_create_and_retrieve(self, db_session):
        repo = UserRepository(db_session)
        user = repo.create(email="a@b.com", name="Test")
        found = repo.find_by_id(user.id)
        assert found.email == "a@b.com"

    def test_duplicate_email_raises(self, db_session):
        repo = UserRepository(db_session)
        repo.create(email="dup@b.com", name="A")
        with pytest.raises(Exception, match="UNIQUE"):
            repo.create(email="dup@b.com", name="B")
```

### 4. Test Data Factories

#### Factory Pattern (JS/TS)

```typescript
// factories/user.factory.ts
import { faker } from '@faker-js/faker';

export const userFactory = {
  build: (overrides: Partial<User> = {}): User => ({
    id: faker.string.uuid(),
    email: faker.internet.email(),
    name: faker.person.fullName(),
    role: 'viewer',
    createdAt: new Date(),
    ...overrides,
  }),

  create: async (db: Knex, overrides: Partial<User> = {}): Promise<User> => {
    const data = userFactory.build(overrides);
    const [user] = await db('users').insert(data).returning('*');
    return user;
  },
};
```

#### Factory Pattern (Python)

```python
# factories/user_factory.py
from faker import Faker
from app.models import User

fake = Faker()

def make_user(db_session, **overrides):
    defaults = {
        "email": fake.email(),
        "name": fake.name(),
        "role": "viewer",
    }
    data = {**defaults, **overrides}
    user = User(**data)
    db_session.add(user)
    db_session.commit()
    return user
```

### 5. Service Contract Tests (Consumer-Driven)

Consumer-driven contract testing ensures service A (consumer) and service B (provider) agree on the API contract without needing both running at once.

#### Pact (JS — Consumer Side)

```typescript
// consumer: orders-service
import { Pact } from '@pact-foundation/pact';
import { getUserById } from '../src/clients/user-client';

const provider = new Pact({
  consumer: 'OrdersService',
  provider: 'UsersService',
  port: 8080,
});

describe('UsersService contract', () => {
  beforeAll(() => provider.setup());
  afterAll(() => provider.finalize());
  afterEach(() => provider.verify());

  it('returns user data for a valid ID', async () => {
    await provider.addInteraction({
      state: 'user 123 exists',
      uponReceiving: 'a request for user 123',
      withRequest: {
        method: 'GET',
        path: '/users/123',
        headers: { Accept: 'application/json' },
      },
      willRespondWith: {
        status: 200,
        body: { id: '123', email: 'user@example.com', name: 'Test User' },
      },
    });

    const user = await getUserById('123');
    expect(user.email).toBe('user@example.com');
  });
});
```

#### Pact (JS — Provider Verification)

```typescript
// provider: users-service
import { Verifier } from '@pact-foundation/pact';

describe('Pact verification', () => {
  it('verifies all consumer contracts', async () => {
    await new Verifier({
      provider: 'UsersService',
      providerBaseUrl: 'http://localhost:3001',
      pactBrokerUrl: process.env.PACT_BROKER_URL,
      publishVerificationResult: true,
    }).verifyProvider();
  });
});
```

### 6. Setup / Teardown Patterns

| Scope | Pattern | Use When |
|-------|---------|----------|
| Per test | `beforeEach` / `afterEach` truncate + re-seed | Tests mutate state, need isolation |
| Per file | `beforeAll` / `afterAll` migrate + drop | DB schema is stable, mutations rolled back |
| Per session | Container start once, share across suites | Expensive containers (Postgres, Redis) |
| Transactional | Begin txn in `beforeEach`, rollback in `afterEach` | Fastest — no truncate needed |

Transactional rollback pattern (fastest):

```typescript
// Knex transactional rollback
let trx: Knex.Transaction;

beforeEach(async () => {
  trx = await db.transaction();
});

afterEach(async () => {
  await trx.rollback();
});
```

### 7. Run Integration Tests

```bash
# Jest (Node.js) — with integration tag
npx jest --testPathPattern="integration" --runInBand --forceExit

# Pytest
pytest tests/integration/ -v --tb=short

# Go
go test ./... -tags=integration -v
```

`--runInBand` (Jest) / sequential execution is recommended for DB integration tests to prevent transaction conflicts.

### 8. Write Results

1. **Test files**: Write scaffolded tests to correct paths
2. **Vault report**: Write to `vault/09-ops/test-reports/YYYY-MM-DD-integration-test.md`:

```markdown
---
title: "Integration Test Scaffold -- {service} -- YYYY-MM-DD"
created: YYYY-MM-DD
type: note
tags: [testing, integration-tests]
status: active
project: []
related: []
---

## Integration Test Scaffold -- YYYY-MM-DD

**Service**: {service name}
**Test Types**: {API / DB / Contract}
**Files Created**: {count}

| File | Test Cases | Type |
|------|-----------|------|
| {path} | {n} | API / DB / Contract |

### Setup Notes
- DB strategy: {test containers / in-memory SQLite / transactional rollback}
- Factories created: {list}
- Pact contracts: {consumer/provider pair if applicable}

### Run Command
{command to run these specific tests}
```

## Constraints

- Always use an isolated test database — never run against production or staging
- Factories must use fake/random data — never hardcode real emails, names, or IDs
- Test containers require Docker — if unavailable, fall back to in-memory SQLite and note the limitation
- Contract tests require Pact broker URL — if not configured, generate consumer pact files locally and note that verification is pending
- Never modify production database schema in test setup
- Report exact test counts — never approximate
