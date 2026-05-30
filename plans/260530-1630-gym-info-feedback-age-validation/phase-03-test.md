---
phase: 3
title: "Test"
status: completed
priority: P2
effort: "4h"
dependencies: [2]
---

# Phase 3: Test

## Overview

Add automated coverage for the new gym profile APIs, DOB validation, and feedback response delivery.

## Requirements

- Functional: verify happy paths and validation errors for all three features.
- Non-functional: keep test data deterministic and avoid time-based flakiness.

## Architecture

- Backend tests assert API responses and DB side effects (notifications, status changes).
- Frontend checks are limited to smoke paths if a UI test harness exists.

## Related Code Files

- Modify: `backend/tests/members-validation.test.ts`
- Modify: `backend/tests/feedback-validation.test.ts`
- Modify: `backend/tests/rbac-guards.test.ts`
- Modify: `backend/tests/health.test.ts`

## Implementation Steps

1. Add registration tests covering valid DOB, under-16 rejection, and missing DOB.
2. Add gym profile API tests for read/update and owner-only access.
3. Add feedback response tests: response creation, status change, and notification insert.
4. Add member feedback list test to ensure responses are returned to the member.
5. Update API contract docs if test expectations diverge from current spec.

## Success Criteria

- [x] New tests pass and cover key validation/permissions.
- [x] Gym profile, DOB validation, and feedback response behavior are validated end-to-end at API layer.

## Risk Assessment

- Tests may require fixtures or seed data for owner/staff roles and members.
- Notification timestamps can cause flaky assertions if not normalized.
