# StockFlow — Inventory Management System

A full-stack inventory, purchasing, and sales management platform for small-to-medium retail, warehouse, and distribution businesses.

## Architecture

Monorepo with two applications sharing a PostgreSQL database:

```
Inventory/
├── backend/     NestJS + TypeScript + Prisma + PostgreSQL API
├── frontend/    React + TypeScript + Vite + Tailwind CSS
└── docker-compose.yml   PostgreSQL for local development
```

### Backend

- **Framework:** NestJS (modular architecture — one module per domain: products, inventory, sales, purchasing, etc.)
- **Database:** PostgreSQL via Prisma ORM. Schema in `backend/prisma/schema.prisma`.
- **Auth:** JWT access tokens (15 min, sent in `Authorization: Bearer`) + rotating refresh tokens (7 days, httpOnly cookie). Passwords hashed with bcrypt (cost factor 12).
- **Authorization:** Granular permission keys (e.g. `products.create`, `sales.refund`) grouped into roles. Enforced server-side by `PermissionsGuard` on every route — the frontend's route guards are UX only, never the source of truth.
- **Transactions:** Every operation that touches stock (sales, purchases, returns, transfers, adjustments) runs inside a single Prisma `$transaction`, so a partial failure rolls back the whole operation. All stock changes flow through one primitive, `InventoryService.applyMovement`, which also writes the `StockMovement` audit trail record.
- **Audit logging:** `AuditService` records every create/update/delete/status-change with before/after snapshots.

### Frontend

- **Framework:** React 19 + TypeScript + Vite
- **Styling:** Tailwind CSS with a small hand-rolled shadcn-style component kit (Radix UI primitives underneath — Dialog, DropdownMenu, Select, Tabs, Checkbox, Switch, Avatar).
- **Data fetching:** TanStack Query for server state (caching, invalidation, loading/error states).
- **Forms:** React Hook Form + Zod schema validation.
- **Charts:** Recharts (all dashboard numbers come from real database queries — nothing is hardcoded).
- **Auth:** Access token kept in memory; refresh token in an httpOnly cookie; automatic silent refresh on 401 via an axios interceptor.

## Getting started

### Prerequisites

- Node.js 20+
- Docker (for PostgreSQL) — or a PostgreSQL 16 instance you already have running

### 1. Start the database

```bash
docker compose up -d
```

This starts Postgres on **port 5433** (not 5432, to avoid colliding with any other local Postgres instance) with database `inventory_db`, user `inventory` / password `inventory_dev_password`. Adjust `docker-compose.yml` and both `.env` files together if you need a different port.

### 2. Backend

```bash
cd backend
cp .env.example .env      # then edit JWT secrets for anything beyond local dev
npm install
npm run prisma:migrate    # applies the schema
npm run prisma:seed       # creates roles, permissions, an admin user, and sample data
npm run start:dev         # http://localhost:4310/api
```

Swagger API docs are served at `http://localhost:4310/api/docs`.

### 3. Frontend

```bash
cd frontend
cp .env.example .env      # points VITE_API_URL at the backend
npm install
npm run dev                # http://localhost:5173
```

### Default development credentials

Seeded by `npm run prisma:seed` — **do not use these in production**:

| Role | Email | Password |
|---|---|---|
| Super Admin | admin@inventory.local | Admin@12345 |
| Sales Staff | sales@inventory.local | Sales@12345 |
| Purchasing Officer | purchasing@inventory.local | Purchase@12345 |

## Environment variables

See `backend/.env.example` and `frontend/.env.example`. Notable backend variables:

