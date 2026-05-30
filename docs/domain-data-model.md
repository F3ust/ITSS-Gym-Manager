# Domain Data Model - Gym Management System

## Overview

This document outlines the core entities and relationships for the gym management system.

## Core Entities

- users: login accounts for all actors.
- roles: Owner, Staff, PT, Member.
- user_roles: mapping users to roles.
- members: profile data linked to users.
- staff: staff profile data linked to users.
- pt_profiles: PT profile data linked to users.
- room_types: room type catalog (gym, yoga, fitness, etc.).
- rooms: facility rooms linked to room types.
- equipment: equipment catalog and status.
- maintenance_logs: equipment maintenance history.
- packages: membership package definitions.
- subscriptions: member package subscriptions.
- payments: payment records for subscriptions.
- invoices: generated invoices for payments.
- check_ins: check-in records.
- staff_schedules: staff working schedules.
- staff_performance_metrics: staff performance rollups by period.
- pt_assignments: member to PT mapping.
- pt_schedules: PT schedule entries for members.
- workout_logs: PT-recorded sessions and progress.
- gym_profile: single-row table holding gym information (name, address, phone, email, open_hours).
- feedback: member feedback records.
- feedback_responses: staff responses and status updates.
- member_notifications: notifications pushed to members on relevant events.
- reports: generated report snapshots.
- audit_logs: system audit trail for security-relevant actions (login, payments, role/status changes, member updates).

## Key Fields (High-Level)

- users: id, username, password_hash, status, created_at.
- members: id, user_id, full_name, phone, dob, job, member_type, fingerprint_hash, status.
- room_types: id, name, description, status.
- rooms: id, room_type_id, name, capacity, status.
- packages: id, name, duration_days, price, category, description, status.
- subscriptions: id, member_id, package_id, start_date, end_date, remaining_sessions, status.
- payments: id, subscription_id, amount, method, status, paid_at.
- check_ins: id, member_id, check_in_at, method, remaining_sessions_after.
- gym_profile: id, name, address, phone, email, open_hours, updated_at (single-row table).
- feedback: id, member_id, category, rating, content, status, created_at.
- member_notifications: id, member_id, icon, message, status, created_at.
- staff_schedules: id, staff_id, start_at, end_at, role, status.
- staff_performance_metrics: id, staff_id, period_start, period_end, metric_name, metric_value.
- pt_schedules: id, pt_id, member_id, start_at, end_at, workout_type, status.
- workout_logs: id, member_id, pt_id, workout_date, duration_min, intensity, notes, rating.
- audit_logs: id, user_id, action (TEXT), details (JSONB), created_at.

## Relationships

- users 1..n user_roles n..1 roles.
- users 1..1 members or staff or pt_profiles.
- members 1..n subscriptions; subscriptions 1..n payments and 1..1 invoices.
- members 1..n check_ins.
- members n..1 pt_assignments n..1 pt_profiles.
- members 1..n workout_logs; pt_profiles 1..n workout_logs.
- staff 1..n staff_schedules; staff 1..n staff_performance_metrics.
- pt_profiles 1..n pt_schedules; members 1..n pt_schedules.
- room_types 1..n rooms.
- equipment 1..n maintenance_logs.
- members 1..n feedback; feedback 1..n feedback_responses.
- gym_profile: singleton table (single row, no FK).
- members 1..n member_notifications.
- users 1..n audit_logs (user_id nullable via ON DELETE SET NULL).

## Notes

- Store fingerprint data as encrypted blob or hash; never store raw scans.
- Use soft delete for packages and other entities with history requirements.
- Audit logs are written via the `logAudit` utility (`utils/audit-logger.ts`). The `user_id` is nullable for anonymous/system actions.
