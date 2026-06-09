require('dotenv').config();
const { randomBytes, scryptSync } = require('crypto');
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;
const sslMode = String(process.env.PGSSLMODE || process.env.DATABASE_SSL || '').toLowerCase();
const rejectUnauthorized = process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false';

const config = {
  connectionString,
};

if (sslMode === 'true' || sslMode === 'require' || sslMode === 'verify-full' || sslMode === 'verify-ca') {
  config.ssl = { rejectUnauthorized };
}

const pool = new Pool(config);

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

async function main() {
  console.log('Connecting to database for seeding a complete set of mock data...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Roles
    console.log('Seeding roles...');
    const roles = ['Owner', 'Staff', 'PT', 'Member'];
    const roleMap = {};
    for (const roleName of roles) {
      const res = await client.query(
        'INSERT INTO roles (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id, name',
        [roleName]
      );
      roleMap[roleName] = res.rows[0].id;
    }

    // 2. Users & User Roles & Profiles
    console.log('Seeding users and profiles...');
    
    // Core administrative / test accounts
    const coreUsers = [
      { username: '1111111111', password: 'owner67890', role: 'Owner', full_name: 'Chủ sở hữu 2' },
      { username: '2222222222', password: 'staff67890', role: 'Staff', full_name: 'Nhân viên 2', role_title: 'Lễ tân chính' },
      { username: '2222222223', password: 'staff67890', role: 'Staff', full_name: 'Trần Thị Lệ', role_title: 'Quản lý vận hành' },
      { username: '3333333333', password: 'pt67890123', role: 'PT', full_name: 'HLV cá nhân 2', bio: 'HLV Thể hình chuyên nghiệp, 5 năm kinh nghiệm.' },
      { username: '3333333334', password: 'pt67890123', role: 'PT', full_name: 'HLV Lê Hoàng Nam', bio: 'HLV Yoga, Pilates và Phục hồi chức năng.' }
    ];

    const userMap = {};
    const staffMap = {};
    const ptMap = {};
    const memberMap = {};

    for (const u of coreUsers) {
      const passwordHash = hashPassword(u.password);
      const userRes = await client.query('INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id', [u.username, passwordHash]);
      const userId = userRes.rows[0].id;
      userMap[u.username] = userId;

      await client.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)', [userId, roleMap[u.role]]);

      if (u.role === 'Staff') {
        const staffRes = await client.query(
          'INSERT INTO staff (user_id, full_name, role_title) VALUES ($1, $2, $3) RETURNING id',
          [userId, u.full_name, u.role_title]
        );
        staffMap[u.username] = staffRes.rows[0].id;
      } else if (u.role === 'PT') {
        const ptRes = await client.query(
          'INSERT INTO pt_profiles (user_id, full_name, bio) VALUES ($1, $2, $3) RETURNING id',
          [userId, u.full_name, u.bio]
        );
        ptMap[u.username] = ptRes.rows[0].id;
      }
    }

    // Additional Staff & PTs to enrich choices
    const extraStaff = [
      { username: '2222222224', password: 'staff67890', full_name: 'Phạm Minh Đức', role_title: 'Thu ngân' },
      { username: '2222222225', password: 'staff67890', full_name: 'Đặng Thùy Dương', role_title: 'Chăm sóc khách hàng' }
    ];
    for (const s of extraStaff) {
      const passwordHash = hashPassword(s.password);
      const userRes = await client.query('INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id', [s.username, passwordHash]);
      const userId = userRes.rows[0].id;
      userMap[s.username] = userId;
      await client.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)', [userId, roleMap['Staff']]);
      const staffRes = await client.query(
        'INSERT INTO staff (user_id, full_name, role_title) VALUES ($1, $2, $3) RETURNING id',
        [userId, s.full_name, s.role_title]
      );
      staffMap[s.username] = staffRes.rows[0].id;
    }

    const extraPTs = [
      { username: '3333333335', password: 'pt67890123', full_name: 'HLV Bùi Tiến Dũng', bio: 'Cựu vận động viên thể hình quốc gia, chuyên sâu Bulking và Cutting.' },
      { username: '3333333336', password: 'pt67890123', full_name: 'HLV Nguyễn Thị Thu', bio: 'Chuyên gia dinh dưỡng và giảm mỡ cho nữ văn phòng.' }
    ];
    for (const p of extraPTs) {
      const passwordHash = hashPassword(p.password);
      const userRes = await client.query('INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id', [p.username, passwordHash]);
      const userId = userRes.rows[0].id;
      userMap[p.username] = userId;
      await client.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)', [userId, roleMap['PT']]);
      const ptRes = await client.query(
        'INSERT INTO pt_profiles (user_id, full_name, bio) VALUES ($1, $2, $3) RETURNING id',
        [userId, p.full_name, p.bio]
      );
      ptMap[p.username] = ptRes.rows[0].id;
    }

    // Seed realistic members (active, pending, suspended, expired)
    const membersData = [
      // 1. Core Member (username: 4444444444)
      { username: '4444444444', password: 'member5678', full_name: 'Hội viên mới', dob: '1995-05-15', job: 'Nhân viên văn phòng', member_type: 'regular', status: 'active' },
      // 2. Core Member 2 (username: 4444444445)
      { username: '4444444445', password: 'member5678', full_name: 'Nguyễn Hải Nam', dob: '1990-12-20', job: 'Kỹ sư phần mềm', member_type: 'vip', status: 'active' },
      // 3. Regular active member
      { username: '4444444446', password: 'member5678', full_name: 'Trần Thị Hoa', dob: '1998-04-10', job: 'Kế toán', member_type: 'regular', status: 'active' },
      // 4. VIP active member
      { username: '4444444447', password: 'member5678', full_name: 'Lê Hoàng Anh', dob: '1988-09-22', job: 'Kinh doanh tự do', member_type: 'vip', status: 'active' },
      // 5. Suspended member
      { username: '4444444448', password: 'member5678', full_name: 'Vũ Tiến Dũng', dob: '1992-02-02', job: 'Thiết kế đồ họa', member_type: 'regular', status: 'suspended' },
      // 6. Pending verification (without user account yet)
      { username: '0987654321', password: null, full_name: 'Phạm Minh Tuấn', dob: '1987-08-08', job: 'Kinh doanh tự do', member_type: 'regular', status: 'pending' },
      // 7. Pending verification 2
      { username: '0987654322', password: null, full_name: 'Đỗ Thùy Chi', dob: '2001-11-12', job: 'Sinh viên', member_type: 'regular', status: 'pending' },
      // 8. Active member near expiration
      { username: '4444444449', password: 'member5678', full_name: 'Bùi Thị Mai', dob: '1996-07-30', job: 'Ngân hàng', member_type: 'regular', status: 'active' }
    ];

    for (const m of membersData) {
      let userId = null;
      if (m.password) {
        const passwordHash = hashPassword(m.password);
        const userRes = await client.query('INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id', [m.username, passwordHash]);
        userId = userRes.rows[0].id;
        userMap[m.username] = userId;
        await client.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)', [userId, roleMap['Member']]);
      }
      
      const memberRes = await client.query(
        'INSERT INTO members (user_id, full_name, phone, dob, job, member_type, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
        [userId, m.full_name, m.username, m.dob, m.job, m.member_type, m.status]
      );
      memberMap[m.username] = memberRes.rows[0].id;
    }

    // 3. Room Types & Rooms
    console.log('Seeding room types and rooms...');
    const roomTypeData = [
      { name: 'Phòng Gym', description: 'Khu vực tập gym chính với đầy đủ máy móc thiết bị' },
      { name: 'Phòng Yoga', description: 'Không gian yên tĩnh chuyên biệt cho các lớp Yoga và Pilates' },
      { name: 'Khu vực PT', description: 'Khu tập luyện 1-1 riêng tư với HLV cá nhân' },
      { name: 'Phòng Cardio', description: 'Khu máy chạy bộ, xe đạp và leo núi' }
    ];
    const roomTypeMap = {};
    for (const rt of roomTypeData) {
      const rtRes = await client.query(
        'INSERT INTO room_types (name, description) VALUES ($1, $2) RETURNING id',
        [rt.name, rt.description]
      );
      roomTypeMap[rt.name] = rtRes.rows[0].id;
    }

    const roomData = [
      { name: 'Phòng Gym A', room_type: 'Phòng Gym', capacity: 40 },
      { name: 'Phòng Yoga B', room_type: 'Phòng Yoga', capacity: 20 },
      { name: 'Phòng PT C', room_type: 'Khu vực PT', capacity: 10 },
      { name: 'Khu Cardio D', room_type: 'Phòng Cardio', capacity: 15 }
    ];
    const roomMap = {};
    for (const r of roomData) {
      const rRes = await client.query(
        'INSERT INTO rooms (room_type_id, name, capacity) VALUES ($1, $2, $3) RETURNING id',
        [roomTypeMap[r.room_type], r.name, r.capacity]
      );
      roomMap[r.name] = rRes.rows[0].id;
    }

    // 4. Equipment & Maintenance Logs
    console.log('Seeding equipment and maintenance logs...');
    const equipData = [
      { name: 'Máy chạy bộ Matrix T3x', quantity: 8, origin: 'USA', warranty_until: '2028-12-31' },
      { name: 'Giàn tạ đa năng Impulse', quantity: 2, origin: 'Taiwan', warranty_until: '2027-06-30' },
      { name: 'Tạ tay Iron Bull 15kg', quantity: 15, origin: 'Vietnam', warranty_until: '2029-01-01' },
      { name: 'Xe đạp thể thao Spin', quantity: 6, origin: 'China', warranty_until: '2026-04-15' }, // Expired warranty
      { name: 'Máy đi bộ trên không Orbitrack', quantity: 4, origin: 'Korea', warranty_until: '2027-09-15' },
      { name: 'Ghế đẩy ngực dốc ngang', quantity: 3, origin: 'Vietnam', warranty_until: '2030-01-01' },
      { name: 'Bóng tập Yoga đàn hồi', quantity: 20, origin: 'China', warranty_until: '2026-05-10' } // Expired warranty
    ];
    const equipMap = {};
    for (const e of equipData) {
      const eRes = await client.query(
        'INSERT INTO equipment (name, quantity, origin, warranty_until) VALUES ($1, $2, $3, $4) RETURNING id',
        [e.name, e.quantity, e.origin, e.warranty_until]
      );
      equipMap[e.name] = eRes.rows[0].id;
    }

    // Add open & resolved maintenance logs
    await client.query(
      'INSERT INTO maintenance_logs (equipment_id, note, status, created_at) VALUES ($1, $2, $3, NOW() - INTERVAL \'5 days\')',
      [equipMap['Máy chạy bộ Matrix T3x'], 'Cần bôi trơn băng tải và căn chỉnh lại thảm chạy.', 'open']
    );
    await client.query(
      'INSERT INTO maintenance_logs (equipment_id, note, status, created_at) VALUES ($1, $2, $3, NOW() - INTERVAL \'4 days\')',
      [equipMap['Xe đạp thể thao Spin'], 'Bàn đạp bên trái bị kẹt khi quay tốc độ cao.', 'open']
    );
    const resolvedLog = await client.query(
      'INSERT INTO maintenance_logs (equipment_id, note, status, created_at) VALUES ($1, $2, $3, NOW() - INTERVAL \'10 days\') RETURNING id',
      [equipMap['Giàn tạ đa năng Impulse'], 'Dây cáp tạ bị sờn, cần thay thế.', 'open']
    );
    await client.query(
      'UPDATE maintenance_logs SET status = \'resolved\' WHERE id = $1',
      [resolvedLog.rows[0].id]
    );

    // 5. Packages
    console.log('Seeding packages...');
    const packageData = [
      { name: 'Gói Member 1 Tháng', duration_days: 30, price: 500000, category: 'membership', session_count: 30, pt_session_count: 0, description: 'Gói tập luyện cơ bản trong 1 tháng (30 ngày, tối đa 30 buổi). Giá 500.000 VNĐ.' },
      { name: 'Gói Member VIP 3 Tháng', duration_days: 90, price: 1200000, category: 'membership', session_count: 90, pt_session_count: 0, description: 'Gói tập luyện VIP trong 3 tháng (90 ngày, tối đa 90 buổi). Giá 1.200.000 VNĐ.' },
      { name: 'Gói Member VIP 6 Tháng', duration_days: 180, price: 2200000, category: 'membership', session_count: 180, pt_session_count: 0, description: 'Gói tập luyện VIP trong 6 tháng (180 ngày, tối đa 180 buổi). Giá 2.200.000 VNĐ.' },
      { name: 'Gói Member VIP 12 Tháng', duration_days: 365, price: 4000000, category: 'membership', session_count: 365, pt_session_count: 0, description: 'Gói tập luyện VIP trong 12 tháng (365 ngày, tối đa 365 buổi). Giá 4.000.000 VNĐ.' },
      { name: 'Gói PT 10 Buổi', duration_days: 45, price: 3500000, category: 'pt', session_count: 0, pt_session_count: 10, description: 'Gói tập 1-1 với HLV cá nhân gồm 10 buổi tập. Thời hạn 45 ngày. Giá 3.500.000 VNĐ.' },
      { name: 'Gói PT 24 Buổi', duration_days: 90, price: 8000000, category: 'pt', session_count: 0, pt_session_count: 24, description: 'Gói tập 1-1 với HLV cá nhân gồm 24 buổi tập. Thời hạn 90 ngày. Giá 8.000.000 VNĐ.' },
      { name: 'Gói Combo VIP 6 Tháng', duration_days: 180, price: 15000000, category: 'combo', session_count: 180, pt_session_count: 50, description: 'Gói combo trọn gói tập luyện và 50 buổi PT cá nhân trong 6 tháng. Giá 15.000.000 VNĐ.' }
    ];

    const packageMap = {};
    for (const p of packageData) {
      const pRes = await client.query(
        'INSERT INTO packages (name, duration_days, price, category, session_count, pt_session_count, description) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
        [p.name, p.duration_days, p.price, p.category, p.session_count, p.pt_session_count, p.description]
      );
      packageMap[p.name] = pRes.rows[0].id;
    }

    // 6. Subscriptions, Payments & Invoices & PT assignments
    console.log('Seeding subscriptions, payments and invoices...');

    // Mapping memberships to subscriptions
    const activeSubs = [
      // Member 1 (4444444444) has active VIP 3-Month package
      { member: '4444444444', pkg: 'Gói Member VIP 3 Tháng', start: '2026-05-01', end: '2026-08-01', rem: 80, remPt: 0, status: 'active', amt: 1200000, method: 'Tiền mặt', daysAgo: 40 },
      // Member 2 (4444444445) has active Combo VIP 6-Month package
      { member: '4444444445', pkg: 'Gói Combo VIP 6 Tháng', start: '2026-06-01', end: '2026-11-28', rem: 172, remPt: 47, status: 'active', amt: 15000000, method: 'Chuyển khoản', daysAgo: 9 },
      // Member 3 (4444444446) has active Member 1-Month package
      { member: '4444444446', pkg: 'Gói Member 1 Tháng', start: '2026-05-25', end: '2026-06-24', rem: 24, remPt: 0, status: 'active', amt: 500000, method: 'Chuyển khoản', daysAgo: 16 },
      // Member 4 (4444444447) has active VIP 12-Month package
      { member: '4444444447', pkg: 'Gói Member VIP 12 Tháng', start: '2026-01-01', end: '2026-12-31', rem: 280, remPt: 0, status: 'active', amt: 4000000, method: 'Thẻ tín dụng', daysAgo: 160 },
      // Member 8 (4444444449) has near-expiry subscription ending tomorrow to trigger expiry scheduler alert
      { member: '4444444449', pkg: 'Gói Member 1 Tháng', start: '2026-05-11', end: '2026-06-11', rem: 1, remPt: 0, status: 'active', amt: 500000, method: 'Tiền mặt', daysAgo: 30 }
    ];

    for (const sub of activeSubs) {
      const subRes = await client.query(
        'INSERT INTO subscriptions (member_id, package_id, start_date, end_date, remaining_sessions, remaining_pt_sessions, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
        [memberMap[sub.member], packageMap[sub.pkg], sub.start, sub.end, sub.rem, sub.remPt, sub.status]
      );
      const subId = subRes.rows[0].id;

      const payRes = await client.query(
        'INSERT INTO payments (subscription_id, amount, method, status, paid_at) VALUES ($1, $2, $3, $4, NOW() - $5 * INTERVAL \'1 day\') RETURNING id',
        [subId, sub.amt, sub.method, 'paid', sub.daysAgo]
      );
      await client.query('INSERT INTO invoices (payment_id, issued_at) VALUES ($1, NOW() - $2 * INTERVAL \'1 day\')', [
        payRes.rows[0].id,
        sub.daysAgo
      ]);
    }

    // Expired subscription for history
    const expSubRes = await client.query(
      'INSERT INTO subscriptions (member_id, package_id, start_date, end_date, remaining_sessions, remaining_pt_sessions, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
      [memberMap['4444444446'], packageMap['Gói Member 1 Tháng'], '2026-04-01', '2026-05-01', 0, 0, 'expired']
    );
    const expPayRes = await client.query(
      'INSERT INTO payments (subscription_id, amount, method, status, paid_at) VALUES ($1, $2, $3, $4, NOW() - INTERVAL \'70 days\') RETURNING id',
      [expSubRes.rows[0].id, 500000, 'Tiền mặt', 'paid']
    );
    await client.query('INSERT INTO invoices (payment_id, issued_at) VALUES ($1, NOW() - INTERVAL \'70 days\')', [
      expPayRes.rows[0].id
    ]);

    // PT Assignment
    // PT 1 (3333333333) assigned to Member 2 (4444444445)
    await client.query(
      'INSERT INTO pt_assignments (pt_id, member_id, status) VALUES ($1, $2, $3)',
      [ptMap['3333333333'], memberMap['4444444445'], 'active']
    );
    // PT 2 (3333333334) assigned to Member 4 (4444444447)
    await client.query(
      'INSERT INTO pt_assignments (pt_id, member_id, status) VALUES ($1, $2, $3)',
      [ptMap['3333333334'], memberMap['4444444447'], 'active']
    );

    // 7. Check-ins (generate historical check-ins over the last 10 days to feed statistics charts)
    console.log('Seeding rich check-in history...');
    
    // Check-in details list
    const checkinHistory = [
      { member: '4444444444', method: 'fingerprint', pt: false, daysAgo: 10, rem: 90 },
      { member: '4444444444', method: 'fingerprint', pt: false, daysAgo: 9, rem: 89 },
      { member: '4444444444', method: 'fingerprint', pt: false, daysAgo: 8, rem: 88 },
      { member: '4444444444', method: 'fingerprint', pt: false, daysAgo: 7, rem: 87 },
      { member: '4444444444', method: 'fingerprint', pt: false, daysAgo: 6, rem: 86 },
      { member: '4444444444', method: 'fingerprint', pt: false, daysAgo: 5, rem: 85 },
      { member: '4444444444', method: 'fingerprint', pt: false, daysAgo: 4, rem: 84 },
      { member: '4444444444', method: 'fingerprint', pt: false, daysAgo: 3, rem: 83 },
      { member: '4444444444', method: 'fingerprint', pt: false, daysAgo: 2, rem: 81 },
      { member: '4444444444', method: 'fingerprint', pt: false, daysAgo: 1, rem: 80 },

      { member: '4444444445', method: 'card', pt: true, daysAgo: 8, rem: 180 },
      { member: '4444444445', method: 'card', pt: true, daysAgo: 6, rem: 178 },
      { member: '4444444445', method: 'card', pt: true, daysAgo: 4, rem: 176 },
      { member: '4444444445', method: 'card', pt: true, daysAgo: 2, rem: 174 },
      { member: '4444444445', method: 'card', pt: true, daysAgo: 1, rem: 172 },

      { member: '4444444446', method: 'card', pt: false, daysAgo: 9, rem: 30 },
      { member: '4444444446', method: 'card', pt: false, daysAgo: 7, rem: 28 },
      { member: '4444444446', method: 'card', pt: false, daysAgo: 5, rem: 26 },
      { member: '4444444446', method: 'card', pt: false, daysAgo: 2, rem: 25 },
      { member: '4444444446', method: 'card', pt: false, daysAgo: 1, rem: 24 },

      { member: '4444444447', method: 'fingerprint', pt: false, daysAgo: 10, rem: 290 },
      { member: '4444444447', method: 'fingerprint', pt: false, daysAgo: 8, rem: 288 },
      { member: '4444444447', method: 'fingerprint', pt: false, daysAgo: 5, rem: 285 },
      { member: '4444444447', method: 'fingerprint', pt: false, daysAgo: 2, rem: 282 },
      { member: '4444444447', method: 'fingerprint', pt: false, daysAgo: 1, rem: 280 }
    ];

    for (const c of checkinHistory) {
      await client.query(
        'INSERT INTO check_ins (member_id, check_in_at, method, with_pt, remaining_sessions_after) VALUES ($1, NOW() - $2 * INTERVAL \'1 day\', $3, $4, $5)',
        [memberMap[c.member], c.daysAgo, c.method, c.pt, c.rem]
      );
    }

    // 8. Staff Schedules & Performance Metrics
    console.log('Seeding staff schedules and metrics...');
    const staffSchedules = [
      { staff: '2222222222', offsetStart: 0, offsetEnd: 8, role: 'Lễ tân chính' },
      { staff: '2222222223', offsetStart: 4, offsetEnd: 12, role: 'Quản lý' },
      { staff: '2222222224', offsetStart: 8, offsetEnd: 16, role: 'Thu ngân' },
      { staff: '2222222225', offsetStart: 12, offsetEnd: 20, role: 'Chăm sóc khách hàng' }
    ];

    for (const s of staffSchedules) {
      await client.query(
        'INSERT INTO staff_schedules (staff_id, start_at, end_at, role, status) VALUES ($1, NOW() + $2 * INTERVAL \'1 hour\', NOW() + $3 * INTERVAL \'1 hour\', $4, \'active\')',
        [staffMap[s.staff], s.offsetStart, s.offsetEnd, s.role]
      );
    }

    // June Metrics
    await client.query(
      'INSERT INTO staff_performance_metrics (staff_id, period_start, period_end, metric_name, metric_value) VALUES ($1, $2, $3, $4, $5)',
      [staffMap['2222222222'], '2026-06-01', '2026-06-30', 'checkin_count', 45]
    );
    await client.query(
      'INSERT INTO staff_performance_metrics (staff_id, period_start, period_end, metric_name, metric_value) VALUES ($1, $2, $3, $4, $5)',
      [staffMap['2222222224'], '2026-06-01', '2026-06-30', 'payment_processed', 24]
    );

    // 9. PT Schedules & Workout Logs
    console.log('Seeding PT schedules & workout logs...');
    // PT 1 schedules (completed & upcoming)
    await client.query(
      'INSERT INTO pt_schedules (pt_id, member_id, start_at, end_at, workout_type, status) VALUES ($1, $2, NOW() + INTERVAL \'1 hour\', NOW() + INTERVAL \'2 hours\', $3, \'scheduled\')',
      [ptMap['3333333333'], memberMap['4444444445'], 'Luyện tập chân (Leg Day)']
    );
    await client.query(
      'INSERT INTO pt_schedules (pt_id, member_id, start_at, end_at, workout_type, status) VALUES ($1, $2, NOW() + INTERVAL \'1 day\', NOW() + INTERVAL \'1 day 1.5 hours\', $3, \'scheduled\')',
      [ptMap['3333333333'], memberMap['4444444445'], 'Luyện tập lưng (Back Day)']
    );
    await client.query(
      'INSERT INTO pt_schedules (pt_id, member_id, start_at, end_at, workout_type, status) VALUES ($1, $2, NOW() - INTERVAL \'1 day\', NOW() - INTERVAL \'22 hours\', $3, \'completed\')',
      [ptMap['3333333333'], memberMap['4444444445'], 'Luyện tập ngực (Chest Day)']
    );

    // PT 2 schedules
    await client.query(
      'INSERT INTO pt_schedules (pt_id, member_id, start_at, end_at, workout_type, status) VALUES ($1, $2, NOW() + INTERVAL \'3 hours\', NOW() + INTERVAL \'4 hours\', $3, \'scheduled\')',
      [ptMap['3333333334'], memberMap['4444444447'], 'Yoga bay & dẻo dai']
    );

    // Workout logs
    await client.query(
      'INSERT INTO workout_logs (member_id, pt_id, workout_date, duration_min, intensity, notes, rating) VALUES ($1, $2, CURRENT_DATE - 1, $3, $4, $5, $6)',
      [memberMap['4444444445'], ptMap['3333333333'], 60, 'High', 'Thực hiện squat 80kg tốt, hoàn thành đầy đủ giáo án.', 5]
    );
    await client.query(
      'INSERT INTO workout_logs (member_id, pt_id, workout_date, duration_min, intensity, notes, rating) VALUES ($1, $2, CURRENT_DATE - 3, $3, $4, $5, $6)',
      [memberMap['4444444445'], ptMap['3333333333'], 60, 'Medium', 'Thể lực hơi yếu, tập trung vào kỹ thuật đẩy ngực.', 4]
    );
    await client.query(
      'INSERT INTO workout_logs (member_id, pt_id, workout_date, duration_min, intensity, notes, rating) VALUES ($1, $2, CURRENT_DATE - 2, $3, $4, $5, $6)',
      [memberMap['4444444447'], ptMap['3333333334'], 45, 'Low', 'Tập thở và giữ thăng bằng tốt.', 5]
    );

    // 10. Feedback & Responses & Notifications
    console.log('Seeding user feedback entries...');
    
    const feedData = [
      { member: '4444444444', category: 'equipment', rating: 4, content: 'Máy chạy bộ phòng A hoạt động khá êm nhưng cần bôi trơn thảm chạy thường xuyên hơn.', status: 'new', replies: ['Cảm ơn đóng góp của bạn. Bộ phận kỹ thuật đang chuẩn bị bảo trì thảm chạy.'] },
      { member: '4444444445', category: 'room', rating: 5, content: 'Không gian phòng tập sạch sẽ, máy lạnh mát mẻ, phòng tắm có nước nóng rất thoải mái.', status: 'resolved', replies: ['Rất vui khi bạn hài lòng với dịch vụ. Chúng tôi sẽ cố gắng duy trì chất lượng tốt nhất.'] },
      { member: '4444444446', category: 'pt', rating: 5, content: 'HLV Lê Hoàng Nam hướng dẫn rất tận tình, bài tập thiết kế rất phù hợp với thể trạng của tôi.', status: 'new', replies: [] },
      { member: '4444444447', category: 'service', rating: 3, content: 'Giờ cao điểm chiều tối gửi xe hơi lâu, hi vọng phòng gym bổ sung thêm nhân viên dắt xe.', status: 'new', replies: [] }
    ];

    for (const f of feedData) {
      const feedRes = await client.query(
        'INSERT INTO feedback (member_id, category, rating, content, status, created_at) VALUES ($1, $2, $3, $4, $5, NOW() - INTERVAL \'1 day\') RETURNING id',
        [memberMap[f.member], f.category, f.rating, f.content, f.status]
      );
      const feedbackId = feedRes.rows[0].id;

      if (f.status === 'new') {
        await client.query(
          'INSERT INTO feedback_notifications (feedback_id, status) VALUES ($1, \'new\')',
          [feedbackId]
        );
      }

      for (const responseText of f.replies) {
        await client.query(
          'INSERT INTO feedback_responses (feedback_id, staff_id, response, created_at) VALUES ($1, $2, $3, NOW() - INTERVAL \'12 hours\')',
          [feedbackId, staffMap['2222222222'], responseText]
        );
      }
    }

    // 11. Member Notifications
    console.log('Seeding member notifications...');
    await client.query(
      'INSERT INTO member_notifications (member_id, icon, message, read, created_at) VALUES ($1, $2, $3, $4, NOW() - INTERVAL \'9 days\')',
      [memberMap['4444444444'], '🎉', 'Chúc mừng bạn đã kích hoạt thành công Gói Member VIP 3 Tháng.', true]
    );
    await client.query(
      'INSERT INTO member_notifications (member_id, icon, message, read, created_at) VALUES ($1, $2, $3, $4, NOW() - INTERVAL \'1 day\')',
      [memberMap['4444444445'], '📅', 'Bạn có lịch tập cá nhân với HLV vào ngày mai lúc 09:00.', false]
    );

    // 12. Audit Logs
    console.log('Seeding audit logs...');
    await client.query(
      'INSERT INTO audit_logs (user_id, action, details, created_at) VALUES ($1, $2, $3, NOW() - INTERVAL \'2 hours\')',
      [userMap['1111111111'], 'login', JSON.stringify({ role: 'owner' })]
    );
    await client.query(
      'INSERT INTO audit_logs (user_id, action, details, created_at) VALUES ($1, $2, $3, NOW() - INTERVAL \'1 hour\')',
      [userMap['2222222222'], 'login', JSON.stringify({ role: 'staff' })]
    );
    await client.query(
      'INSERT INTO audit_logs (user_id, action, details, created_at) VALUES ($1, $2, $3, NOW() - INTERVAL \'30 minutes\')',
      [userMap['2222222223'], 'create_member', JSON.stringify({ member_phone: '4444444449', name: 'Bùi Thị Mai' })]
    );

    await client.query('COMMIT');
    console.log('Database seeded with a massive set of rich, meaningful mock data successfully!');
  } catch (err) {
    console.error('Error seeding database:', err);
    await client.query('ROLLBACK').catch(() => {});
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
