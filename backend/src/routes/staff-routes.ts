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

// Specific paths before parameterized routes
router.get('/schedules', requireRole(['Owner']), async (_req, res, next) => {
  try {
    const result = await query('SELECT * FROM staff_schedules ORDER BY start_at DESC')
    res.json(result.rows)
  } catch (err) {
    next({ status: 500, code: 'ERR_STAFF_SCHEDULE_LIST', message: 'Failed to list staff schedules', details: { error: String(err) } })
  }
})

router.post('/schedules', requireRole(['Owner']), async (req, res, next) => {
  try {
    const { staffId, startAt, endAt, role, status } = req.body
    if (!staffId || !startAt || !endAt || !role) {
      return res.status(400).json({ code: 'ERR_VALIDATION', message: 'Missing required fields' })
    }
    const result = await query(
      'INSERT INTO staff_schedules (staff_id, start_at, end_at, role, status) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [staffId, startAt, endAt, role, status || 'active']
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    next({ status: 500, code: 'ERR_STAFF_SCHEDULE_CREATE', message: 'Failed to create staff schedule', details: { error: String(err) } })
  }
})

router.patch('/schedules/:id', requireRole(['Owner']), async (req, res, next) => {
  try {
    const { startAt, endAt, role, status } = req.body
    const result = await query(
      'UPDATE staff_schedules SET start_at = COALESCE($1,start_at), end_at = COALESCE($2,end_at), role = COALESCE($3,role), status = COALESCE($4,status) WHERE id = $5 RETURNING *',
      [startAt || null, endAt || null, role || null, status || null, req.params.id]
    )
    if (!result.rows[0]) {
      return res.status(404).json({ code: 'ERR_NOT_FOUND', message: 'Schedule not found' })
    }
    res.json(result.rows[0])
  } catch (err) {
    next({ status: 500, code: 'ERR_STAFF_SCHEDULE_UPDATE', message: 'Failed to update staff schedule', details: { error: String(err) } })
  }
})

router.delete('/schedules/:id', requireRole(['Owner']), async (req, res, next) => {
  try {
    const result = await query('DELETE FROM staff_schedules WHERE id = $1 RETURNING *', [req.params.id as string])
    if (!result.rows[0]) {
      return res.status(404).json({ code: 'ERR_NOT_FOUND', message: 'Schedule not found' })
    }
    res.json(result.rows[0])
  } catch (err) {
    next({ status: 500, code: 'ERR_STAFF_SCHEDULE_DELETE', message: 'Failed to delete staff schedule', details: { error: String(err) } })
  }
})

router.get('/performance', requireRole(['Owner']), async (req, res, next) => {
  try {
    const { from, to } = req.query
    if (!from || !to) {
      return res.status(400).json({ code: 'ERR_VALIDATION', message: 'Missing from/to' })
    }
    const result = await query(
      'SELECT * FROM staff_performance_metrics WHERE period_start >= $1 AND period_end <= $2 ORDER BY period_start DESC',
      [String(from), String(to)]
    )
    res.json(result.rows)
  } catch (err) {
    next({ status: 500, code: 'ERR_STAFF_PERF_LIST', message: 'Failed to list staff performance', details: { error: String(err) } })
  }
})

// Parameterized routes (must come after specific paths)
router.get('/', async (_req, res, next) => {
  try {
    const result = await query('SELECT * FROM staff ORDER BY created_at DESC')
    res.json(result.rows)
  } catch (err) {
    next({ status: 500, code: 'ERR_STAFF_LIST', message: 'Failed to list staff', details: { error: String(err) } })
  }
})

router.get('/:id', async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM staff WHERE id = $1', [req.params.id])
    if (!result.rows[0]) {
      return res.status(404).json({ code: 'ERR_NOT_FOUND', message: 'Staff not found' })
    }
    res.json(result.rows[0])
  } catch (err) {
    next({ status: 500, code: 'ERR_STAFF_GET', message: 'Failed to fetch staff', details: { error: String(err) } })
  }
})

router.delete('/:id', async (req, res, next) => {
  try {
    const result = await query('DELETE FROM staff WHERE id = $1 RETURNING *', [req.params.id])
    if (!result.rows[0]) {
      return res.status(404).json({ code: 'ERR_NOT_FOUND', message: 'Staff not found' })
    }
    res.json(result.rows[0])
  } catch (err) {
    next({ status: 500, code: 'ERR_STAFF_DELETE', message: 'Failed to delete staff', details: { error: String(err) } })
  }
})

router.post('/', requireRole(['Owner']), async (req, res, next) => {
  const client = await pool.connect()
  try {
    const { fullName, roleTitle, username, password } = req.body
    if (!fullName || !roleTitle || !username || !password) {
      return res.status(400).json({ code: 'ERR_VALIDATION', message: 'Full name, role title, username, and password are required' })
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
    let roleId = (await client.query("SELECT id FROM roles WHERE name = 'Staff'")).rows[0]?.id
    if (!roleId) {
      roleId = (await client.query("INSERT INTO roles (name) VALUES ('Staff') RETURNING id")).rows[0].id
    }
    await client.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)', [userId, roleId])
    const staffResult = await client.query(
      'INSERT INTO staff (user_id, full_name, role_title) VALUES ($1, $2, $3) RETURNING *',
      [userId, fullName, roleTitle]
    )
    await client.query('COMMIT')
    res.status(201).json(staffResult.rows[0])
  } catch (err) {
    try { await client.query('ROLLBACK') } catch { /* */ }
    next({ status: 500, code: 'ERR_STAFF_CREATE', message: 'Failed to create staff', details: { error: String(err) } })
  } finally {
    client.release()
  }
})

router.patch('/:id', async (req, res, next) => {
  try {
    const { fullName, roleTitle } = req.body
    const result = await query(
      'UPDATE staff SET full_name = COALESCE($1,full_name), role_title = COALESCE($2,role_title) WHERE id = $3 RETURNING *',
      [fullName || null, roleTitle || null, req.params.id]
    )
    if (!result.rows[0]) {
      return res.status(404).json({ code: 'ERR_NOT_FOUND', message: 'Staff not found' })
    }
    res.json(result.rows[0])
  } catch (err) {
    next({ status: 500, code: 'ERR_STAFF_UPDATE', message: 'Failed to update staff', details: { error: String(err) } })
  }
})

export default router