- `DATABASE_URL` — Postgres connection string
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` — generate real random values for anything beyond local dev (`node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`)
- `CORS_ORIGIN` — comma-separated list of allowed frontend origins

## Testing

```bash
cd backend
npm run test:e2e
```

The e2e suite (`backend/test/app.e2e-spec.ts`) runs 38 tests against a real Postgres database (whatever `DATABASE_URL` points at) through the full HTTP + auth + RBAC stack, including the exception filter. It exercises:

- Login failure/success, unauthenticated access rejection, role-based access denial
- Product creation, auto-SKU generation, duplicate SKU/barcode rejection, input validation
- Stock adjustment, negative-stock prevention, warehouse-to-warehouse transfer
- The full purchase order lifecycle (draft → sent → confirmed → partially received → received), including over-receipt rejection
- Direct (no-PO) purchases increasing stock
- Sales blocking an oversell and correctly deducting stock on success
- Sales returns (restocking) and purchase returns (destocking), including over-return rejection
- **Concurrency**: two simultaneous overlapping sales returns for the same line item — exactly one succeeds, the total returned never exceeds what was sold
- **Monetary precision**: a float-prone tax/quantity combination rounds to the exact cent with no drift
- **Granular permissions enforced server-side**: a user with `reports.view` but not `reports.export` can view a report on screen but is rejected (403) hitting the CSV export endpoint directly via the API, bypassing the UI entirely
- **Live revocation**: disabling a user, or changing their role's permissions, takes effect on their very next request with their existing (still cryptographically valid, unexpired) access token — no re-login, no waiting for expiry
- Clean, structured error responses (409/404/400) for Prisma-level failures like a unique-constraint race, never a raw 500 with a stack trace
- Audit log creation and dashboard aggregate correctness

Run it against a disposable/dev database — it creates real rows (with a per-run unique suffix to avoid collisions on repeated runs).

## Business rules worth knowing

- **Stock never goes negative** unless the `allow_negative_stock` setting (Administration → Settings) is turned on; this is enforced in `InventoryService.applyMovement`, the single choke point every stock-affecting operation passes through.
- **Concurrent requests can't jointly violate a limit.** Receiving a purchase order line item uses an atomic conditional SQL update (not a read-then-write check), and creating a sales/purchase return runs under `Serializable` transaction isolation with in-transaction re-validation — so two simultaneous requests against the same PO line or the same original sale/purchase can never together receive or return more than was ordered/sold. The loser gets a clean 409 asking it to retry, not silent data corruption.
- **Permissions and account status are checked live, not cached in the JWT.** The access token only proves identity; every request re-reads the user's current status and role's current permissions from the database. Disabling a user or editing a role's permissions takes effect on that user's very next request, even with their existing token still cryptographically valid.
- **Monetary math is rounded at every step**, not just at the final total — each line's subtotal, discount, and tax are rounded to the cent via `roundMoney()` before being summed, so float-prone inputs (e.g. a 12.5% tax rate) can't accumulate cent-level drift across line items.
- **Every stock change is logged** as a `StockMovement` with previous/new quantity, type (`PURCHASE`, `SALE`, `SALE_RETURN`, `PURCHASE_RETURN`, `ADJUSTMENT`, `TRANSFER_IN`/`OUT`, `DAMAGE`, `EXPIRY`, `INITIAL_STOCK`), and the user who made it.
- **Purchase orders** track received quantity per line item; a PO moves to `PARTIALLY_RECEIVED` or `RECEIVED` automatically based on line-item totals, and can also be received without ever having gone through a PO (a "direct purchase") for walk-in restocking.
- **Reports** (`/reports/*`) compute everything live from the database and support CSV export; Profit & Loss is `revenue − cost of goods sold − expenses` computed from actual sale-item cost prices and expense records, not an estimate.
- **RBAC** ships with 7 pre-defined roles (Super Admin, Administrator, Manager, Inventory Officer, Sales Staff, Purchasing Officer, Accountant) but every role's permission set is editable from Administration → Roles & Permissions except Super Admin, which always has full access. Note `reports.export` is a distinct permission from `reports.view` — viewing a report on screen and downloading its CSV are checked separately, both server-side.

## Known simplifications

Given the scope of this system, a few areas were deliberately kept simple rather than fully built out, and would be the next things to invest in for a real production deployment:

- **Email delivery:** there's no SMTP provider wired up. Password-reset tokens are returned directly in the API response in non-production mode (`NODE_ENV !== 'production'`) so the flow is testable; in production this must be replaced with an actual email send and the token should never leave the server.
- **Exports:** CSV export is implemented for all reports; Excel (`.xlsx`) and PDF export are not — CSV opens directly in Excel/Sheets, but native Excel formatting/PDF layout is future work.
- **Invoices:** the sale detail page is a clean, print-ready view (browser print → PDF), rather than a server-rendered PDF file.
- **Barcode scanning:** product barcode fields exist and are usable via any keyboard-emulating hardware scanner (they just type into a text field), but there's no camera-based/USB-HID-specific integration.
- **Product/warehouse pickers** in a few forms (e.g. the stock adjustment dialog) load up to 200 products at once rather than a server-side searchable combobox — fine for small-to-medium catalogs, but would need real search-as-you-type for a very large catalog.
- **Multi-item entry tables on mobile** (sale/purchase-order/quick-purchase line items) scroll horizontally on narrow screens rather than reflowing into stacked cards — usable, but not as smooth as a purpose-built mobile POS flow would be.
- **UI verification is code-level, not click-through.** Correctness was verified with 38 e2e tests exercising the real API + database, plus a full frontend/backend type-check and build; the actual rendered UI (layout, spacing, live responsive behavior) has not been visually verified in a browser in this environment. Click through the golden paths yourself before treating the UI as fully verified.
