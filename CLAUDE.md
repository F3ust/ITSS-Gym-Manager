# CLAUDE.md — ITSS Gym Manager

Guidance for AI coding agents (Claude Code, Cursor, Copilot, etc.) working in this repo.
Human-facing project docs live in `./docs`. Claude-specific orchestration rules live in `./CLAUDE.md` — read it too.

> **What this app is:** a Gym Management System covering members, packages/subscriptions,
> payments, check-ins, PT workflows, equipment/rooms, feedback, reports, and staff admin.
> Four roles: **Owner, Staff, PT, Member** (RBAC enforced server-side).

---

## Tech Stack

### Backend — `backend/`
- **Runtime:** Node.js, **TypeScript** (CommonJS), Express **5**.
- **DB access:** `pg` (`Pool`) — raw SQL, **no ORM**. Helpers in `src/db/`: `pool.ts`, `query.ts`, `schema.sql`.
- **Database:** PostgreSQL on **Supabase** (SSL required). ~22 tables (see `docs/domain-data-model.md`).
- **Auth/RBAC:** role passed via **`x-role` HTTP header**; `requireRole([...])` guard in `src/middlewares/auth-middleware.ts`. No JWT verification yet — role is trusted from the header (test-app simplification).
- **Errors:** central `error-handler.ts`. All errors return `{ code: "ERR_*", message, details? }`.
- **Background jobs:** `src/services/expiry-checker.ts` (hourly subscription-expiry notifications).
- **Tooling:** `ts-node` (dev), `tsc` (build), ESLint, Prettier.
- **Tests:** **Jest** + `supertest` in `backend/tests/` (validation + RBAC + endpoint tests).

### Frontend — `frontend/` (package name `temp-app`)
- **Framework:** **React 19** + **Vite 8** + **TypeScript** (ESM).
- **Routing:** `react-router-dom` v7. Pages grouped by role: `src/pages/{owner,staff,pt,member,shared}/`.
- **API layer:** `src/api/` — thin `fetch` wrappers (`client.ts`, `auth.ts`, `members.ts`). Backend base URL is `http://localhost:4000/api`; role is read from `localStorage.auth` and sent as `x-role`.
- **State:** React Context (`src/contexts/auth-context.tsx`), hooks in `src/hooks/`. No Redux.
- **Utils/libs:** `axios`, `date-fns`.
- **Tests:** **Vitest** + Testing Library + jsdom (`src/test/setup.ts`).

### Conventions (apply everywhere)
- **Files:** kebab-case, long & descriptive (self-documenting for grep/LLM tools).
- **Modularize at ~200 LOC** — split by concern; check for existing modules before creating new ones. (Skip for MD/config/SQL/scripts.)
- **Dates** `dd/MM/yyyy`; **currency** VN format `1.200.000 VNĐ`.
- **Commits:** Conventional Commits. **Do NOT** use `chore`/`docs` types for changes under `.claude/`.

---

## Repository Layout

```
backend/src/
  app.ts server.ts        # express app + bootstrap
  routes/                 # one file per resource (auth, members, packages, subscriptions, payments,
                          #   check-ins, equipment, rooms, room-types, pt, staff, roles, feedback,
                          #   reports, notifications, gym-profile) + index.ts
  middlewares/            # auth-middleware (requireRole), error-handler
  services/               # expiry-checker
  db/                     # pool, query, schema.sql
  utils/  types/
  tests/ (../tests)       # jest + supertest
frontend/src/
  pages/{owner,staff,pt,member,shared}/   # role-scoped screens
  api/ contexts/ hooks/ layouts/ components/ utils/
docs/                     # api-contracts, domain-data-model, system-architecture,
                          #   deployment-guide, requirements-summary, ui-navigation-map, journals/
plans/                    # design/implementation plans per feature
.claude/skills/gitnexus/  # project-local code-intelligence skills (see below)
```

## Running Locally

```bash
# Backend (needs backend/.env from .env.example with Supabase creds)
cd backend && npm install && npm run dev      # http://localhost:4000 ; GET /health -> {status:"ok"}
npm test                                       # jest
npm run lint                                    # eslint, --max-warnings=0

# Frontend
cd frontend && npm install && npm run dev      # vite dev server
npm test                                        # vitest run
npm run build                                    # tsc -b && vite build
```
There is **no root package.json** — run backend and frontend separately.
Apply DB schema via Supabase SQL editor or `psql "$DATABASE_URL" -f backend/src/db/schema.sql` (see `docs/deployment-guide.md`).

---

## Must-Read Skills

Activate the skill that matches the task **before** doing the work. Project-local skills win over global ones.

### Project-local (mandatory) — `.claude/skills/gitnexus/`
GitNexus indexes this repo's call graph. Use it instead of blind grep, and **always run impact analysis before editing a symbol** (see GitNexus section below). Skill files:

| When | Read |
|------|------|
| Understand architecture / "how does X work?" | `gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "what breaks if I change X?" | `gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace a bug / "why is X failing?" | `gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `gitnexus/gitnexus-refactoring/SKILL.md` |
| Tool/resource/schema reference | `gitnexus/gitnexus-guide/SKILL.md` |
| Index / status / clean / wiki CLI | `gitnexus/gitnexus-cli/SKILL.md` |

### Global skills mapped to this stack
| Task | Skill |
|------|-------|
| Any feature/architecture/behavior work — **before coding** | `brainstorming` (idea → validated design, then implement) |
| Planning a multi-step change | `planning-with-files` / `writing-plans` |
| Backend (Express + TS + pg) | `backend-dev-guidelines`, `nodejs-backend-patterns`, `typescript-pro` |
| REST endpoint design / contracts | `api-design-principles` |
| SQL / Postgres (raw queries, Supabase) | `postgres-best-practices`, `sql-pro` |
| Frontend (React 19 + Vite + TS) | `frontend-dev-guidelines`, `react-best-practices`, `react-patterns` |
| Tests | `javascript-testing-patterns` (Jest backend / Vitest frontend) |
| Security / RBAC / input validation | `api-security-best-practices`, `security-review` |
| Code review before pushing | `code-reviewer`, `code-review-checklist` |
| Commit messages | `commit` |

> Per `CLAUDE.md`: **do not modify skills in `~/.claude/skills`**; if a skill needs changing, copy it into this working directory first.

---

## Authoritative References (read before changing related code)
- **API surface & error model:** `docs/api-contracts.md`
- **Entities, fields, relationships:** `docs/domain-data-model.md`
- **Architecture & infra (Supabase pooler, SSL, env vars):** `docs/system-architecture.md`, `docs/deployment-guide.md`
- **Business rules & NFRs (age ≥16, unique phone, soft-delete packages, session decrement, feedback flow, audit logging):** `docs/requirements-summary.md`
- **Recent change history & rationale:** `docs/journals/`
- **UI/navigation:** `docs/ui-navigation-map.md`

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **ITSS-Gym-Manager** (1041 symbols, 1718 relationships, 69 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> If any GitNexus tool warns the index is stale, run `npx gitnexus analyze` in terminal first.

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.

## Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `gitnexus_rename` which understands the call graph.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/ITSS-Gym-Manager/context` | Codebase overview, check index freshness |
| `gitnexus://repo/ITSS-Gym-Manager/clusters` | All functional areas |
| `gitnexus://repo/ITSS-Gym-Manager/processes` | All execution flows |
| `gitnexus://repo/ITSS-Gym-Manager/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
