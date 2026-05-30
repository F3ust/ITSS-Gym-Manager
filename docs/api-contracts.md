# API Contracts - Gym Management System

## Overview

This document lists the initial REST API surface for the gym management system.

## Auth And Session

- POST /api/auth/login
- POST /api/auth/logout
- GET /api/auth/session

## Members

- POST /api/members
  - Validates age ≥ 16 (server-side).
- GET /api/members?query=...&status=...
- GET /api/members/{id}
- PATCH /api/members/{id} (phone change allowed without verification; UI must warn)

## Packages

- POST /api/packages
  - Payload accepts optional `sessionCount` (integer > 0). Either `durationDays` or `sessionCount` must be provided.
- GET /api/packages?status=active
- GET /api/packages/{id}
- PATCH /api/packages/{id} (requires confirmPriceChange when activeMembersCount is high; returns ERR_PRICE_CHANGE_WARNING if activeMembersCount ≥ 50; supports `sessionCount` update)
- DELETE /api/packages/{id}  (soft delete)

## Subscriptions And Payments

- POST /api/subscriptions
  - Payload accepts optional `remainingSessions`. If omitted, defaults to package `session_count`.
- POST /api/subscriptions/{id}/renew
- POST /api/payments (amount must be numeric and non-negative; 0 is allowed)
- GET /api/payments/{id}
- GET /api/invoices/{id}

## Members

- GET /api/members/usage-history?from=YYYY-MM-DD&to=YYYY-MM-DD&memberId=...&userId=...
  - RBAC: Owner/Staff can access any member by memberId; Member requires userId and can only access own history
  - Returns `{ items: [{ id, occurred_at, type: 'checkin'|'workout', ... }] }` sorted by occurred_at desc
  - Requires `from` and `to` query params; `from` must be before `to`
  - Returns `ERR_FORBIDDEN` for PT role or mismatched member access

## Check-In

- POST /api/check-ins
  - Decrements subscription `remaining_sessions` if not null.
  - Rejects check-in with `409 ERR_NO_SESSIONS` if sessions are exhausted.
- GET /api/check-ins?memberId=...&date=YYYY-MM-DD
	- `method` values are stored normalized (lowercase, spaces -> underscores), e.g., `fingerprint_right`
	- `fingerprint_wrong` is denied with `ERR_FINGERPRINT_DENIED`

## Facilities And Equipment

- POST /api/room-types
- GET /api/room-types
- PATCH /api/room-types/{id}
- POST /api/rooms
- GET /api/rooms
- PATCH /api/rooms/{id}
- POST /api/equipment
- GET /api/equipment?status=...
- GET /api/equipment/alerts?status=open|warranty_expired|all (Owner/Staff)
  - Returns open maintenance alerts and expired warranty alerts.
  - `status=open` returns only maintenance logs with `status=open`.
  - `status=warranty_expired` returns equipment whose `warranty_until` is before current date.
  - `status=all` returns both alert types sorted by `created_at` descending.
- PATCH /api/equipment/{id}
- POST /api/equipment/{id}/maintenance

## Staff And Roles

- POST /api/staff
  - Payload includes `username` and `password` fields to create a login account (users + user_roles) in a transaction.
- PATCH /api/staff/{id}
- POST /api/roles/assign
- GET /api/roles/audit-logs (Owner-only)
  - Returns audit log entries (audit_logs table) with username, action, timestamp, etc.
- GET /api/staff/schedules (Owner-only)
- POST /api/staff/schedules (Owner-only)
- PATCH /api/staff/schedules/{id} (Owner-only)
- GET /api/staff/performance?from=...&to=... (Owner-only)

## PT Workflows

- POST /api/pt
  - Payload includes `username` and `password` fields to create a login account (users + user_roles) in a transaction.
- GET /api/pt/assignments
- POST /api/pt/assignments
- POST /api/pt/schedules (409 ERR_SCHEDULE_CONFLICT)
- PATCH /api/pt/schedules/{id} (409 ERR_SCHEDULE_CONFLICT)
- POST /api/pt/workouts
- GET /api/pt/workouts?memberId=...

## Feedback

- POST /api/feedback
- GET /api/feedback?status=... (with memberId returns responses array)
- GET /api/feedback/notifications?status=... (Owner/Staff)
- PATCH /api/feedback/{id}/status
- POST /api/feedback/{id}/response (Owner/Staff)
  - Payload: `{ staffId?, response }`
  - Sets feedback status to `completed`, creates `member_notifications` entry

## Reports

- GET /api/reports/revenue?from=...&to=...
- GET /api/reports/traffic?from=...&to=...
- GET /api/reports/equipment
- GET /api/reports/staff-performance (Owner-only)

## Integration Stubs (Docs-Only)

- Payment gateway interface: authorization, capture, and webhook placeholders
- Fingerprint device interface: enroll, verify, and device health placeholders
- Notification interface: email/app dispatch placeholders

## Gym Profile

- GET /api/gym-profile (any role)
- PUT /api/gym-profile (Owner-only)
  - Payload: `{ name, address, phone, email?, open_hours? }`
  - Returns the updated single-row gym profile record

## Error Model

- All error responses return { "code": "ERR_*", "message": "...", "details": {...} }
- Validation errors return field-level details.
