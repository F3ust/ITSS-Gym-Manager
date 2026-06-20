import { Router } from 'express'
import { randomBytes, scryptSync } from 'crypto'
import pool from '../db/pool'
import { query } from '../db/query'
import { requireRole } from '../middlewares/auth-middleware'

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

const router = Router()

router.post('/', requireRole(['Owner']), async (req, res, next) => {
  const client = await pool.connect()
  try {
    const { fullName, bio, username, password } = req.body
    if (!fullName || !username || !password) {
      return res.status(400).json({ code: 'ERR_VALIDATION', message: 'Full name, username, and password are required' })
    }
    if (!/^\d{10}$/.test(username)) {
      return res.status(400).json({ code: 'ERR_VALIDATION', message: 'Username must be 10 digits' })
    }
    if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
      return res.status(400).json({ code: 'ERR_VALIDATION', message: 'Password must be 8+ chars with letters and numbers' })
    }
    const existing = await query('SELECT id FROM users WHERE username = $1', [username])
    if (existing.rows[0]) {
      return res.status(409).json({ code: 'ERR_DUPLICATE', message: 'Username already exists' })
    }
    await client.query('BEGIN')
    const hashed = hashPassword(password)
    const userResult = await client.query(
      'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id',
      [username, hashed]
    )
    const userId = userResult.rows[0].id
    let roleId = (await client.query("SELECT id FROM roles WHERE name = 'PT'")).rows[0]?.id
    if (!roleId) {
      roleId = (await client.query("INSERT INTO roles (name) VALUES ('PT') RETURNING id")).rows[0].id
    }
    await client.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)', [userId, roleId])
    const ptResult = await client.query(
      'INSERT INTO pt_profiles (user_id, full_name, bio) VALUES ($1, $2, $3) RETURNING *',
      [userId, fullName, bio || null]
    )
    await client.query('COMMIT')
    res.status(201).json(ptResult.rows[0])
  } catch (err) {
    try { await client.query('ROLLBACK') } catch { /* */ }
    next({ status: 500, code: 'ERR_PT_CREATE', message: 'Failed to create PT', details: { error: String(err) } })
  } finally {
    client.release()
  }
})

router.get('/profiles', async (_req, res, next) => {
  try {
    const result = await query('SELECT id, full_name, bio FROM pt_profiles ORDER BY full_name ASC')
    res.json(result.rows)
  } catch (err) {
    next({ status: 500, code: 'ERR_PT_PROFILE_LIST', message: 'Failed to list PT profiles', details: { error: String(err) } })
  }
})

router.get('/profile', async (req, res, next) => {
  try {
    const userId = String(req.query.userId || '').trim()
    if (!userId) {
      return res.status(400).json({ code: 'ERR_VALIDATION', message: 'userId is required' })
    }
    const result = await query('SELECT id, full_name, bio, user_id FROM pt_profiles WHERE user_id = $1', [userId])
    if (!result.rows[0]) {
      return res.status(404).json({ code: 'ERR_NOT_FOUND', message: 'PT profile not found' })
    }
    res.json(result.rows[0])
  } catch (err) {
    next({ status: 500, code: 'ERR_PT_PROFILE_GET', message: 'Failed to fetch PT profile', details: { error: String(err) } })
  }
})

router.get('/assignments/:id', async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM pt_assignments WHERE id = $1', [req.params.id])
    if (!result.rows[0]) {
      return res.status(404).json({ code: 'ERR_NOT_FOUND', message: 'Assignment not found' })
    }
    res.json(result.rows[0])
  } catch (err) {
    next({ status: 500, code: 'ERR_PT_ASSIGN_GET', message: 'Failed to fetch assignment', details: { error: String(err) } })
  }
})

router.delete('/assignments/:id', async (req, res, next) => {
  try {
    const result = await query('DELETE FROM pt_assignments WHERE id = $1 RETURNING *', [req.params.id])
    if (!result.rows[0]) {
      return res.status(404).json({ code: 'ERR_NOT_FOUND', message: 'Assignment not found' })
    }
    res.json(result.rows[0])
  } catch (err) {
    next({ status: 500, code: 'ERR_PT_ASSIGN_DELETE', message: 'Failed to delete assignment', details: { error: String(err) } })
  }
})

router.get('/assignments', async (req, res, next) => {
  try {
    const ptId = String(req.query.ptId || '').trim()
    const sql = `
      SELECT pa.*, m.full_name AS member_name, m.phone AS member_phone 
      FROM pt_assignments pa 
      LEFT JOIN members m ON m.id = pa.member_id
    `
    const result = ptId
      ? await query(sql + ' WHERE pa.pt_id = $1 ORDER BY pa.id', [ptId])
      : await query(sql + ' ORDER BY pa.id')
    res.json(result.rows)
  } catch (err) {
    next({ status: 500, code: 'ERR_PT_ASSIGN_LIST', message: 'Failed to list assignments', details: { error: String(err) } })
  }
})

