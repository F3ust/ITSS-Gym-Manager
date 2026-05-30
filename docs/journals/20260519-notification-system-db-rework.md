# Notification System Rework — Client-Side localStorage to DB-Backed

**Date**: 2026-05-19
**Severity**: Medium
**Component**: Notifications — backend routes, expiry scheduler, PT schedule hook, frontend hooks
**Status**: Resolved (both compile, 45/45 tests pass)

## What Happened

Replaced the client-side localStorage notification system with a DB-backed `member_notifications` table, CRUD API, hourly expiry scheduler, and auto-notification on PT schedule creation. Frontend fetches via API with 30s polling for members; non-member roles (Owner/Staff/PT) keep localStorage fallback. Unread badge count wired into sidebar.

## The Brutal Truth

The old system was a toy. Notifications lived in `localStorage` — per-browser, per-device, wiped on cache clear, zero cross-session consistency. Members could miss expiry warnings because they switched browsers or cleared storage. We shipped it anyway because the MVP deadline was tight and we told ourselves "it's just a gym app." Classic technical debt rationalization — the kind that comes due the moment a member calls complaining they didn't get notified their package expired.

The rework itself was straightforward, but the dual-path decision stings. We're maintaining two notification systems now. The localStorage path for non-members exists because our data model ties member_id to notifications, and Owner/Staff/PT roles don't always have one. Rather than fix the schema to support role-based notifications properly, we took the path of least resistance. I'm calling this what it is: kicking the can.

## Technical Details

**Core schema change** — `member_notifications` table with `member_id`, `title`, `message`, `type`, `is_read`, `created_at`. No notification_types enum yet. No expiry_action reference column.

**Expiry scheduler** — `setInterval` at 1-hour cadence in `expiry-checker.ts`. `INSERT ... SELECT WHERE NOT EXISTS` prevents duplicate notifications via Vietnamese text LIKE match on the message content. This is fragile — a locale change or minor rewording breaks dedup. Guarded with `NODE_ENV === 'test'` to prevent timer leaks in test suite.

**PT schedule hook** — fire-and-forget `.catch()` on notification insert inside the PT route handler. Non-blocking by design — if the notification insert fails, the schedule creation still succeeds. No compensation/retry.

**Frontend** — `use-notifications.ts` hook split into two paths: `useApiNotifications(memberId)` with 30s polling + skip-if-running guard for members, and the existing `useLocalStorageNotifications()` for non-members. The sidebar reads both.

**Access control** — read endpoints have zero authorization checks. Same pattern as the rest of the codebase, so at least it's consistent. But a member can trivially read another member's notifications if they guess the ID.

## What We Tried

- Single-path with nullable member_id and fallback display logic — abandoned because the localStorage code was already there and removing it meant rewriting more frontend surface area than we had budget for.
- PostgreSQL LISTEN/NOTIFY for real-time push — dropped as over-engineering for MVP. Polling at 30s is fine for a gym app.
- Dedup via notification hash column — considered but deferred. The LIKE match on Vietnamese text works well enough ("đã hết hạn" is unlikely to appear in unrelated messages) but we're one locale change away from a bug.

## Root Cause Analysis

The original sin was rushing the MVP notification system. localStorage was "good enough" to ship, but no one documented the decision or scheduled the rework. By the time we circled back, the frontend had three components depending on the localStorage shape, and the backend had no notification infrastructure at all.

The dual-path decision is a direct consequence of not designing for role-based notifications from the start. The `member_notifications` table is member-centric by nature, and non-member roles (Owner, Staff, PT) are second-class citizens in this model. We should have either (a) made the notification system user_id-based (all roles have a user_id), or (b) built a separate notification channel for non-members intentionally rather than as a fallback.

## Lessons Learned

1. **localStorage for cross-session state is always wrong** — we knew this and did it anyway. Next time, document the debt at commit time and link the follow-up ticket in the code comment.
2. **Vietnamese text match for dedup will bite us** — add a `dedup_key` column (notification type + member_id + schedule_id/composite) before it breaks in production. It's a small schema migration, do it now.
3. **Dual-path notification is a maintenance trap** — every new notification feature now needs to check: "does this affect members, non-members, or both?" This ambiguity will cause bugs. Either unify on user_id-based notifications or explicitly deprecate the localStorage path with a sunset date.
4. **`.` pattern works for non-blocking writes** — minimal, readable, intentional. Worth standardizing.
5. **Timer guards in test mode are necessary** — `NODE_ENV === 'test'` on the scheduler start prevented a nightmare of dangling intervals in the test suite. This pattern should be documented as a project standard.

## Next Steps

1. **Add `dedup_key` column** to `member_notifications` — composite of `(member_id, notification_type, reference_id)` — and replace the LIKE match. Small migration, big robustness win. Owner: backend dev. Timeline: next week.
2. **Unify notification model to user_id** — this is the real fix for the dual-path problem. Requires schema change, migration of existing data, and frontend refactor. Significant effort (~3-5 days). Add to roadmap as tech debt item.
3. **Add access control to read endpoints** — low effort (add `memberId` param matching from session), existing codebase-wide gap so not blocking, but worth doing while the code is fresh. Owner: whoever touches notifications next.
4. **Add `notification_types` enum and `reference_id`** — enables smarter UI (expiry notifications get a "View Package" link, schedule notifications get a "View Schedule" link).
