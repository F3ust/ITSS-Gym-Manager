# Deployment Guide

## Supabase Project Setup

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in or create an account.
2. Click **New project**.
3. Enter your project name (e.g., `gym-management`).
4. Set a secure database password and save it in your password manager.
5. Choose a region closest to your users.
6. Click **Create new project** (takes ~2 minutes).

### 2. Get Connection Strings

1. In your Supabase dashboard, go to **Project Settings > Database**.
2. Under **Connection string**, find the **URI** section.
3. Copy the **Pooler** connection string (transaction mode, port `6543`) for `DATABASE_POOL_URL`.
4. Copy the **Direct** connection string (port `5432`) for `DATABASE_URL` (migrations only).
5. Set `PGSSLMODE=require` and `DATABASE_SSL=true`.

### 3. Enable IP Restrictions (Optional)

Go to **Project Settings > Database** and under **IP Restrictions**, add the IP addresses of your deployment hosts to restrict access.

## Backend Environment Variables

Create a `backend/.env` file from `.env.example`:

```env
# Use the pooler URL (transaction mode, port 6543) for runtime
DATABASE_POOL_URL=postgres://postgres.xxxx:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres

# Use the direct URL (port 5432) for running migrations
DATABASE_URL=postgres://postgres.xxxx:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres

# SSL is required for Supabase
PGSSLMODE=require
DATABASE_SSL=true
DATABASE_SSL_REJECT_UNAUTHORIZED=true
```

Set these in your deployment environment (Render, Railway, Fly.io, etc.) as secrets:

| Variable | Purpose |
|----------|---------|
| `DATABASE_POOL_URL` | Runtime connections via Supabase pooler |
| `DATABASE_URL` | Direct connection for one-off migrations |
| `PGSSLMODE` | Set to `require` |
| `DATABASE_SSL` | Set to `true` |
| `DATABASE_SSL_REJECT_UNAUTHORIZED` | Set to `true` (or `false` for self-signed) |
| `PGPOOL_MAX` | Max pool size (default `10`, Supabase free tier limit is `15`) |
| `PGPOOL_CONNECTION_TIMEOUT` | Connection acquire timeout in ms (default `10000`) |
| `PGPOOL_IDLE_TIMEOUT` | Idle client timeout in ms (default `30000`) |

> If your connection string already includes `sslmode=require`, the env var check will honor it.
> To disable SSL locally, set `PGSSLMODE=disable` and `DATABASE_SSL=false`.

## Schema Migration

Apply the schema from `backend/src/db/schema.sql` to Supabase:

### Option A: Supabase SQL Editor (Recommended for initial setup)

1. In your Supabase dashboard, go to **SQL Editor**.
2. Click **New query**.
3. Open `backend/src/db/schema.sql` and paste the full content.
4. Click **Run** to execute the entire script.
5. Go to **Table Editor** to verify all tables were created (expect ~20 tables).

### Option B: psql CLI

```bash
psql "$DATABASE_URL" -f backend/src/db/schema.sql
```

### Verify Tables

Check that all expected tables exist by running this query in the SQL Editor:

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

You should see: `check_ins`, `equipment`, `feedback`, `feedback_responses`, `invoices`, `maintenance_logs`, `members`, `packages`, `payments`, `pt_assignments`, `pt_profiles`, `pt_schedules`, `roles`, `rooms`, `room_types`, `staff`, `staff_performance_metrics`, `staff_schedules`, `subscriptions`, `user_roles`, `users`, `workout_logs`.

## Validation

Start the backend locally with Supabase env vars:

```bash
cd backend
cp .env.example .env   # then edit .env with your Supabase credentials
npm run dev
```

Then verify:

- `GET /health` returns `{ "status": "ok" }`
- `GET /api/members?query=` returns `200` (empty list is OK)

Once deployed, repeat the health check against the deployed URL.

## Production Checklist

- [ ] Supabase project created with a strong password
- [ ] `DATABASE_POOL_URL` set in deployment secrets (pooler, transaction mode)
- [ ] `PGSSLMODE=require` and `DATABASE_SSL=true` configured
- [ ] Schema applied and all tables verified in Supabase Table Editor
- [ ] `GET /health` returns 200 from both local and deployed environments
- [ ] `GET /api/members` returns 200 from both environments
- [ ] IP restrictions added if deployment IPs are static
