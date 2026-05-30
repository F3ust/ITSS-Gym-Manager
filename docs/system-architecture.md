# System Architecture

## Overview

The system is a React frontend with a Node.js/Express API and a PostgreSQL database hosted on Supabase.

## Components

- Frontend: Vite + React UI for gym operations.
- Backend: Express API with role checks and REST endpoints.
- Database: Supabase Postgres, accessed via `pg` Pool.

## Data Flow

1. Frontend calls REST endpoints under `/api`.
2. Backend validates input, enforces RBAC, and executes SQL queries.
3. Database returns results to the API, which returns JSON to the client.

## Infrastructure Notes

- Use Supabase pooler URLs (`DATABASE_POOL_URL`, port 6543) for runtime connections.
- Use direct URL (`DATABASE_URL`, port 5432) for one-off migrations.
- Pool configuration (`PGPOOL_MAX`, `PGPOOL_CONNECTION_TIMEOUT`, `PGPOOL_IDLE_TIMEOUT`) is set via environment variables with sensible defaults (max 10, timeout 10s, idle 30s).
- Apply schema via Supabase SQL editor, psql CLI, or a migration step.
- SSL is required for Supabase connections with certificate verification enabled.
