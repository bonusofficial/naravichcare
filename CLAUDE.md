# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NavarichCare is a Next.js 16 (App Router) + MongoDB app for selling device-protection packages ("แพ็กคุ้มครอง"): customer registration, policy lookup, claims, repair jobs, package buybacks, agent commissions, and a CMS for the public site. It has a role-based admin panel (`/admin`), an agent portal (`/agent`), a customer portal (`/portal`), and a machine API used by the separate Web POS. UI text, log descriptions, and most docs are in Thai.

## Commands

```bash
docker compose up -d            # MongoDB 8 (container navarichcare-mongo, 127.0.0.1:27017)
npm run dev                     # http://localhost:3000 (admin at /admin/login)
npm run build
npm run lint                    # ESLint 9 flat config (next core-web-vitals + typescript)
npm test                        # vitest run (all suites)
npm run test:watch
npm run test:buyback            # also test:hero-banner, test:coverage-plan

# Single file / single test
npx vitest run src/lib/repair/status.test.ts
npx vitest run tests/integration/repair-integration.db.test.ts -t "Idempotency-Key"
```

Database / admin scripts (run with `tsx`, read `.env.local` then `.env`):

```bash
npm run push-schema             # create collections + syncIndexes for every model
npm run seed-roles              # upsert the 5 system roles into the Role collection
npm run create-admin <username> <password> [name] [email] [role]
npm run set-admin-role <username> <role>
npm run list-admins
ADMIN_USERNAME=<u> ADMIN_PASSWORD=<p> npx tsx reset-admin-password.ts
npm run migrate-profit
npm run migrate:coverage                    # dry run; add -- --apply after a backup
npm run cleanup:buyback-images              # daily cron job in production (deletes files)
```

### Tests

