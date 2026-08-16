# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Navarichcare is a Next.js 16 application for managing insurance services, claims, repair jobs, and customer registrations. The system includes a multi-role admin panel, agent portal, customer-facing pages, and integrates with MongoDB for data persistence and LINE for notifications.

## Development Commands

```bash
# Install dependencies
npm install

# Development server (http://localhost:3000)
npm run dev

# Production build
npm run build

# Start production server
npm start

# Lint
npm run lint

# Database: Initialize MongoDB collections and indexes
npm run push-schema

# Admin user management
npm run list-admins                                    # List all admin users
npm run create-admin <username> <password> [name] [email] [role]
# Example: npm run create-admin admin Pass1234 "Super Admin" admin@example.com super_admin

# Data migration for profit system
npm run migrate-profit                                 # Migrate existing data to new profit schema
```

## Architecture

### Tech Stack
- **Framework**: Next.js 16 (App Router)
- **Database**: MongoDB 8 via Mongoose
- **Authentication**: JWT tokens stored in HTTP-only cookies (`admin_token`)
- **UI**: Tailwind CSS 4 + shadcn/ui (New York style)
- **External APIs**: LINE Notify for notifications

### Directory Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── admin/             # Admin panel (protected by middleware)
│   │   ├── accounting/    # Payment/financial management
│   │   ├── agents/        # Agent management
│   │   ├── claims-history/
│   │   ├── contracts/     # Insurance contracts
│   │   ├── coverage-plans/
│   │   ├── footer/        # CMS for footer settings
│   │   ├── hero-banner/   # CMS for homepage banners
│   │   ├── logs/          # Admin activity logs
│   │   ├── packages/      # Insurance packages
│   │   ├── terms/         # Terms & conditions CMS
│   │   └── users/         # Admin user management
│   ├── agent/             # Agent portal
│   ├── api/               # API routes (38 endpoints)
│   │   ├── admin/         # Admin operations
│   │   ├── admin-users/   # User CRUD
│   │   ├── auth/          # Login/logout
│   │   ├── check-policy/  # Policy lookup
│   │   ├── coverage-plans/
│   │   ├── packages/
│   │   └── ...
│   ├── check-policy/      # Public policy check page
│   ├── portal/            # Customer portal
│   ├── register/          # Customer registration
│   ├── privacy/           # Privacy policy page
│   └── terms/             # Terms page
├── components/
│   ├── admin/             # Admin-specific components
│   ├── home/              # Homepage components
│   ├── layout/            # Layout components
│   └── ui/                # shadcn/ui components
├── lib/
│   ├── mongodb.ts         # Database connection (cached)
│   ├── admin-log.ts       # Activity logging utility
│   ├── line.ts            # LINE Notify integration
│   ├── line-messaging.ts
│   ├── line-notify.ts
│   └── utils.ts           # Tailwind merge utilities
├── models/                # Mongoose schemas (20 models)
│   ├── AdminLog.ts        # Admin activity tracking
│   ├── AdminUser.ts       # 5 roles: super_admin, admin, viewer, technician, staff
│   ├── Agent.ts
│   ├── Branch.ts
│   ├── Claim.ts
│   ├── CoveragePlan.ts
│   ├── FloatingChat.ts
│   ├── FooterSettings.ts
│   ├── HeroBanner.ts
│   ├── Insurance.ts
│   ├── LegalPage.ts
│   ├── Loan.ts
│   ├── Package.ts
│   ├── Payment.ts
│   ├── Registration.ts
│   ├── RepairCustomer.ts
│   ├── RepairJob.ts
│   ├── RepairPart.ts
│   ├── ServiceRequestPage.ts
│   └── TermsPage.ts
└── middleware.ts          # JWT authentication guard for /admin routes
```

### Authentication & Authorization

- **JWT-based authentication** using `jose` library
- Admin routes (`/admin/*`) are protected by [middleware.ts](src/middleware.ts)
- Token stored in HTTP-only cookie `admin_token`
- JWT secret from `process.env.JWT_SECRET`
- On token failure, redirects to `/admin/login`
- Use `recordAdminLog()` from [lib/admin-log.ts](src/lib/admin-log.ts) to track admin actions

**Role-Based Access Control (RBAC):**
- Permission system defined in [lib/permissions.ts](src/lib/permissions.ts)
- 15+ granular permissions (view_users, edit_packages, view_profit_report, etc.)
- Helper: `hasPermission(user, permission)` to check access
- API routes use `getCurrentAdmin(req)` from [lib/auth-middleware.ts](src/lib/auth-middleware.ts)
- UI components use `useCurrentAdmin()` hook to filter menus and features by role
- AdminSidebar automatically hides menu items based on user permissions

### Database

- MongoDB connection is **cached globally** via [lib/mongodb.ts](src/lib/mongodb.ts) to prevent connection exhaustion during hot reloads
- Always import and call `connectToDatabase()` in API routes before using models
- Run `npm run push-schema` after adding/modifying models to sync collections and indexes
- Connection string: `MONGODB_URI` in `.env.local`

### Admin Roles
Five role levels defined in AdminUser model:
- `super_admin` - Full system access (all permissions)
- `admin` - Standard admin privileges (most permissions except user management)
- `viewer` - Read-only access (view-only permissions)
- `technician` - Repair/service focused (repair-related permissions)
- `staff` - Limited access (basic view permissions)

Role-based UI/access control is implemented in admin components. See [lib/permissions.ts](src/lib/permissions.ts) for full permission matrix.

**Permission System**:
- Permission checking via `hasPermission(user, permission)` from [lib/permissions.ts](src/lib/permissions.ts)
- All admin API routes check permissions before allowing access
- Sidebar menu items are filtered based on user permissions
- Permission constants defined: `view_dashboard`, `view_registrations`, `edit_admin_users`, `view_profit_report`, etc.

**Creating Admin Users**:
```bash
# Create first admin (super_admin has all permissions)
npm run create-admin admin Pass1234 "ผู้ดูแลระบบ" admin@example.com super_admin

# Create viewer (read-only)
npm run create-admin viewer Pass1234 "ผู้ดู" viewer@example.com viewer

# Create technician (repair access only)
npm run create-admin tech Pass1234 "ช่างซ่อม" tech@example.com technician
```

### Path Aliases

TypeScript paths configured in `tsconfig.json`:
- `@/*` → `src/*`
- `@/components` → `src/components`
- `@/lib` → `src/lib`
- `@/models` → `src/models`

### UI Components

- Uses **shadcn/ui** (New York style) with Tailwind CSS 4
- Components installed via `npx shadcn@latest add <component>`
- Configuration in [components.json](components.json)
- Icon library: `lucide-react`

## Environment Variables

Required variables (`.env.local`):
```bash
MONGODB_URI=mongodb://navarich:<password>@localhost:27017/navarichcare?authSource=admin
JWT_SECRET=<your-secret-key>
LINE_NOTIFY_TOKEN=<optional-line-token>
```

MongoDB credentials (`.env` - used by docker-compose):
```bash
MONGO_ROOT_USER=navarich
MONGO_ROOT_PASSWORD=<secure-password>
```

## Docker / MongoDB Setup

- MongoDB runs in Docker container via [docker-compose.yml](docker-compose.yml)
- Container name: `navarichcare-mongo`
- Image: `mongo:8`
- Bound to `127.0.0.1:27017` (localhost only for security)
- Persistent volumes: `mongo_data`, `mongo_config`

Commands:
```bash
# Start MongoDB
docker compose up -d

# Check status
docker compose ps
docker compose logs mongodb

# Restart
docker compose restart mongodb

# Stop (data persists)
docker compose down

# Stop and delete all data
docker compose down -v
```

## Key Integration Points

### LINE Notifications
- Import `sendLineNotify()` from [lib/line.ts](src/lib/line.ts)
- Requires `LINE_NOTIFY_TOKEN` environment variable
- Used for alerting admins about registrations, claims, etc.

### Admin Activity Logging
- Import `recordAdminLog()` from [lib/admin-log.ts](src/lib/admin-log.ts)
- Automatically captures: admin ID, username, IP, user agent, action description
- Call after any data modification in admin API routes

### Profit Reporting System
- **Models with profit tracking:**
  - `Package` - includes `costPrice` field for package cost
  - `Registration` - includes fields: `salePrice`, `packageCost`, `agentCommission`, `otherExpenses`, `totalCost`, `netProfit`, `profitMargin`
  - Auto-calculated fields via pre-save hook: `totalCost`, `netProfit`, `profitMargin`

- **Profit calculation formula:**
  ```javascript
  totalCost = packageCost + agentCommission + otherExpenses
  netProfit = salePrice - totalCost
  profitMargin = (netProfit / salePrice) × 100
  ```

- **API Endpoints:**
  - `GET /api/admin/profit-report` - Main profit report with 3 grouping modes
    - `groupBy=package` - Group by insurance package
    - `groupBy=agent` - Group by agent
    - `groupBy=both` - Group by package + agent
  - Filters: date range, package, agent, branch, status
  - Returns: summary + grouped results with sales count, revenue, costs, profit

- **Status handling:**
  - `isCancelled` or `isRefunded` registrations are excluded from profit calculations
  - `status` field must be 'active' or 'completed' to be counted

- **Permission required:** `view_profit_report` (super_admin, admin only)

- **UI Location:** `/admin/profit-report`
  - Summary cards: total sales, revenue, profit, commission
  - Filters: group by, date range
  - Data table with drill-down capability
  - Color coding: profit (green), loss (red)

## Production Deployment

See [SETUP-VPS.md](SETUP-VPS.md) for Ubuntu 24.04 VPS deployment instructions covering:
- Docker installation
- Node.js 22 setup
- MongoDB password rotation
- pm2 process management
- Database backup/restore procedures

## Testing a Change

1. Start MongoDB: `docker compose up -d`
2. Ensure `.env.local` exists with valid `MONGODB_URI`
3. Run schema sync: `npm run push-schema`
4. Start dev server: `npm run dev`
5. Test admin features at `http://localhost:3000/admin/login`