router.post('/assignments', async (req, res, next) => {
  const client = await pool.connect()
  try {
    const { ptId, memberId } = req.body
    if (!ptId || !memberId) {
      return res.status(400).json({ code: 'ERR_VALIDATION', message: 'Missing required fields' })
    }
    await client.query('BEGIN')
    await client.query(
      "UPDATE pt_assignments SET status = 'inactive' WHERE member_id = $1 AND status = 'active'",
      [memberId]
    )
    const result = await client.query(
      "INSERT INTO pt_assignments (pt_id, member_id, status) VALUES ($1,$2,'active') RETURNING *",
      [ptId, memberId]
    )
    await client.query('COMMIT')
    res.status(201).json(result.rows[0])
  } catch (err) {
    try { await client.query('ROLLBACK') } catch { /* */ }
    next({ status: 500, code: 'ERR_PT_ASSIGN_CREATE', message: 'Failed to create assignment', details: { error: String(err) } })
  } finally {
    client.release()
  }
})


router.get('/schedules/:id', async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM pt_schedules WHERE id = $1', [req.params.id])
    if (!result.rows[0]) {
      return res.status(404).json({ code: 'ERR_NOT_FOUND', message: 'Schedule not found' })
    }
    res.json(result.rows[0])
  } catch (err) {
    next({ status: 500, code: 'ERR_PT_SCHEDULE_GET', message: 'Failed to fetch schedule', details: { error: String(err) } })
  }
})

router.get('/schedules', async (req, res, next) => {
  try {
    const date = String(req.query.date || '').trim()
    const ptId = String(req.query.ptId || '').trim()
    let sql = 'SELECT ps.*, m.full_name AS member_name FROM pt_schedules ps LEFT JOIN members m ON m.id = ps.member_id'
    const params: string[] = []
    const clauses: string[] = []
    if (date) { params.push(date); clauses.push(`ps.start_at::date = $${params.length}`) }
    if (ptId) { params.push(ptId); clauses.push(`ps.pt_id = $${params.length}`) }
    if (clauses.length) sql += ' WHERE ' + clauses.join(' AND ')
    sql += ' ORDER BY ps.start_at ASC'
    const result = await query(sql, params)
    res.json(result.rows)
  } catch (err) {
    next({ status: 500, code: 'ERR_PT_SCHEDULE_LIST', message: 'Failed to list schedules', details: { error: String(err) } })
  }
})

router.post('/schedules', async (req, res, next) => {
  try {
    const { ptId, memberId, startAt, endAt, workoutType } = req.body
    if (!ptId || !memberId || !startAt || !endAt || !workoutType) {
      return res.status(400).json({ code: 'ERR_VALIDATION', message: 'Missing required fields' })
    }
    const conflict = await pool.query(
      'SELECT 1 FROM pt_schedules WHERE (pt_id = $1 OR member_id = $2) AND start_at < $4 AND end_at > $3 LIMIT 1',
      [ptId, memberId, startAt, endAt]
    )
    if (conflict.rows[0]) {
      return res.status(409).json({ code: 'ERR_SCHEDULE_CONFLICT', message: 'Schedule conflict' })
    }
    const result = await query(
      'INSERT INTO pt_schedules (pt_id, member_id, start_at, end_at, workout_type) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [ptId, memberId, startAt, endAt, workoutType]
    )
    res.status(201).json(result.rows[0])
    query(
      'INSERT INTO member_notifications (member_id, icon, message) VALUES ($1, $2, $3)',
      [memberId, '📅', `PT đã thêm lịch tập mới cho bạn vào ${new Date(startAt).toLocaleString('vi-VN')}`]
    ).catch((err: unknown) => console.error('Failed to create schedule notification:', err))
  } catch (err) {
    next({ status: 500, code: 'ERR_PT_SCHEDULE_CREATE', message: 'Failed to create schedule', details: { error: String(err) } })
  }
})

router.patch('/schedules/:id', async (req, res, next) => {
  try {
    const { startAt, endAt, workoutType, status } = req.body
    const existing = await query('SELECT * FROM pt_schedules WHERE id = $1', [req.params.id])
    if (!existing.rows[0]) {
      return res.status(404).json({ code: 'ERR_NOT_FOUND', message: 'Schedule not found' })
    }
    const schedule = existing.rows[0] as {
      start_at: string
      end_at: string
      pt_id: string
      member_id: string
    }
    const newStart = startAt || schedule.start_at
    const newEnd = endAt || schedule.end_at
    const conflict = await pool.query(
      'SELECT 1 FROM pt_schedules WHERE id <> $1 AND (pt_id = $2 OR member_id = $3) AND start_at < $5 AND end_at > $4 LIMIT 1',
      [req.params.id, schedule.pt_id, schedule.member_id, newStart, newEnd]
    )
    if (conflict.rows[0]) {
      return res.status(409).json({ code: 'ERR_SCHEDULE_CONFLICT', message: 'Schedule conflict' })
    }
    const result = await query(
      'UPDATE pt_schedules SET start_at = COALESCE($1,start_at), end_at = COALESCE($2,end_at), workout_type = COALESCE($3,workout_type), status = COALESCE($4,status) WHERE id = $5 RETURNING *',
      [startAt || null, endAt || null, workoutType || null, status || null, req.params.id]
    )
    res.json(result.rows[0])
  } catch (err) {
    next({ status: 500, code: 'ERR_PT_SCHEDULE_UPDATE', message: 'Failed to update schedule', details: { error: String(err) } })
  }
})

