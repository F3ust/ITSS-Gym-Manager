# Mô Hình Dữ Liệu Vật Lý (Database Physical Schema) - Gym Management System

Tài liệu này đặc tả chi tiết **Mô hình Dữ liệu Vật lý (Database Physical Schema)** được trích xuất và đồng bộ hóa trực tiếp từ cơ sở dữ liệu Postgres đang hoạt động thực tế của dự án.

Mô hình được biểu diễn dưới dạng **Sơ đồ Thực thể - Mối quan hệ (Entity-Relationship Diagram - ERD) theo ký pháp chân chim (Crow's Foot)** và danh mục bảng đặc tả chi tiết (Data Dictionary) định dạng chuẩn theo mẫu.

---

## 1. Sơ đồ Quan hệ Thực thể Vật lý thực tế (ERD)

```mermaid
erDiagram
    check_ins {
        uuid id PK
        uuid member_id FK
        timestamptz check_in_at 
        text method 
        integer remaining_sessions_after 
        boolean with_pt 
    }
    equipment {
        uuid id PK
        text name 
        integer quantity 
        text origin 
        date warranty_until 
        text status 
    }
    feedback {
        uuid id PK
        uuid member_id FK
        text category 
        integer rating 
        text content 
        text status 
        timestamptz created_at 
    }
    feedback_notifications {
        uuid id PK
        uuid feedback_id FK
        text status 
        timestamptz created_at 
    }
    feedback_responses {
        uuid id PK
        uuid feedback_id FK
        uuid staff_id FK
        text response 
        timestamptz created_at 
    }
    gym_profile {
        uuid id PK
        text name 
        text address 
        text phone 
        text email 
        text open_hours 
        timestamptz created_at 
        timestamptz updated_at 
    }
    invoices {
        uuid id PK
        uuid payment_id FK
        timestamptz issued_at 
    }
    maintenance_logs {
        uuid id PK
        uuid equipment_id FK
        text note 
        text status 
        timestamptz created_at 
    }
    member_notifications {
        uuid id PK
        uuid member_id FK
        text icon 
        text message 
        boolean read 
        timestamptz created_at 
    }
    members {
        uuid id PK
        uuid user_id FK
        text full_name 
        text email 
        text phone 
        text avatar_url 
        date dob 
        text job 
        text member_type 
        text fingerprint_hash 
        text status 
        timestamptz created_at 
    }
    packages {
        uuid id PK
        text name 
        integer duration_days 
        integer price 
        text category 
        text description 
        text status 
        integer session_count 
        integer pt_session_count 
    }
    payments {
        uuid id PK
        uuid subscription_id FK
        integer amount 
        text method 
        text status 
        timestamptz paid_at 
    }
    pt_assignments {
        uuid id PK
        uuid pt_id FK
        uuid member_id FK
        text status 
    }
    pt_profiles {
        uuid id PK
        uuid user_id FK
        text full_name 
        text bio 
        timestamptz created_at 
    }
    pt_schedules {
        uuid id PK
        uuid pt_id FK
        uuid member_id FK
        timestamptz start_at 
        timestamptz end_at 
        text workout_type 
        text status 
    }
    roles {
        uuid id PK
        text name 
    }
    room_types {
        uuid id PK
        text name 
        text description 
        text status 
    }
    rooms {
        uuid id PK
        uuid room_type_id FK
        text name 
        integer capacity 
        text status 
    }
    staff {
        uuid id PK
        uuid user_id FK
        text full_name 
        text role_title 
        timestamptz created_at 
    }
    staff_performance_metrics {
        uuid id PK
        uuid staff_id FK
        date period_start 
        date period_end 
        text metric_name 
        numeric metric_value 
    }
    staff_schedules {
        uuid id PK
        uuid staff_id FK
        timestamptz start_at 
        timestamptz end_at 
        text role 
        text status 
    }
    subscriptions {
        uuid id PK
        uuid member_id FK
        uuid package_id FK
        date start_date 
        date end_date 
        integer remaining_sessions 
        text status 
        integer remaining_pt_sessions 
    }
    user_roles {
        uuid user_id FK, PK
        uuid role_id FK, PK
    }
    users {
        uuid id PK
        text username 
        text password_hash 
        text status 
        timestamptz created_at 
    }
    workout_logs {
        uuid id PK
        uuid member_id FK
        uuid pt_id FK
        date workout_date 
        integer duration_min 
        text intensity 
        text notes 
        integer rating 
    }
    users ||--o{ user_roles : ""
    roles ||--o{ user_roles : ""
    users ||--o| members : "has profile"
    users ||--o| staff : "has profile"
    users ||--o| pt_profiles : "has profile"
    room_types ||--o{ rooms : ""
    equipment ||--o{ maintenance_logs : ""
    members ||--o{ subscriptions : ""
    packages ||--o{ subscriptions : ""
    subscriptions ||--o{ payments : ""
    payments ||--o| invoices : "generates"
    members ||--o{ check_ins : ""
    staff ||--o{ staff_schedules : ""
    staff ||--o{ staff_performance_metrics : ""
    pt_profiles ||--o{ pt_assignments : ""
    members ||--o{ pt_assignments : ""
    pt_profiles ||--o{ pt_schedules : ""
    members ||--o{ pt_schedules : ""
    members ||--o{ workout_logs : ""
    pt_profiles ||--o{ workout_logs : ""
    members ||--o{ feedback : ""
    feedback ||--o{ feedback_responses : ""
    staff ||--o{ feedback_responses : ""
    members ||--o{ member_notifications : ""
    feedback ||--o| feedback_notifications : "triggers"
```

---

## 2. Đặc Tả Chi Tiết Các Bảng Dữ Liệu (Data Dictionary)

Dưới đây là đặc tả chi tiết của 25 bảng thực tế theo mẫu chuẩn:

### Bảng: USERS
| # | PK | FK | USERS | Data type | Mandatory | Description |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1. | x | | id | UUID | Yes | Khóa chính (Primary Key), định danh duy nhất (UUID) |
| 2. | | | username | TEXT | Yes | Tên đăng nhập hệ thống |
| 3. | | | password_hash | TEXT | Yes | Mật khẩu mã hóa bảo mật |
| 4. | | | status | TEXT | Yes | Trạng thái hoạt động |
| 5. | | | created_at | TIMESTAMPTZ | Yes | Thời gian tạo bản ghi |

### Bảng: ROLES
| # | PK | FK | ROLES | Data type | Mandatory | Description |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1. | x | | id | UUID | Yes | Khóa chính (Primary Key), định danh duy nhất (UUID) |
| 2. | | | name | TEXT | Yes | Tên gọi hiển thị |

### Bảng: USER_ROLES
| # | PK | FK | USER_ROLES | Data type | Mandatory | Description |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1. | x | x | user_id | UUID | Yes | Khóa ngoại (Foreign Key) tham chiếu đến bảng users(id) |
| 2. | x | x | role_id | UUID | Yes | Khóa ngoại (Foreign Key) tham chiếu đến bảng roles(id) |

### Bảng: MEMBERS
| # | PK | FK | MEMBERS | Data type | Mandatory | Description |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1. | x | | id | UUID | Yes | Khóa chính (Primary Key), định danh duy nhất (UUID) |
| 2. | | x | user_id | UUID | No | Khóa ngoại (Foreign Key) tham chiếu đến bảng users(id) |
| 3. | | | full_name | TEXT | Yes | Họ và tên đầy đủ |
| 4. | | | email | TEXT | No | Địa chỉ thư điện tử |
| 5. | | | phone | TEXT | Yes | Số điện thoại liên hệ |
| 6. | | | avatar_url | TEXT | No | Đường dẫn ảnh đại diện |
| 7. | | | dob | DATE | Yes | Ngày tháng năm sinh |
| 8. | | | job | TEXT | Yes | Nghề nghiệp hiện tại |
| 9. | | | member_type | TEXT | Yes | Phân loại hội viên (VIP, Thường, PT) |
| 10. | | | fingerprint_hash | TEXT | No | Mẫu vân tay mã hóa dùng điểm danh |
| 11. | | | status | TEXT | Yes | Trạng thái hoạt động |
| 12. | | | created_at | TIMESTAMPTZ | Yes | Thời gian tạo bản ghi |

*(Lưu ý: Bảng chi tiết toàn bộ các thực thể khác được đặc tả đầy đủ trong tài liệu Word đính kèm [docs/physical-data-model.docx](file:///C:/Users/trand/Downloads/Learning%20-%20Non%20AI/ITSS-%20Vi%E1%BB%87t/gym/docs/physical-data-model.docx))*