- Vitest, Node environment, `@/` alias; files run serially because DB suites share one database.
- Unit tests sit next to the code (`src/lib/**/*.test.ts`). DB-backed tests are `tests/integration/*.db.test.ts` and call route handlers directly with `NextRequest`s built by `tests/helpers/db.ts` (`createAdmin`, `adminRequest`, `apiRequest`, `insertApiKey`, `posPayload`).
- DB tests need `MONGODB_URI_TEST` in `.env.test.local` (the app's `.env.local` is deliberately not loaded). `tests/helpers/db-guard.ts` aborts the run unless the database name ends in `_test`, is on localhost, and differs from `MONGODB_URI`. Without it, DB suites fail loudly; set `SKIP_DB_TESTS=true` to skip them.
- `openapi-contract.db.test.ts` validates real integration responses against `docs/openapi/repair-integration-v1.yaml`; update the spec when changing the integration API.

## Architecture

### Three separate auth systems

1. **Admin session** — JWT (`jose`, HS256) in HTTP-only cookie `admin_token`, issued by `/api/auth/login`. `JWT_SECRET` must be ≥ 32 chars; `src/lib/jwt.ts` throws at import if unset and middleware returns 500 if it is short.
2. **Integration API keys** — `Authorization: Bearer nvc_live_…` for `/api/integration/v1/*`. Keys are stored hashed (`IntegrationApiKey`), scoped (`repair:read|write|cancel|handover`), and managed only by `super_admin` at `/admin/settings/integration-keys`.
3. **Agent portal** — no session; `/api/agent/login` looks up an `agentCode` and returns portal-safe fields only.

### Admin authorization layers

- [src/middleware.ts](src/middleware.ts) matches only `/admin/*`, `/api/admin/*`, `/api/admin-users*`, and `/api/auth/change-password`. It only verifies the JWT, plus enforces `super_admin` for user management and integration keys. It does **not** check permissions.
- Routes outside those prefixes (`/api/packages`, `/api/coverage-plans`, `/api/footer`, `/api/hero-banner`, `/api/legal`, …) have public GETs for the website; their write handlers must guard themselves.
- Every handler must check permissions itself. The standard pattern ([src/lib/check-permission.ts](src/lib/check-permission.ts)):
  ```ts
  const { authorized, user, error } = await checkPermission(req, "edit_packages");
  if (!authorized) return error;
  ```
  It loads the user, rejects deactivated accounts, and resolves permissions from the `Role` collection (falling back to the built-in matrix if the role isn't seeded), so custom roles work.
- `requireAdmin(allowedRoles?)` in [src/lib/admin-auth.ts](src/lib/admin-auth.ts) is a role-list check that also returns the admin's branch; buybacks, branches, and hero-banner admin routes use it. It throws `AdminAuthError`; convert with `authErrorResponse()`.
- `requirePermission`/`withPermission` in `src/lib/auth-middleware.ts` use only the static matrix and ignore custom roles; prefer `checkPermission`.

### Roles and permissions

- [src/lib/permissions.ts](src/lib/permissions.ts) `PERMISSION_CATALOG` is the single source of truth: it derives the `Permission` type, `ROLE_PERMISSIONS` for the 5 system roles (`super_admin`, `admin`, `viewer`, `technician`, `staff`), the role-editor picker, and `seed-roles.ts`. Add permissions only there, and keep that file free of `@/models` imports (`seed-roles.ts` imports it under plain `tsx`).
- `AdminUser.role` is a free string; custom roles live in the `Role` collection (`/admin/roles`). After changing system-role permissions, run `npm run seed-roles`.
- Client side: `useCurrentAdmin()` fetches `/api/auth/me`, which returns the user **and** resolved permissions. `AdminSidebar` nav items declare `permission` (or an exact `role`) and are filtered by that list.

### Data layer

- Import the default export of [src/lib/mongodb.ts](src/lib/mongodb.ts) (named `connectToDatabase` or `dbConnect`) and await it before using models; the connection is cached on `global`.
- Models use the `mongoose.models.X || mongoose.model(...)` pattern. `push-schema.ts` imports each model explicitly, so **add new models to that import list** or their collections and indexes won't be created.
- Aggregation `$match` gets no schema casting; cast ObjectId filters by hand (see `src/lib/profit-report.ts`).
- Sequential document numbers come from the `Counter` model (`src/lib/repair/sequence.ts`).

### Repair domain and the Web POS integration

- Repair business rules live in [src/lib/repair/](src/lib/repair/): `status.ts` (status list, `STATUS_TRANSITIONS`, mapping to the POS's 4 statuses), `costs.ts`, validators, and `service.ts`, which both `/api/admin/repair/*` and `/api/integration/v1/repair-jobs/*` call. Failures throw `RepairWorkflowError` with a code.
- Integration routes are built with `integrationRoute({ scope, body }, handler)` from `src/lib/integration/http.ts`. It handles API-key auth, scope checks, per-IP and per-key rate limits, the 64 KB body cap, request IDs, and the error envelope. Wrap service calls in `withRepairErrors()` and validation results in `unwrap()` (`src/lib/integration/repair-route.ts`).
- The rate limiter is in process memory, so limits multiply with instance count.
- Contract and ops docs: `docs/REPAIR_INTEGRATION_API.md`, `docs/REPAIR_INTEGRATION_RUNBOOK.md`, `docs/openapi/repair-integration-v1.yaml`.

### Audit logging

Call `recordAdminLog({ req, action, description, targetId, targetType, details })` from [src/lib/admin-log.ts](src/lib/admin-log.ts) after admin data changes. It reads the actor from the `admin_token` cookie. Pass `actor` when there is no cookie session (integration clients, system jobs). `details` is redacted (API keys masked) before saving.

### LINE notifications

Everything goes through `sendLinePortal()` in `src/lib/line-portal.ts`, which POSTs to `LINE_PORTAL_NOTIFY_URL` with `LINE_PORTAL_API_TOKEN` (an external portal, not LINE Notify directly). `sendLineNotify(text)` (`lib/line.ts`, re-exported by `lib/line-notify.ts`) and `sendLineFlexMessage` (`lib/line-messaging.ts`) are wrappers. When unconfigured, it logs a warning and returns `{ success: false }` without throwing.

### Private file storage

Uploaded files are stored on disk outside `public/` and served through API routes:
- Buyback photos, buyback receipt PDFs, and agent withdrawal files: `BUYBACK_STORAGE_DIR`, default `.data/buybacks`.
- Hero banner images: `HERO_BANNER_STORAGE_DIR`, default `.data/hero-banner`. These are type-sniffed, resized, and EXIF-stripped with `sharp`.
- PDFs (certificates, buyback receipts) are generated with `pdf-lib` + `@pdf-lib/fontkit` using a Thai font.

Buyback rules: only `admin`/`super_admin`, the account must be linked to a branch, and the creator cannot approve their own buyback. Photos are deleted 35 days after approval or rejection; PDFs are kept.

### Profit reporting

- `Registration` pre-save computes `totalCost = packageCost + agentCommission + otherExpenses`, `netProfit = salePrice - totalCost`, and `profitMargin`.
- `src/lib/profit-report.ts` filters on `status ∈ ["approved", "cancelled", "refunded"]` and `approvedAt` (an end date is inclusive of the whole day). Cancelled or refunded sales (`isCancelled`/`isRefunded`) count as zero revenue and zero commission, but their package cost and other expenses still count, as a loss.
- Requires `view_profit_report`. UI at `/admin/profit-report`, API `GET /api/admin/profit-report?groupBy=package|agent|both`.

### UI

Tailwind CSS 4 + shadcn/ui (New York style, `components.json`); only `components/ui/button.tsx` is installed, and most admin pages are self-contained client components (`"use client"`) that fetch the API routes. Icons come from `lucide-react`.

## Environment

`.env.local` (see `.env.example`):
- **Required:** `MONGODB_URI`, `JWT_SECRET` (≥ 32 chars).
- **Optional:**
  - `LINE_PORTAL_NOTIFY_URL`, `LINE_PORTAL_API_TOKEN`
  - `BUYBACK_STORAGE_DIR`, `HERO_BANNER_STORAGE_DIR`
  - `INTEGRATION_API_RATE_LIMIT`, `INTEGRATION_API_IP_RATE_LIMIT`, `INTEGRATION_API_RATE_WINDOW_SECONDS`, `INTEGRATION_API_ALLOW_HTTP` (keep false in prod), `INTEGRATION_POS_ASSET_BASE_URL`, `INTEGRATION_API_LOG`

`.env` (docker compose): `MONGO_ROOT_USER`, `MONGO_ROOT_PASSWORD`. `.env.test.local`: `MONGODB_URI_TEST`.

## Deployment

[SETUP-VPS.md](SETUP-VPS.md) covers the Ubuntu VPS setup: Docker MongoDB pinned to `mongo:8.2.10` so backup and restore never cross release lines, pm2, the buyback-cleanup cron, and the Cloudflare Tunnel. `npm start` binds to `127.0.0.1` only, so put a reverse proxy or tunnel in front.
