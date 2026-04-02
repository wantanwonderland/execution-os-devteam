---
name: api-spec
description: L's OpenAPI contract management skill. Generate specs from route definitions, validate spec structure, diff versions for breaking changes, and generate human-readable API docs.
---

# API Spec Workflow

When L is dispatched for API contract management, follow this workflow based on the requested mode.

## Input

L receives a mode (gen, validate, diff, docs) and a target file or spec path.

---

## Mode 1: Generate Spec from Route Definitions

Parse a route file and emit a well-formed OpenAPI 3.1 spec.

### Step 1: Detect Framework

Read the target file and identify the framework:

| Signal | Framework |
|--------|-----------|
| `express()`, `router.get/post/put/delete/patch` | Express (Node.js) |
| `@app.get`, `@router.get`, `FastAPI()` | FastAPI (Python) |
| `func.*http.HandlerFunc`, `mux.HandleFunc`, `chi.Router` | Go (net/http / chi / gorilla) |

If framework is undetectable, flag and ask for clarification before proceeding.

### Step 2: Extract Route Definitions

**Express (Node.js)**:
```bash
# Extract routes from file
grep -nE "(router|app)\.(get|post|put|delete|patch|all)\s*\(" {file}
```
For each route, read 20 lines of context to identify:
- Path parameters (`:id`, `:userId`)
- Request body shape (from validation middleware, Zod/Joi schema, or body destructuring)
- Response shape (from `res.json(...)` calls or type annotations)
- Auth middleware (presence of `authenticate`, `requireAuth`, `verifyToken`)

**FastAPI (Python)**:
```bash
grep -nE "@(app|router)\.(get|post|put|delete|patch)\(" {file}
```
FastAPI type annotations are ground truth for request/response shapes. Read Pydantic model definitions.

**Go (net/http / chi)**:
```bash
grep -nE "(HandleFunc|Handle|Get|Post|Put|Delete|Patch)\s*\(" {file}
```
Read struct definitions for request/response types. Check for binding tags (`json:"field"`).

### Step 3: Infer Schemas

For each endpoint:
1. **Path params**: Any `:param` or `{param}` in the route path
2. **Query params**: From `req.query.X`, `request.query_params.get("X")`, or `r.URL.Query().Get("X")`
3. **Request body**: From validation schema, type definition, or destructuring patterns
4. **Response body**: From `res.json({...})`, `return {...}`, or `json.NewEncoder(w).Encode(...)`
5. **Auth**: Presence of auth middleware → `security: [bearerAuth: []]`
6. **Error responses**: From explicit error handler patterns or try/catch blocks

### Step 4: Emit OpenAPI 3.1 Spec

```yaml
openapi: "3.1.0"
info:
  title: "{Inferred from filename or package name}"
  version: "1.0.0"
  description: "{Brief description of the API module}"
paths:
  /resource/{id}:
    get:
      summary: "{Inferred from handler name or comment}"
      operationId: "{camelCase verb + resource}"
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        "200":
          description: Success
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/{ResponseType}"
        "404":
          description: Not found
        "401":
          description: Unauthorized
      security:
        - bearerAuth: []
components:
  schemas:
    {TypeName}:
      type: object
      required: [field1, field2]
      properties:
        field1:
          type: string
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
```

**Inference rules**:
- If a field is always present in `res.json(...)` → `required`
- If a field is conditionally included → optional
- Numeric IDs → `type: integer`; UUID strings → `type: string, format: uuid`
- ISO dates → `type: string, format: date-time`
- Unknown shapes → `type: object` with a comment: `# TODO: define schema`

### Step 5: Output

1. Write spec to `02-docs/api-specs/{service-name}-openapi.yaml`
2. Add frontmatter wrapper to vault index file at `02-docs/api-specs/README.md` (create if absent)
3. Report: endpoints extracted, schemas inferred, TODOs flagged (fields L could not infer)

---

## Mode 2: Validate Spec

Validate that a spec file is well-formed OpenAPI 3.x.

### Checks

| Check | Rule |
|-------|------|
| Required top-level fields | `openapi`, `info`, `paths` must be present |
| `info` completeness | `title` and `version` required |
| Path format | All paths must start with `/` |
| HTTP methods | Only `get`, `post`, `put`, `delete`, `patch`, `head`, `options`, `trace` |
| `$ref` resolution | Every `$ref` must resolve to a defined component |
| `$ref` cycles | Detect circular references (A → B → A) — flag as error |
| Response codes | Every operation must have at least one 2xx response |
| Required fields | `in: path` params must have `required: true` |
| Schema types | `type` must be one of: `string`, `number`, `integer`, `boolean`, `array`, `object`, `null` |
| `operationId` uniqueness | No two operations may share an `operationId` |

### $ref Cycle Detection

```python
# Pseudocode for cycle detection
def detect_cycles(schema, visited=set(), path=[]):
    if schema.$ref in visited:
        return ERROR: "Cycle detected: " + " -> ".join(path + [schema.$ref])
    visited.add(schema.$ref)
    resolve(schema.$ref) and recurse
```

### Report Format

```markdown
## API Spec Validation: {filename}

**Status**: VALID / INVALID
**OpenAPI version**: {version}
**Endpoints**: {count}
**Schemas**: {count}

### Errors (must fix)
- Line {n}: {error description}

### Warnings (should fix)
- Line {n}: {warning description} — e.g., missing `description` on operation

### TODOs (informational)
- `{path}`: schema uses `type: object` without defined properties
```

---

## Mode 3: Diff Two Spec Versions for Breaking Changes

Compare `{old}` and `{new}` OpenAPI specs. Classify every difference as breaking or non-breaking.

### Breaking Change Definitions

