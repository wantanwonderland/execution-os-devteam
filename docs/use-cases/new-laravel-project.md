# Use Case: Start a New Laravel Project

Build a Laravel API with MySQL, Sanctum auth, and Vue.js frontend.

---

## Setup

```bash
# Create your project
mkdir my-laravel-app && cd my-laravel-app
git init

# Start Claude Code and install the plugin
claude
/plugin marketplace add wantanwonderland/execution-os-devteam
/plugin install execution-os-devteam
```

---

## Step 1: Scaffold

```
/new
```

When the wizard asks, choose:
- **Category**: Backend API
- **Framework**: Laravel
- **Language**: PHP
- **Database**: MySQL
- **Auth**: Laravel Sanctum

Or use the direct approach:

```
Tell Conan to scaffold a new Laravel 11 project with:
- MySQL database
- Sanctum API authentication
- PHPUnit tests
- Docker Compose for local MySQL
- Vue.js frontend with Inertia.js
```

Conan scaffolds:
```bash
composer create-project laravel/laravel my-laravel-app
cd my-laravel-app
composer require laravel/sanctum
php artisan vendor:publish --provider="Laravel\Sanctum\SanctumServiceProvider"
npm install vue @inertiajs/vue3
```

**What you get:**
```
my-laravel-app/
├── app/
│   ├── Http/Controllers/
│   ├── Models/
│   └── Policies/
├── database/
│   ├── migrations/
│   ├── factories/
│   └── seeders/
├── resources/
│   └── js/           # Vue.js components
├── routes/
│   ├── api.php
│   └── web.php
├── tests/
│   ├── Feature/
│   └── Unit/
├── docker-compose.yml
├── .env.example
└── phpunit.xml
```

---

## Step 2: Design the Database

```
Tell Conan to design a database for an e-commerce platform with:
- Users with roles (customer, vendor, admin)
- Products with categories, images, and inventory
- Orders with line items and payment status
- Reviews and ratings
```

Conan generates Laravel migrations:

```
/migrate create add-ecommerce-tables
```

Creates:
- `2026_04_02_000001_create_categories_table.php`
- `2026_04_02_000002_create_products_table.php`
- `2026_04_02_000003_create_orders_table.php`
- `2026_04_02_000004_create_reviews_table.php`

Each with proper foreign keys, indexes, and `up()`/`down()` methods.

---

## Step 3: Build API Endpoints

```
Tell Conan to build RESTful API endpoints for products:
- GET /api/products (list with pagination, filtering by category)
- GET /api/products/{id} (show with reviews)
- POST /api/products (create — vendor only)
- PUT /api/products/{id} (update — owner only)
- DELETE /api/products/{id} (soft delete — owner or admin)
```

Conan creates:
- `ProductController.php` with all 5 methods
- `ProductRequest.php` for validation
- `ProductResource.php` for API response formatting
- `ProductPolicy.php` for authorization
- `Feature/ProductTest.php` with tests for each endpoint

---

## Step 4: Generate API Docs

```
/api gen routes/api.php
```

**L** generates an OpenAPI 3.1 spec from the Laravel routes:
- All endpoints documented with request/response schemas
- Auth requirements noted (Bearer token via Sanctum)
- Validation rules extracted from FormRequest classes

```
/api docs openapi.yaml
```

Generates human-readable API documentation as markdown.

---

## Step 5: Add Vue.js Frontend

```
/design Admin dashboard for e-commerce. Show: sales chart, recent orders, product inventory, low stock alerts. Should feel data-dense but clean.
```

**Rohan** designs:
> **Tone**: Industrial/utilitarian — dashboard-dense, monospace numbers, data-first
> **Typography**: JetBrains Mono (numbers/data) + Inter (labels)
> **Colors**: Dark slate background, green for revenue, amber for alerts, blue for actions

```
Tell Conan to build the Vue.js admin dashboard with:
- Sales overview chart (last 30 days)
- Recent orders table with status badges
- Low stock product alerts
- Quick stats: revenue today, orders today, active products
```

---

## Step 6: Test

```
# Run PHPUnit feature tests
/test unit

# Browser test the checkout flow
/test browser

# Check accessibility
/test a11y http://localhost:8000
```

**Killua** runs all test suites and reports results.

---

## Step 7: Review & Deploy

```
/pr-queue                    # Check open PRs
Tell Diablo to review PR #5    # Code review
/security                    # Security scan
/deploy                      # Deploy status
```

---

## Agent Collaboration on Laravel

| Task | Agent(s) | Command |
|------|---------|---------|
| Scaffold project | Conan | `/new` |
| Database design | Conan | natural language request |
| Generate migrations | Conan + L | `/migrate create` |
| API development | Conan | natural language request |
| API documentation | L | `/api gen` |
| Frontend design | Rohan | `/design` |
| Frontend build | Conan + Rohan | natural language request |
| Code review | Diablo | via `/pr-queue` |
| Testing | Killua | `/test unit`, `/test browser` |
| Security | Itachi | `/security` |
| Deployment | Shikamaru | `/deploy` |
