# Requirements Summary - Gym Management System

## Overview

This document summarizes functional and non-functional requirements derived from the user stories (xlsx), SRS (docx), and Topic 2 (PDF) for the gym management system. SRS use cases: UC001 (Create Account), UC002 (Register/Renew Package), UC003 (Process Payment), UC004 (View Packages), UC005–UC007, UC008 (Manage Members), UC009 (Check-in), UC010 (Process Feedback), UC011 (Manage Packages), UC012 (Manage Staff), UC013 (Manage Rooms), UC014 (Manage Equipment), UC015 (PT Member List), UC016 (Track Progress), UC017 (PT Schedule), UC018 (Reports), UC019 (System Management).

## Actors And Roles

- Owner (Chu phong tap): manage system configuration, packages, staff, and reports.
- Staff: manage members, check-in, payments, equipment, and feedback handling.
- PT: manage assigned members, schedules, and workout progress.
- Member (Hoi vien): manage account, register/renew packages, check-in, and submit feedback.

## Functional Modules

- Facility management: rooms, room types, status, capacity.
- Equipment management: catalog, status, maintenance logs, alerts.
- Staff management: accounts, roles, schedules, performance metrics (Owner-managed).
- Member management: profile registration, search, updates, privacy masking.
- Package management: create/update, soft delete, visibility rules.
- Subscription and payment: purchase, renew, invoice, and payment records.
- Check-in: ID or fingerprint, package validation, usage tracking.
- PT workflows: member assignment, schedule planning, workout logs, progress.
- Feedback: intake, categorization, processing status, staff response.
- Reporting: revenue, member traffic, equipment status, staff performance (no export).

## Business Rules

- Member phone number must be unique (10 digits, starts with 0); member ID auto-generated after registration.
- Package soft delete: if active members exist, only allow deactivate (not hard delete).
- Package price change warning: show confirmation dialog when ≥50 active members use a package.
- Renewal threshold: show renewal CTA when remaining days/sessions < 7 days or threshold.
- Check-in rules: deny if package expired/sessions exhausted; auto-decrement session-based packages.
- Phone update does not require OTP verification in test app; display a warning banner before saving.
- PT schedules must avoid conflicts with member and PT calendars (overlap detection).
- Feedback statuses: Mới → Đang xử lý → Đã hoàn tất.
- Feedback categories: Staff, Equipment, Package.
- Staff feedback response: automatically sets feedback status to `completed` and creates a `member_notifications` entry for the member.
- Registration requires date of birth (dd/MM/yyyy format); minimum age of 16 is enforced server-side.
- Gym profile is a single-row configuration table (name, address, phone, email, open_hours); only Owner can update via PUT /api/gym-profile.
- Self-service account creation (UC001): new users can register without admin approval.
- Login redirects to role-specific dashboard based on role (Owner/Staff/PT/Member).

## Non-Functional Requirements

- RBAC enforced for Owner, Staff, PT, Member.
- Session validation for all authenticated use cases; auto-redirect to login on expiry.
- Transactions for multi-step operations (purchase/renewal + payment + invoice).
- Error handling: clear error messages with codes; distinguish system vs user errors.
- Audit logging for login/logout, member updates, payments, and role changes (min 90 days).
- UI formatting: Arial 14 black, white background, left/right alignment rules, dd/MM/yyyy dates, VN currency with thousands separator (e.g., 1.200.000 VNĐ).
- UI consistency: button positions, colors, and labels consistent across all screens; Cancel/Back button always present.
- Data privacy: mask sensitive fields (password, phone), encrypt fingerprint data if stored.
- Confirmation dialogs for irreversible actions (delete, deactivate, lock account).
- List screens support quick search + minimum 2 filter criteria.
- Action feedback within 1 second of successful save/update/delete.
- Error messages pinpoint the exact field and the fix (e.g., "Phone must be 10 digits starting with 0").

## Integrations And Dependencies

- Optional payment gateway for card/e-wallet flows (docs-only stub).
- Optional fingerprint device for check-in (docs-only stub).
- Optional notifications (email/app) for confirmations and reminders (docs-only stub).
- Hosted database: Supabase Postgres (SSL required).
