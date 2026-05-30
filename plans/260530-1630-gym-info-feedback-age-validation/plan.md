---
title: "Gym info, feedback responses, age validation"
description: "Add gym profile management, enforce min-age registration, and deliver staff feedback responses to members."
status: completed
priority: P1
branch: ""
tags: [backend, frontend, db, srs, feedback, settings]
blockedBy: []
blocks: []
created: "2026-05-30T09:30:50.517Z"
createdBy: "ck:plan"
source: skill
completed: "2026-05-30"
---

# Gym info, feedback responses, age validation

## Overview

Implement three SRS-aligned gaps for a single-gym system: (1) owner-managed gym profile information, (2) enforce minimum age (>= 16) on account creation, and (3) deliver staff responses back to members in the feedback flow. This plan keeps the single-gym assumption (no gym_id) and adds a single-row profile record.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Research](./phase-01-research.md) | Completed |
| 2 | [Implement](./phase-02-implement.md) | Completed |
| 3 | [Test](./phase-03-test.md) | Completed |

## Dependencies

None.

## Success Criteria

- Owner can view/update gym profile information from Settings with a single backend record.
- Registration rejects DOBs younger than 16 years with clear validation errors.
- Members see staff responses in their feedback history and receive a notification when a response is posted.
