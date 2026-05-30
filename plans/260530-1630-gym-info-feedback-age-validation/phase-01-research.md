---
phase: 1
title: "Research"
status: completed
priority: P2
effort: "2h"
dependencies: []
---

# Phase 1: Research

## Overview

Confirm requirements and current behaviors for gym profile data, DOB validation, and feedback response delivery. Lock API contracts and UI expectations before implementation.

## Requirements

- Functional: define gym profile fields, DOB validation rules (format + age), and feedback response delivery behavior (member view + notification).
- Non-functional: maintain single-gym assumption, align error messages with SRS guidance (clear field-level errors).

## Architecture

- Add a single-row gym profile record (no gym_id) exposed via owner-only API.
- Enforce DOB validation in registration flow using dd/MM/yyyy input format from SRS and backend parsing.
- Extend feedback read path to include staff responses and create member notifications on response.

## Related Code Files

- Modify: `backend/src/db/schema.sql`
- Modify: `backend/src/routes/auth-routes.ts`
- Modify: `backend/src/routes/feedback-routes.ts`
- Modify: `frontend/src/pages/owner/settings.tsx`
- Modify: `frontend/src/pages/create-account.tsx`
- Modify: `frontend/src/pages/member/send-feedback.tsx`
- Modify: `docs/api-contracts.md`
- Reference: `docs/requirements-summary.md`

## Implementation Steps

1. Review SRS/requirements summary for UC013, UC001, and UC010 expectations.
2. Inspect current schema and routes to confirm missing fields/endpoints.
3. Define gym profile fields: name, address, phone, email, open hours (single row).
4. Specify DOB format dd/MM/yyyy and error messages for age < 16.
5. Define feedback response payload shape for member UI and confirm status set to completed.
6. Draft API contract changes for gym profile and feedback response retrieval.

## Success Criteria

- [x] Gym profile data model and API contract agreed.
- [x] DOB format and minimum age rule specified.
- [x] Feedback response delivery behavior specified (member view + notification).

## Risk Assessment

- DOB format parsing errors between frontend and backend.
- Single-row gym profile may require a fixed id or singleton constraint decision.
