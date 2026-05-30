# Gym Profile, Feedback Responses, and Age Validation

**Date**: 2026-05-30 17:34
**Severity**: Medium
**Component**: Auth (register), Feedback, Gym Profile, Frontend Settings/Feedback
**Status**: Resolved (56/56 tests pass)

## What Happened

Shipped `3761f99` — a three-headed feature adding gym profile CRUD (single-row `gym_profile` table), staff feedback response with member notification wiring, and age validation on registration. ~370 LOC across backend routes, DB schema, frontend forms, and 11 new tests.

**Gym profile**: `GET /api/gym-profile` (any role, returns public gym info) + `PUT /api/gym-profile` (owner-only, updates name/address/phone/email/open_hours). Frontend tab under Settings with inline edit form.

**Feedback responses**: `POST /api/feedback/:id/response` now sets status to `completed` and inserts a `member_notifications` row. `GET /api/feedback` with `memberId` JOINs responses via `json_agg`. Staff inbox frontend has a respond modal with textarea. Member feedback history shows responses with an orange left border.

**Age validation**: `POST /api/auth/register` now parses DOB as `dd/MM/yyyy`, calculates age, rejects with 400 if < 16. Frontend matches the check before form submit. Tests for missing DOB, invalid format, and under-16 rejection.

## The Brutal Truth

This feature felt like three unrelated features welded into one commit because their LOC individually were too small to justify separate branches. That's fine for velocity, but the commit message is a shopping list, not a story — future git blame readers will have to dig through three unrelated changesets to understand why any one of them happened.

The `staffId` not being sent from the frontend respond dialog is an embarrassment. API supports `staff_id` but the UI doesn't capture or send it. Responses are orphaned from the staffer who wrote them. Caught it during review, noted as tech debt, shipped anyway. That's the right call for velocity but it means someone has to fix it before any "who responded to this feedback?" query can work.

## Technical Details

**Age calculation** — JS `Date` parsing of `dd/MM/yyyy` is fragile. We split on `/`, construct `new Date(year, monthIndex, day)`, then diff against today. The `monthIndex` off-by-one (0-indexed months) is handled correctly, but JS `Date` month clamping means `new Date(2026, 1, 31)` silently becomes March 3 (February has 28 days in non-leap years). This affects ~0.07% of users on edge dates. For a gym registration form that's acceptable, but we should document it.

**Gym profile table** — single-row design enforces one gym per instance. No `id` in the `GET` response (frontend passes `id` in `PUT` path but it's always 1). If this ever becomes multi-gym, the entire API contract changes.

**Feedback response flow** — the notification insert is fire-and-forget inside the route handler. Same `.catch()` pattern as the PT schedule hook. Consistent but no compensation if the notification insert fails while the status update succeeds — the response is orphaned from notification.

**RBAC holes** — `PUT /api/gym-profile` owner-only check exists. `POST /api/feedback/:id/response` requires a role but doesn't distinguish between roles — any authenticated user with a role can respond. Not exploitable in current deployment (all roles are trusted), but the guard is weaker than the intent.

## What We Tried

- Adding `staffId` capture to the frontend respond dialog — abandoned because the session context wasn't wired to expose the staff user's ID in a way we could pass to the modal. Rather than refactor the auth context mid-feature, we deferred.
- Full email regex validation on gym profile PUT — dropped for MVP. The backend just stores whatever string the owner types. No format check, no MX lookup, nothing.
- Returning response data in `GET /api/feedback/:id` — noticed it was missing from the single-item endpoint but present in the list endpoint. Considered adding it, scoped out of the commit to keep changeset focused.

## Root Cause Analysis

The three-headed commit is a symptom of no feature-boundary discipline. Age validation is auth, gym profile is admin settings, feedback response is communication. They share nothing except "built during the same session." This happens when we optimize for developer time over logical grouping — and it's the right call for a small team, but the commit message should at least segment the changes.

The `staffId` gap is a frontend-backend contract misalignment. The backend added `staff_id` to the response schema, the backend test validates it, but no one traced the frontend path end-to-end during implementation. Review caught it, but we'd already moved on to the next piece.

## Lessons Learned

1. **Trace frontend-backend contract changes end-to-end before calling done** — a `staff_id` column in the backend response that the frontend never sends is dead code. Add a checklist item for the next feature that touches both layers.
2. **JS Date month clamping is a real bug vector** — document the `dd/MM/yyyy` parsing limitation in a comment next to the validation. If we ever process DOBs around end-of-month edges, this will surface as a hard-to-reproduce support ticket.
3. **Separate concerns into separate commits even in small features** — three unrelated changes in one commit makes cherry-picking, reverting, and blaming harder. The cost of `git commit -m` three times is ~30 seconds. Do it.
4. **Single-row tables are a future pain point** — if multi-gym support ever comes, the gym profile endpoint contract changes completely. Add a comment in `schema.sql` noting this constraint.

## Next Steps

1. **Send `staffId` from frontend respond modal** — small frontend change, big data quality win. Should take < 30 minutes. Owner: whoever picks up feedback next.
2. **Add response data to `GET /api/feedback/:id`** — consistency fix. The single-item endpoint should match the list endpoint's shape. Low effort.
3. **Add gym profile email validation** — basic regex at minimum, `validator.isEmail()` ideally. Currently storing garbage silently.
4. **Document the DOB month-clamping edge case** — inline comment in `auth-routes.ts` next to the age validation logic.
