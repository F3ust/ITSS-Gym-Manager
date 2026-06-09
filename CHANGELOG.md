# Changelog

All notable changes to the ITSS Gym Management System project from the last three tasks are documented here.

---

## [1.0.0] - 2026-06-07

### Added
- **Root README.md**: Created a comprehensive guide explaining the project's tech stack (Express, React 19, TypeScript, Vitest, Jest, Postgres), detailed repository folder structure, step-by-step local running instructions (Docker Postgres setup inside WSL), and test suites execution.
- **Frontend LoginPage DOM Tests**: Added a new DOM test suite at `frontend/src/pages/login.test.tsx` using Vitest and React Testing Library to test inputs, mock successful authentication and redirection, and verify error rendering.
- **Root CHANGELOG.md**: This file, summarizing all major improvements and modifications.

### Changed
- **Local PostgreSQL DB Setup**: Updated `backend/.env` and `frontend/.env` to point to a local PostgreSQL container running inside WSL Docker (`postgresql://postgres:postgres@localhost:5432/gym_manager`) to resolve connection issues with the inactive remote Supabase database.
- **Secure Seeding Script**: Modified `backend/seed-users.js` to securely read configuration from environment variables via `dotenv` instead of hardcoding remote Supabase database URLs and passwords. Used it to seed standard roles/accounts.
- **Unified Rules**: Synced CLAUDE.md with project-wide guidelines and local workspace rules.

### Removed
- **Redundant temp-app Folder**: Deleted the unused directory `frontend/temp-app/` and its stale `package.json`.
- **Duplicate Migration Script**: Deleted `backend/migrate-pt-session-count.js` since `pt_session_count` column definition already exists inside the primary database schema.

---

## 🔍 Specification vs. Code Gap Analysis Summary
A detailed gap analysis was performed between the codebase and specifications (`01_Mẫu user story.xlsx` and `05_Mẫu tổng hợp đặc tả yêu cầu SRS.docx`). Major findings documented in the walkthrough include:
1. **Implemented in Code but NOT in Spec**:
   - Role and account active status updates (`roles-routes.ts`).
   - Audit log tracking table and query endpoint.
   - Separate CRUD for room types (`room-types-routes.ts`).
   - Dedicated notification manager/panel for members.
   - Expiry checker hourly background job.
2. **Specified in Spec but NOT in Code**:
   - OTP confirmation when changing phone number in member profile.
   - Constraints preventing members from modifying core info (name, DoB) directly (endpoints currently allow raw modifications).
   - Optional email field in the signup form.
   - PDF/Excel reporting export functions.
