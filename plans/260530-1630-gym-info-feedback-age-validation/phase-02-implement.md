---
phase: 2
title: "Implement"
status: completed
priority: P1
effort: "1d"
dependencies: [1]
---

# Phase 2: Implement

## Overview

Implement gym profile management, enforce minimum age in registration, and deliver staff feedback responses to members with notification support.

## Requirements

- Functional: owner can read/update gym profile, registration rejects age < 16, members can see staff responses and receive a notification.
- Non-functional: keep single-gym assumption, enforce role access, keep error messages explicit.

## Architecture

- Gym profile stored as a single-row table (gym_profile) and exposed via owner-only GET/PUT endpoints.
- Registration validates DOB and calculates age >= 16 server-side from dd/MM/yyyy input; frontend validates format before submit.
- Feedback responses stored in feedback_responses and returned in member feedback history; response creation triggers a member notification and sets feedback status to completed.

## Related Code Files

- Modify: `backend/src/db/schema.sql`
- Modify: `backend/src/routes/auth-routes.ts`
- Modify: `backend/src/routes/feedback-routes.ts`
- Modify: `backend/src/routes/notifications-routes.ts`
- Modify: `frontend/src/pages/owner/settings.tsx`
- Modify: `frontend/src/pages/create-account.tsx`
- Modify: `frontend/src/pages/member/send-feedback.tsx`
- Modify: `frontend/src/pages/staff/feedback-inbox.tsx`
- Modify: `docs/api-contracts.md`

## Implementation Steps

1. Add gym_profile table (single row) to schema with fields: name, address, phone, email, open_hours.
2. Add owner-only routes: GET /gym-profile and PUT /gym-profile with validation.
3. Update Owner Settings page to add a Gym Profile tab/form backed by new endpoints.
4. Enforce DOB presence and age >= 16 in /auth/register with clear error messages.
5. Update Create Account page to validate dd/MM/yyyy input and surface errors.
6. Extend feedback queries to include latest response for each feedback item (member view).
7. Add staff response UI in Feedback Inbox and call POST /feedback/:id/response.
8. On response creation, update feedback status to completed and create member_notifications entry.
9. Update API contracts doc for new endpoints and payloads.

## Success Criteria

- [x] Owner can view/edit gym profile and data persists as a single record.
- [x] Registration rejects age < 16 and accepts valid DOBs.
- [x] Members see staff responses in feedback history and get a notification.

## Risk Assessment

- Singleton gym profile requires consistent seeding strategy across environments.
- Age calculation must be timezone-safe to avoid off-by-one errors.
