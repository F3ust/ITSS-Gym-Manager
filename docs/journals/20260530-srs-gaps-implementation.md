# SRS Gaps Implementation — Audit Logs, Staff/PT Auth, DOB Validation

**Date**: 2026-05-30
**Severity**: Medium
**Component**: Backend API + Frontend (Audit, Staff/PT, Members, Packages)
**Status**: Resolved

## What Happened

Implemented missing SRS requirements across backend and frontend in a single commit (`b471317`). Backend gained an `audit_logs` table with a fire-and-forget `logAudit` utility, transactional staff/PT creation with username/password, DOB age validation on member creation, and a price-change warning endpoint. Frontend updated with audit tab, staff form fields, renewal CTAs, and price warning modals.

## The Brutal Truth

This was a big-bang deliverable — audit logging, auth fixes, validation, and UI updates all in one shot. Code review caught 3 auth bypass issues (C1–C3) that would have shipped to production. The `hashPassword` duplication across 3 route files is already annoying and will multiply if anyone adds a 4th user-creation endpoint. Payment audit logs have `null` user_id because there's no auth context in that flow — this is a design gap we're knowingly shipping.

## Technical Details

- `logAudit` is error-swallowed by design (fire-and-forget) — audit failures must never block user operations
- Staff/PT POST endpoints: transactional insert (`users` → `user_roles` → `staff`/`pt_profiles`) with username + password
- `ERR_PRICE_CHANGE_WARNING` returned when package has ≥50 active members — frontend extracts `activeCount` from API error details (was hardcoded to 50, fixed in code review)
- DOB validation: rejects members under 16 years old
- 7 new tests, 63 total, all passing
- TOCTOU race on duplicate username check — caught by UNIQUE constraint at DB level, not application code

## What We Tried

- **Hardcoded activeCount=50 in frontend** (C3): Replaced with extracting actual count from API error details
- **No auth on audit-logs/staff/PT endpoints** (C1, C2): Added `requireRole(['Owner'])` middleware
- **Hashing password inline in each route file**: Works, but duplicated in 3 places (auth-routes, staff-routes, pt-routes)

## Root Cause Analysis

The auth bypass issues (C1, C2) happened because new endpoints were added without auth middleware. No checklist or convention enforced "every route gets auth." The hardcoded count (C3) was a shortcut — easier to hardcode than wire up the API error response parsing.

## Lessons Learned

- **Auth middleware is not optional.** Every new endpoint needs `requireRole()` or `authenticateToken`. Consider a lint rule or route decorator that enforces this.
- **Extract shared utilities early.** `hashPassword` is now in 3 files. Next time someone adds user creation, they'll copy-paste again. Move to a shared `auth-utils.ts` before this becomes 5 files.
- **Error responses as data contracts.** The price warning uses error details to carry `activeCount`. This is clever but fragile — if the error shape changes, the frontend breaks silently. Consider a dedicated endpoint or warning field in the success response.
- **TOCTOU on username check is a known pattern.** The UNIQUE constraint is the safety net, not the primary check. Document this trade-off explicitly.

## Next Steps

- [ ] Extract `hashPassword` to a shared `auth-utils` module
- [ ] Add auth middleware convention/lint rule (owner: TBD)
- [ ] Evaluate moving `activeCount` from error details to a dedicated endpoint or response field
- [ ] Document TOCTOU race as accepted risk in architecture docs
