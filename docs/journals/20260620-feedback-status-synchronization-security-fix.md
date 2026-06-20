# Journal: Feedback status synchronization, security enforcement, and Owner Audit Logs fix

**Date:** 2026-06-20
**Author:** Antigravity

## Context & Issues

1. **Feedback Status & Notification Desync**: When staff processed feedback items via `PATCH /api/feedback/:id/status`, the feedback's status changed but the notification's status in `feedback_notifications` remained `'new'`. This caused reminders to leak and remain pending. Additionally, the route lacked role authorization checks.
2. **Owner Settings Audit Logs Crash**: When the Owner navigated to Settings -> Audit Logs, the page went completely blank. This occurred because React tried to render `l.details` directly. Since `details` is a `JSONB` column in PostgreSQL, the database driver parsed it into a JavaScript object, causing a rendering crash in React.

## Resolutions

### Feedback Status Fix
- **Security Enrichment**: Added `requireRole(['Owner', 'Staff'])` to `PATCH /api/feedback/:id/status`.
- **Database Transactions**: Wrapped the status updates in transactions for both `PATCH /:id/status` and `POST /:id/response` routes to update both `feedback` and `feedback_notifications` tables atomically.
- **Contract & Docs**: Documented role constraints in `docs/api-contracts.md`.
- **Integration Tests**: Added/updated test cases in `backend/tests/feedback-validation.test.ts` to assert that correct roles are enforced and notifications are synchronized.

### Owner Settings Audit Logs Fix
- **Type safety update**: Changed the `details` field type in the `AuditLog` interface in `frontend/src/pages/owner/settings.tsx` to `any`.
- **Safe Rendering**: Wrapped the details column in a check: `l.details && typeof l.details === 'object' ? JSON.stringify(l.details) : (l.details || '-')`. This prevents objects from being rendered directly, avoiding React component tree crashes.

## Verification

- **TypeScript Compilation**: `npx tsc -b` -> PASS (0 errors).
- **Backend Tests**: `npm test` -> PASS (65 tests).
- **Frontend Tests**: `npm test` -> PASS (8 tests).