| Change | Classification |
|--------|---------------|
| Endpoint removed | **BREAKING** |
| HTTP method removed from endpoint | **BREAKING** |
| Path parameter added (required) | **BREAKING** |
| Query parameter added (`required: true`) | **BREAKING** |
| Request body field added to `required` array | **BREAKING** |
| Request body field type changed | **BREAKING** |
| Response field removed | **BREAKING** |
| Response field type changed | **BREAKING** |
| Response status code removed | **BREAKING** |
| Auth requirement added (was public, now secured) | **BREAKING** |
| Endpoint added | Non-breaking |
| Optional field added to request | Non-breaking |
| Optional field added to response | Non-breaking |
| `description` or `summary` changed | Non-breaking |
| `operationId` changed | Non-breaking (but warn — SDK codegen impact) |
| Auth requirement removed | Non-breaking |

### Diff Algorithm

1. Build path inventory for both specs: `{method} {path}` → operation object
2. **Removed endpoints**: in old but not in new → BREAKING
3. **Added endpoints**: in new but not in old → non-breaking
4. **Changed endpoints**: present in both → deep compare:
   - Parameters: old vs new lists
   - RequestBody required fields: old vs new
   - Response schemas: field-by-field comparison per status code
5. Schema-level diff: recurse into `$ref` components referenced by changed endpoints

### Report Format

```markdown
## API Contract Diff: {old-file} → {new-file}

**Breaking changes**: {count} | **Non-breaking changes**: {count}

### BREAKING CHANGES (requires major version bump or deprecation notice)

| Endpoint | Change | Detail |
|----------|--------|--------|
| DELETE /users/{id} | Endpoint removed | Was: 204 No Content |
| GET /orders | Response field removed | `items[].discount` removed from 200 response |
| POST /auth/login | Required param added | `device_id` now required in request body |

### Non-Breaking Changes

| Endpoint | Change | Detail |
|----------|--------|--------|
| GET /products | Endpoint added | Returns paginated product list |
| GET /users/{id} | Optional field added to response | `avatar_url` added to 200 response |

### Recommendations

{If breaking changes exist}:
- Bump the major version: `v1.x.x` → `v2.0.0`
- Add deprecation notice to old endpoints before removal
- Notify consumers with at least 30 days lead time

{If no breaking changes}:
- Safe to release as minor or patch version
```

---

## Mode 4: Generate Human-Readable API Documentation

Convert an OpenAPI spec into a developer-friendly markdown reference.

### Output Structure

```markdown
# {API Title} — API Reference

**Version**: {version} | **Base URL**: {server URL or TBD}

## Authentication

{Describe security schemes from `components/securitySchemes`}

## Endpoints

### {Tag or path group}

---

#### {METHOD} {path}

{operation summary}

{operation description if present}

**Auth**: {Required / Not required} {scheme}

**Path Parameters**

| Name | Type | Required | Description |
|------|------|----------|-------------|

**Query Parameters**

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|

**Request Body** (`{content-type}`)

```json
{example request body}
```

**Responses**

| Code | Description | Schema |
|------|-------------|--------|

**Example Response** (`200`)

```json
{example response body}
```

---
```

### Example Generation Rules

- If schema has `example:` field → use it
- If schema has `enum:` → use first enum value
- String fields: use field name as example value (e.g., `"name": "name"`)
- Integer fields: use `1` or `0`
- Boolean fields: use `true`
- Nested objects: recurse one level
- Arrays: show one example item

### Output

Write to `02-docs/api-docs/{service-name}-api-reference.md` with full frontmatter.

---

## Versioning Strategy Guidance

When asked for versioning advice, apply this decision framework:

| Strategy | When to Use | Example |
|----------|-------------|---------|
| **URL path versioning** | Public API with many external consumers, long deprecation cycles | `GET /v1/users`, `GET /v2/users` |
| **Header versioning** | Internal API, clean URLs preferred, consumers control clients | `Accept: application/vnd.api+json; version=2` |
| **Query param versioning** | Simple APIs, easy debugging, no client code required | `GET /users?version=2` |

**Recommended default**: URL path versioning for external-facing APIs. Header versioning for internal service-to-service.

**Deprecation protocol**:
1. Add `Deprecation: true` and `Sunset: {date}` response headers on deprecated endpoints
2. Keep old version alive for minimum 90 days after new version ships
3. Log breaking changes in `02-docs/api-specs/CHANGELOG.md`
4. ADR required for any major version bump (dispatch L for adr-writer)

---

## Framework-Specific Patterns

### Express (Node.js)

```javascript
// Route definition pattern L can parse
router.get('/users/:id', authenticate, async (req, res) => {
  // L detects: GET /users/{id}, auth required, path param: id
});

router.post('/users', validate(createUserSchema), async (req, res) => {
  // L detects: POST /users, request body from createUserSchema (Zod/Joi)
});
```

### FastAPI (Python)

```python
# FastAPI — type annotations are ground truth
@app.get("/users/{user_id}", response_model=UserResponse)
async def get_user(user_id: int, db: Session = Depends(get_db)):
    # L detects: GET /users/{user_id}, path param: user_id (integer)
    # Response model: UserResponse (Pydantic)
```

### Go (chi router)

```go
// Go chi — L reads struct tags for schema inference
r.Get("/users/{id}", getUserHandler)

type UserResponse struct {
    ID    int    `json:"id"`
    Name  string `json:"name"`
    Email string `json:"email"`
}
// L infers: id (integer), name (string), email (string)
```

---

## Constraints

- NEVER invent schemas — flag as TODO if shape cannot be inferred from source
- ALWAYS check for existing spec before generating (avoid overwriting by default)
- Report every TODO field so callers know what manual review is needed
- Breaking changes must be surfaced prominently — never buried in a table
- Specs are written to `02-docs/api-specs/` — L does not write to other directories
