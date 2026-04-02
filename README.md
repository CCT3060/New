# Recipe Management Module — Central Kitchen Management System

A production-ready Recipe Management module for a B2B food-service Central Kitchen. Built with React 18 + Node.js/Express + PostgreSQL + Prisma.

---

## Features

- Full recipe lifecycle: **Draft → Under Review → Approved → Active → Inactive → Archived**
- Ingredient management with **auto net qty** calculation (`grossQty × (1 − wastage%)`)
- **Live costing engine**: ingredient line costs + configurable overheads → cost per pax
- **Pax scaling**: scale any recipe to any target pax, export as CSV requisition
- Version history with full clone on new version creation
- Role-based access control (ADMIN, OPS_MANAGER, APPROVER, KITCHEN_MANAGER, STORE_MANAGER)
- JWT authentication, Joi + Zod validation, audit logging

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, TanStack Query v5, React Hook Form + Zod, React Router v6 |
| Backend | Node.js, Express 4, Prisma 5, PostgreSQL |
| Validation | Joi (backend), Zod (frontend) |
| Auth | JWT + bcryptjs |
| Tests | Jest + Supertest (backend), Vitest + RTL (frontend) |

---

## Prerequisites

- Node.js ≥ 18
- PostgreSQL ≥ 14
- npm ≥ 9

---

## Setup

### 1. Clone & install

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Configure environment

```bash
# Backend
cd backend
cp .env.example .env
# Edit .env — fill in DATABASE_URL and JWT_SECRET

# Frontend
cd ../frontend
cp .env.example .env
```

### 3. Set up database

```bash
cd backend

# Run migrations (creates all tables)
npx prisma migrate dev --name init

# Seed initial data (users, warehouse, inventory items, 3 sample recipes)
npx prisma db seed
```

### 4. Start development servers

```bash
# Terminal 1 — Backend (port 5000)
cd backend
npm run dev

# Terminal 2 — Frontend (port 3000)
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Demo Credentials

All passwords are `Password@123`.

| Username | Role | Permissions |
|---|---|---|
| `admin` | ADMIN | Full access |
| `ops_manager` | OPS_MANAGER | Create/edit recipes, submit for review, create new versions |
| `chef_approver` | APPROVER | Approve/reject recipes under review |
| `kitchen_manager` | KITCHEN_MANAGER | View recipes read-only |
| `store_manager` | STORE_MANAGER | View ingredients / inventory |

---

## Sample Recipes (from seed)

| Recipe | Code | Status | Pax |
|---|---|---|---|
| Veg Pulao | `REC-VEG-PULAO-001` | ACTIVE | 100 |
| Kanda Batata Poha | `REC-POH-BRKFST-001` | ACTIVE | 100 |
| Tomato Rice | `REC-TOM-RICE-001` | DRAFT | 100 |

---

## API Overview

Base URL: `http://localhost:5000/api`

### Auth
| Method | Path | Description |
|---|---|---|
| POST | `/auth/login` | Login, returns JWT |
| GET | `/auth/profile` | Current user profile |
| POST | `/auth/change-password` | Change password |

### Recipes
| Method | Path | Description |
|---|---|---|
| GET | `/recipes` | List recipes (paginated, filtered) |
| POST | `/recipes` | Create new recipe |
| GET | `/recipes/:id` | Get full recipe detail |
| PUT | `/recipes/:id` | Update recipe |
| DELETE | `/recipes/:id` | Soft-delete (ADMIN, DRAFT only) |
| POST | `/recipes/:id/submit-review` | Submit for approval |
| POST | `/recipes/:id/approve` | Approve recipe |
| POST | `/recipes/:id/reject` | Reject with note |
| PATCH | `/recipes/:id/status` | Change status directly (ADMIN) |
| POST | `/recipes/:id/ingredients` | Add ingredient |
| PUT | `/recipes/:id/ingredients/:ingId` | Update ingredient |
| DELETE | `/recipes/:id/ingredients/:ingId` | Remove ingredient |
| POST | `/recipes/:id/steps` | Add step |
| PUT | `/recipes/:id/steps/:stepId` | Update step |
| DELETE | `/recipes/:id/steps/:stepId` | Remove step |
| GET | `/recipes/:id/costing` | Get cost breakdown |
| POST | `/recipes/:id/costing/recalculate` | Recalculate costs |
| POST | `/recipes/:id/new-version` | Create new version |
| GET | `/recipes/:id/versions` | Version history |
| POST | `/recipes/:id/scale` | Scale to target pax |
| GET | `/recipes/lookup` | Active/Approved recipes for menu planning |

---

## Running Tests

```bash
# Backend unit + integration tests
cd backend
npm test

# Backend unit tests only (no DB required)
npm run test:unit

# Frontend component tests
cd frontend
npm test

# Coverage
npm run test:coverage
```

---

## Project Structure

```
recipe-management/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma      # Database schema (10 models)
│   │   └── seed.js            # Initial data
│   ├── src/
│   │   ├── app.js             # Express app config
│   │   ├── db/prisma.js       # Prisma client
│   │   ├── middleware/        # auth, role, error handlers
│   │   ├── modules/
│   │   │   ├── auth/          # Login, register, profile
│   │   │   ├── audit/         # Audit log service + routes
│   │   │   ├── inventory/     # Inventory items + warehouses
│   │   │   └── recipe/        # Core recipe module (5 files)
│   │   └── utils/             # Logger, response helpers, pagination
│   └── tests/                 # Unit + integration tests
└── frontend/
    └── src/
        ├── modules/recipe/
        │   ├── components/    # 7 React components
        │   ├── hooks/         # TanStack Query hooks + mutations
        │   ├── pages/         # 5 pages
        │   └── services/      # Axios API layer
        ├── contexts/          # AuthContext
        ├── components/        # Layout, sidebar
        └── tests/             # Vitest component tests
```

---

## Business Logic

### Net Qty Formula
```
netQty = grossQty - (grossQty × wastagePercent / 100)
```

### Line Cost Formula
```
lineCost = netQty × unitCostSnapshot
```

### Total Recipe Cost
```
totalCost = ingredientCost + fuelCost + laborCost + packagingCost + otherCost
costPerPax = totalCost / standardPax
```

### Scaling
```
scaleFactor = targetPax / standardPax
scaledGrossQty = originalGrossQty × scaleFactor
scaledNetQty = scaledGrossQty × (1 − wastagePercent / 100)
```
