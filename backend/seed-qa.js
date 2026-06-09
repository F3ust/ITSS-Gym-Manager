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
  console.log('Connecting to database for seeding...');
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
    const userSeedData = [
      {
        username: '1111111111',
        password: 'owner67890',
        role: 'Owner',
        full_name: 'Chủ sở hữu 2',
      },
      {
        username: '2222222222',
        password: 'staff67890',
        role: 'Staff',
        full_name: 'Nhân viên 2',
        role_title: 'Lễ tân',
      },
      {
        username: '2222222223',
        password: 'staff67890',
        role: 'Staff',
        full_name: 'Trần Thị Lệ',
        role_title: 'Quản lý',
      },
      {
        username: '3333333333',
        password: 'pt67890123',
        role: 'PT',
        full_name: 'HLV cá nhân 2',
        bio: 'Chuyên gia huấn luyện thể hình và tăng cơ giảm mỡ với 5 năm kinh nghiệm.',
      },
      {
        username: '3333333334',
        password: 'pt67890123',
        role: 'PT',
        full_name: 'HLV Lê Hoàng Nam',
        bio: 'Chuyên gia Yoga, Pilates và phục hồi chức năng sau chấn thương.',
      },
      {
        username: '4444444444',
        password: 'member5678',
        role: 'Member',
        full_name: 'Hội viên mới',
        dob: '1995-05-15',
        job: 'Nhân viên văn phòng',
        member_type: 'regular',
        status: 'active',
      },
      {
        username: '4444444445',
        password: 'member5678',
        role: 'Member',
        full_name: 'Nguyễn Hải Nam',
        dob: '1990-12-20',
        job: 'Kỹ sư phần mềm',
        member_type: 'vip',
        status: 'active',
      },
    ];

    const userMap = {};
    const staffMap = {};
    const ptMap = {};
    const memberMap = {};

    for (const u of userSeedData) {
      const passwordHash = hashPassword(u.password);
      const userRes = await client.query(
        'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id',
        [u.username, passwordHash]
      );
      const userId = userRes.rows[0].id;
      userMap[u.username] = userId;

      // Assign role
      await client.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)', [userId, roleMap[u.role]]);

      // Create profile
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
      } else if (u.role === 'Member') {
        const memberRes = await client.query(
          'INSERT INTO members (user_id, full_name, phone, dob, job, member_type, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
          [userId, u.full_name, u.username, u.dob, u.job, u.member_type, u.status]
        );
        memberMap[u.username] = memberRes.rows[0].id;
      }
    }

    // Also seed a pending member who doesn't have a user account yet (walk-in pending verification)
    const pendingMemberRes = await client.query(
      'INSERT INTO members (full_name, phone, dob, job, member_type, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      ['Phạm Minh Tuấn', '0987654321', '1988-08-08', 'Kinh doanh tự do', 'regular', 'pending']
    );
    memberMap['0987654321'] = pendingMemberRes.rows[0].id;

    // 3. Room Types & Rooms
    console.log('Seeding room types and rooms...');
    const roomTypeData = [
      { name: 'Phòng Gym', description: 'Khu vực tập gym chính với đầy đủ máy móc thiết bị' },
      { name: 'Phòng Yoga', description: 'Không gian yên tĩnh chuyên biệt cho các lớp Yoga và Pilates' },
      { name: 'Khu vực PT', description: 'Khu tập luyện 1-1 riêng tư với HLV cá nhân' },
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
      { name: 'Tạ tay Iron Bull 15kg', quantity: 10, origin: 'Vietnam', warranty_until: '2029-01-01' },
      { name: 'Xe đạp thể thao Spin', quantity: 6, origin: 'China', warranty_until: '2026-04-15' }, // Expired warranty
    ];
    const equipMap = {};
    for (const e of equipData) {
      const eRes = await client.query(
        'INSERT INTO equipment (name, quantity, origin, warranty_until) VALUES ($1, $2, $3, $4) RETURNING id',
        [e.name, e.quantity, e.origin, e.warranty_until]
      );
      equipMap[e.name] = eRes.rows[0].id;
    }

    // Open maintenance log for the treadmill
    await client.query(
      'INSERT INTO maintenance_logs (equipment_id, note, status, created_at) VALUES ($1, $2, $3, NOW() - INTERVAL \'2 days\')',
      [equipMap['Máy chạy bộ Matrix T3x'], 'Cần bôi trơn băng tải và căn chỉnh lại thảm chạy.', 'open']
    );

    // 5. Packages
    console.log('Seeding packages...');
    const packageData = [
      {
        name: 'Gói Member 1 Tháng',
        duration_days: 30,
        price: 500000,
        category: 'membership',
        session_count: 30,
        pt_session_count: 0,
        description: 'Gói tập luyện cơ bản trong 1 tháng (30 ngày, tối đa 30 buổi). Giá 500.000 VNĐ.',
      },
      {
        name: 'Gói Member VIP 3 Tháng',
        duration_days: 90,
        price: 1200000,
        category: 'membership',
        session_count: 90,
        pt_session_count: 0,
        description: 'Gói tập luyện VIP trong 3 tháng (90 ngày, tối đa 90 buổi). Giá 1.200.000 VNĐ.',
      },
      {
        name: 'Gói PT 24 Buổi',
        duration_days: 90,
        price: 8000000,
        category: 'pt',
        session_count: 0,
        pt_session_count: 24,
        description: 'Gói tập 1-1 với HLV cá nhân trong 90 ngày (tối đa 24 buổi PT). Giá 8.000.000 VNĐ.',
      },
      {
        name: 'Gói Combo VIP 6 Tháng',
        duration_days: 180,
        price: 15000000,
        category: 'combo',
        session_count: 180,
        pt_session_count: 50,
        description: 'Gói combo trọn gói tập luyện và PT cá nhân trong 6 tháng. Giá 15.000.000 VNĐ.',
      },
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
    console.log('Seeding subscriptions and invoices...');
    // Member 1 (4444444444) has an active VIP 3-Month package
    const sub1Res = await client.query(
      'INSERT INTO subscriptions (member_id, package_id, start_date, end_date, remaining_sessions, remaining_pt_sessions, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
      [
        memberMap['4444444444'],
        packageMap['Gói Member VIP 3 Tháng'],
        '2026-05-01',
        '2026-08-01',
        80, // remaining of 90
        0,
        'active',
      ]
    );
    const sub1Id = sub1Res.rows[0].id;

    const pay1Res = await client.query(
      'INSERT INTO payments (subscription_id, amount, method, status, paid_at) VALUES ($1, $2, $3, $4, NOW() - INTERVAL \'40 days\') RETURNING id',
      [sub1Id, 1200000, 'Tiền mặt', 'paid']
    );
    await client.query('INSERT INTO invoices (payment_id, issued_at) VALUES ($1, NOW() - INTERVAL \'40 days\')', [
      pay1Res.rows[0].id,
    ]);

    // Member 2 (4444444445) has active Combo VIP 6-Month package
    const sub2Res = await client.query(
      'INSERT INTO subscriptions (member_id, package_id, start_date, end_date, remaining_sessions, remaining_pt_sessions, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
      [
        memberMap['4444444445'],
        packageMap['Gói Combo VIP 6 Tháng'],
        '2026-06-01',
        '2026-11-28',
        175, // remaining of 180
        48, // remaining of 50
        'active',
      ]
    );
    const sub2Id = sub2Res.rows[0].id;

    const pay2Res = await client.query(
      'INSERT INTO payments (subscription_id, amount, method, status, paid_at) VALUES ($1, $2, $3, $4, NOW() - INTERVAL \'9 days\') RETURNING id',
      [sub2Id, 15000000, 'Chuyển khoản', 'paid']
    );
    await client.query('INSERT INTO invoices (payment_id, issued_at) VALUES ($1, NOW() - INTERVAL \'9 days\')', [
      pay2Res.rows[0].id,
    ]);

    // PT Assignment: PT 1 assigned to Member 2
    await client.query(
      'INSERT INTO pt_assignments (pt_id, member_id, status) VALUES ($1, $2, $3)',
      [ptMap['3333333333'], memberMap['4444444445'], 'active']
    );

    // 7. Check-ins
    console.log('Seeding check-ins...');
    // Member 1 check-ins
    await client.query(
      'INSERT INTO check_ins (member_id, check_in_at, method, with_pt, remaining_sessions_after) VALUES ($1, NOW() - INTERVAL \'2 days\', $2, $3, $4)',
      [memberMap['4444444444'], 'fingerprint', false, 81]
    );
    await client.query(
      'INSERT INTO check_ins (member_id, check_in_at, method, with_pt, remaining_sessions_after) VALUES ($1, NOW() - INTERVAL \'1 day\', $2, $3, $4)',
      [memberMap['4444444444'], 'fingerprint', false, 80]
    );

    // Member 2 check-ins
    await client.query(
      'INSERT INTO check_ins (member_id, check_in_at, method, with_pt, remaining_sessions_after) VALUES ($1, NOW() - INTERVAL \'2 days\', $2, $3, $4)',
      [memberMap['4444444445'], 'card', true, 176]
    );
    await client.query(
      'INSERT INTO check_ins (member_id, check_in_at, method, with_pt, remaining_sessions_after) VALUES ($1, NOW() - INTERVAL \'1 day\', $2, $3, $4)',
      [memberMap['4444444445'], 'card', true, 175]
    );

    // 8. Staff Schedules & Performance Metrics
    console.log('Seeding staff schedules...');
    await client.query(
      'INSERT INTO staff_schedules (staff_id, start_at, end_at, role, status) VALUES ($1, NOW(), NOW() + INTERVAL \'8 hours\', $2, $3)',
      [staffMap['2222222222'], 'Lễ tân', 'active']
    );
    await client.query(
      'INSERT INTO staff_schedules (staff_id, start_at, end_at, role, status) VALUES ($1, NOW() + INTERVAL \'5 hours\', NOW() + INTERVAL \'13 hours\', $2, $3)',
      [staffMap['2222222223'], 'Quản lý', 'active']
    );

    await client.query(
      'INSERT INTO staff_performance_metrics (staff_id, period_start, period_end, metric_name, metric_value) VALUES ($1, $2, $3, $4, $5)',
      [staffMap['2222222222'], '2026-06-01', '2026-06-30', 'checkin_count', 45]
    );

    // 9. PT Schedules & Workout Logs
    console.log('Seeding PT schedules & workout logs...');
    // PT 1 scheduled with Member 2 today
    await client.query(
      'INSERT INTO pt_schedules (pt_id, member_id, start_at, end_at, workout_type, status) VALUES ($1, $2, NOW() + INTERVAL \'1 hour\', NOW() + INTERVAL \'2 hours\', $3, $4)',
      [ptMap['3333333333'], memberMap['4444444445'], 'Luyện tập chân (Leg Day)', 'scheduled']
    );
    // PT 1 scheduled with Member 2 yesterday
    const prevSchedRes = await client.query(
      'INSERT INTO pt_schedules (pt_id, member_id, start_at, end_at, workout_type, status) VALUES ($1, $2, NOW() - INTERVAL \'1 day\', NOW() - INTERVAL \'22 hours\', $3, $4) RETURNING id',
      [ptMap['3333333333'], memberMap['4444444445'], 'Luyện tập ngực (Chest Day)', 'completed']
    );

    // Workout log for yesterday
    await client.query(
      'INSERT INTO workout_logs (member_id, pt_id, workout_date, duration_min, intensity, notes, rating) VALUES ($1, $2, CURRENT_DATE - 1, $3, $4, $5, $6)',
      [memberMap['4444444445'], ptMap['3333333333'], 60, 'High', 'Thực hiện tốt các bài squat và lunges. Thể lực cải thiện tốt.', 5]
    );

    // 10. Feedback & Responses & Notifications
    console.log('Seeding feedback and feedback replies...');
    const feedbackRes = await client.query(
      'INSERT INTO feedback (member_id, category, rating, content, status, created_at) VALUES ($1, $2, $3, $4, $5, NOW() - INTERVAL \'1 day\') RETURNING id',
      [
        memberMap['4444444444'],
        'equipment',
        4,
        'Máy chạy bộ phòng A hoạt động khá êm nhưng cần bôi trơn thảm chạy thường xuyên hơn.',
        'new',
      ]
    );
    const feedbackId = feedbackRes.rows[0].id;

    // Create feedback notification
    await client.query(
      'INSERT INTO feedback_notifications (feedback_id, status) VALUES ($1, $2)',
      [feedbackId, 'new']
    );

    // Staff 1 replied to this feedback
    await client.query(
      'INSERT INTO feedback_responses (feedback_id, staff_id, response, created_at) VALUES ($1, $2, $3, NOW() - INTERVAL \'12 hours\')',
      [feedbackId, staffMap['2222222222'], 'Cảm ơn đóng góp của bạn. Bộ phận kỹ thuật đang chuẩn bị bảo trì thảm chạy.']
    );

    // 11. Member Notifications
    console.log('Seeding member notifications...');
    await client.query(
      'INSERT INTO member_notifications (member_id, icon, message, read, created_at) VALUES ($1, $2, $3, $4, NOW() - INTERVAL \'9 days\')',
      [memberMap['4444444444'], '🎉', 'Chúc mừng bạn đã kích hoạt thành công Gói Member VIP 3 Tháng.', true]
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

    await client.query('COMMIT');
    console.log('Database seeded with rich, meaningful mock data successfully!');
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
