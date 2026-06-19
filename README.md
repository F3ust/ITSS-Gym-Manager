# ITSS Gym Management System

A Gym Management System designed to handle members, packages/subscriptions, check-ins, PT (Personal Trainer) assignments, feedback, reporting, and staff scheduling. The application enforces role-based access control (RBAC) across four roles: **Owner**, **Staff**, **PT**, and **Member**.

---

## 🛠️ Tech Stack

### Backend
- **Runtime:** Node.js (v20+) & TypeScript
- **Framework:** Express 5.x
- **Database:** PostgreSQL (raw SQL queries with `pg` connection pooling, **no ORM**)
- **Background Jobs:** Hourly subscription-expiry checking service
- **Authentication/RBAC:** Trusted role via `x-role` HTTP header with `requireRole` middleware checks (optimized for testing environment)
- **Test Suite:** Jest + `supertest`

### Frontend
- **Framework:** React 19 + Vite 8 + TypeScript (ESM)
- **Routing:** `react-router-dom` v7
- **API Client:** Thin native `fetch` wrappers
- **Styling:** Vanilla CSS (curated HSL palettes, cohesive dark modes)
- **State Management:** React Context (no external state management library)
- **Test Suite:** Vitest + React Testing Library + jsdom

---

## 📂 Codebase Directory Structure

```
ITSS-Gym-Manager/
├── backend/                  # Backend Express application
│   ├── src/
│   │   ├── app.ts            # Express app initialization
│   │   ├── server.ts         # Server bootstrapping
│   │   ├── db/               # PostgreSQL pool configuration & schema.sql
│   │   ├── middlewares/      # Auth validation & centralized error-handler
│   │   ├── routes/           # Endpoint controllers per resource
│   │   ├── services/         # ExpiryChecker background scheduler
│   │   └── types/ / utils/
│   ├── tests/                # Jest integration and RBAC test suites
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                 # Frontend React client
│   ├── src/
│   │   ├── api/              # Fetch API client logic
│   │   ├── components/       # Reusable components & guards
│   │   ├── contexts/         # Authentication & app state contexts
│   │   ├── layouts/          # Dashboard layouts
│   │   ├── pages/            # View pages grouped by user role
│   │   ├── test/             # Vitest test setup
│   │   ├── App.tsx           # React Router router setup
│   │   ├── main.tsx          # Application entrypoint
│   │   └── index.css         # Styling system
│   ├── package.json
│   └── vite.config.ts
│
├── docs/                     # Specifications & architecture documentation
│   ├── api-contracts.md      # API contracts & error format rules
│   ├── domain-data-model.md  # Database schema tables & relation definitions
│   └── system-architecture.md# Overall system design overview
│
└── README.md                 # This file
```

---

## 🚀 Running Locally

Follow these instructions to run the application locally inside your environment (e.g. using WSL & Docker).

### 1. Database Setup (Local Docker PostgreSQL)

To run tests and the application locally without relying on remote servers, spin up a PostgreSQL database container:

```bash
# Start a PostgreSQL 15 database container
docker run --name itss-gym-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=gym_manager -p 5432:5432 -d postgres:15

# Initialize database schema
docker exec -i itss-gym-db psql -U postgres -d gym_manager < backend/src/db/schema.sql

# Add initial roles to the roles table
docker exec itss-gym-db psql -U postgres -d gym_manager -c "INSERT INTO roles (name) VALUES ('Owner'), ('Staff'), ('PT'), ('Member') ON CONFLICT DO NOTHING;"
```

### 2. Environment Configurations

Make sure the following variables are defined in your `.env` files.

**Backend (`backend/.env`)**
```env
DATABASE_POOL_URL=postgresql://postgres:postgres@localhost:5432/gym_manager
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/gym_manager
PGSSLMODE=disable
DATABASE_SSL=false
DATABASE_SSL_REJECT_UNAUTHORIZED=false
PGPOOL_MAX=5
PORT=4000
```

**Frontend (`frontend/.env`)**
```env
VITE_API_URL=http://localhost:4000/api
```

### 3. Run Seeding Script

Populate the database with default accounts for development and testing:

```bash
cd backend
node seed-users.js
```

This seeds the following default accounts (format: `Username (Phone)` / `Password`):
- **Owner:** `1111111111` / `owner67890`
- **Staff:** `2222222222` / `staff67890`
- **PT:** `3333333333` / `pt67890123`
- **Member:** `4444444444` / `member5678`

### 4. Running the Backend Server
```bash
cd backend
npm install
npm run dev     # API listening on port 4000
```

### 5. Running the Frontend Server
```bash
cd frontend
npm install
npm run dev     # Frontend client running via Vite dev server
```

---

## 🧪 Testing

### Backend Unit/Integration Testing
Jest tests cover verification, endpoints, logic constraints, and role-based access controls.
```bash
cd backend
npm test
```

### Frontend Unit/DOM Testing
Vitest and React Testing Library test the main routes, components, and authentication redirects.
```bash
cd frontend
npm test
```