router.delete('/schedules/:id', async (req, res, next) => {
  try {
    const result = await query('DELETE FROM pt_schedules WHERE id = $1 RETURNING *', [req.params.id])
    if (!result.rows[0]) {
      return res.status(404).json({ code: 'ERR_NOT_FOUND', message: 'Schedule not found' })
    }
    res.json(result.rows[0])
  } catch (err) {
    next({ status: 500, code: 'ERR_PT_SCHEDULE_DELETE', message: 'Failed to delete schedule', details: { error: String(err) } })
  }
})

router.post('/workouts', async (req, res, next) => {
  try {
    const { memberId, ptId, workoutDate, durationMin, intensity, notes, rating } = req.body
    if (!memberId || !workoutDate || !durationMin) {
      return res.status(400).json({ code: 'ERR_VALIDATION', message: 'Missing required fields' })
    }
    const result = await query(
      'INSERT INTO workout_logs (member_id, pt_id, workout_date, duration_min, intensity, notes, rating) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [memberId, ptId || null, workoutDate, durationMin, intensity || null, notes || null, rating || null]
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    next({ status: 500, code: 'ERR_PT_WORKOUT_CREATE', message: 'Failed to create workout', details: { error: String(err) } })
  }
})

router.get('/workouts/:id', async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM workout_logs WHERE id = $1', [req.params.id])
    if (!result.rows[0]) {
      return res.status(404).json({ code: 'ERR_NOT_FOUND', message: 'Workout not found' })
    }
    res.json(result.rows[0])
  } catch (err) {
    next({ status: 500, code: 'ERR_PT_WORKOUT_GET', message: 'Failed to fetch workout', details: { error: String(err) } })
  }
})

router.delete('/workouts/:id', async (req, res, next) => {
  try {
    const result = await query('DELETE FROM workout_logs WHERE id = $1 RETURNING *', [req.params.id])
    if (!result.rows[0]) {
      return res.status(404).json({ code: 'ERR_NOT_FOUND', message: 'Workout not found' })
    }
    res.json(result.rows[0])
  } catch (err) {
    next({ status: 500, code: 'ERR_PT_WORKOUT_DELETE', message: 'Failed to delete workout', details: { error: String(err) } })
  }
})

router.patch('/workouts/:id', async (req, res, next) => {
  try {
    const { memberId, workoutDate, durationMin, intensity, notes, rating } = req.body
    const existing = await query('SELECT * FROM workout_logs WHERE id = $1', [req.params.id])
    if (!existing.rows[0]) {
      return res.status(404).json({ code: 'ERR_NOT_FOUND', message: 'Workout not found' })
    }
    const current = existing.rows[0]
    const result = await query(
      `UPDATE workout_logs SET member_id = COALESCE($1,member_id), workout_date = COALESCE($2,workout_date), duration_min = COALESCE($3,duration_min), intensity = COALESCE($4,intensity), notes = COALESCE($5,notes), rating = COALESCE($6,rating) WHERE id = $7 RETURNING *`,
      [
        memberId || current.member_id,
        workoutDate || current.workout_date,
        durationMin != null ? durationMin : current.duration_min,
        intensity !== undefined ? intensity : current.intensity,
        notes !== undefined ? notes : current.notes,
        rating !== undefined ? rating : current.rating,
        req.params.id,
      ]
    )
    res.json(result.rows[0])
  } catch (err) {
    next({ status: 500, code: 'ERR_PT_WORKOUT_UPDATE', message: 'Failed to update workout', details: { error: String(err) } })
  }
})

router.get('/workouts', async (req, res, next) => {
  try {
    const memberId = String(req.query.memberId || '').trim()
    const ptId = String(req.query.ptId || '').trim()
    let sql = 'SELECT * FROM workout_logs'
    const params: string[] = []
    const clauses: string[] = []
    if (memberId) { params.push(memberId); clauses.push(`member_id = $${params.length}`) }
    if (ptId) { params.push(ptId); clauses.push(`pt_id = $${params.length}`) }
    if (clauses.length) sql += ' WHERE ' + clauses.join(' AND ')
    sql += ' ORDER BY workout_date DESC'
    const result = await query(sql, params)
    res.json(result.rows)
  } catch (err) {
    next({ status: 500, code: 'ERR_PT_WORKOUT_LIST', message: 'Failed to list workouts', details: { error: String(err) } })
  }
})

export default router
