# UI Navigation Map - Gym Management System

## Pre-Login (Shared)

- Login
- Create Account (UC001)

## Owner

- Dashboard
- Packages
  - Package List
  - Create / Edit Package
  - Deactivate Package (soft delete)
- Staff And Roles
  - Staff Accounts
  - Role / Permission Assignment
- Staff Schedules
  - View Staff Schedule
  - Create / Edit Shift
- Facilities
  - Room Types
  - Rooms (name, type, capacity, status)
- Equipment
  - Equipment Catalog
  - Equipment Status Overview
  - Maintenance Alerts
- Reports (UC018)
  - Revenue Report (by time range, by package type)
  - Member Traffic Report (check-in volume by time slot)
  - Equipment Status Report
  - Staff Performance Report
- System Settings (UC019)
  - User Management
  - Role Management
  - Audit Logs

## Staff

- Member Management (UC008)
  - Register New Member
  - Search / View Member Profile
  - Update Member Info
- Check-In (UC009)
  - ID Search Check-In
  - Fingerprint Check-In (optional)
- Package Registration (UC002)
  - Select Package For Member
  - Process Payment (UC003)
  - Generate Invoice
- Renewals (UC002)
  - View Expiring Members
  - Process Renewal Payment
- Equipment Maintenance (UC014)
  - Equipment List
  - Report Fault
  - Update Maintenance Status
- Feedback Inbox (UC010)
  - View Feedback List
  - Process Feedback (Mới → Đang xử lý → Đã hoàn tất)
  - Reply To Member

## PT

- Assigned Members (UC015)
  - Member List
  - Member Profile + Workout History
- PT Schedule (UC017)
  - Weekly / Monthly Calendar
  - Create / Edit Session
  - Conflict Check
- Workout Logs (UC016)
  - Log Session (duration, exercises, intensity, notes)
  - Rate Member Progress (1-5 or Good/Average/Poor)
- Progress Overview (UC016)
  - Charts / History Per Member
  - Trend View

## Member

- My Profile (UC007)
  - View / Edit Personal Info (email, avatar, password)
  - Phone change warning (no OTP in test app)
- Available Packages (UC004)
  - Browse Active Packages
  - View Price & Benefits
- My Package (UC002)
  - Current Package Status
  - Remaining Days / Sessions
  - Quick Renew Button (when under 7 days left)
- Workout History
  - Check-In History
  - PT Workout Logs
- Send Feedback (UC006)
  - Select Category (Staff / Equipment / Package)
  - Rate + Comment
  - View Reply History

## Shared (Post-Login)

- Notifications
- Help And Support

## Login → Redirect By Role

```
Login → Owner Dashboard
      → Staff Dashboard
      → PT Dashboard
      → Member Dashboard
```
