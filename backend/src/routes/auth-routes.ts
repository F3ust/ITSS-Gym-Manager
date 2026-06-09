import { Router } from 'express'
import { randomBytes, scryptSync, timingSafeEqual } from 'crypto'
import jwt from 'jsonwebtoken'
import { query } from '../db/query'
import { logAudit } from '../utils/audit-logger'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-gym-secret'
const router = Router()

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, key] = stored.split(':')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return timingSafeEqual(Buffer.from(hash), Buffer.from(key))
}

async function getUserDisplayName(userId: string, role: string): Promise<string> {
  if (role === 'Member') {
    const m = await query('SELECT full_name FROM members WHERE user_id = $1', [userId])
    return m.rows[0]?.full_name || ''
  }
  if (role === 'Staff') {
    const s = await query('SELECT full_name FROM staff WHERE user_id = $1', [userId])
    return s.rows[0]?.full_name || ''
  }
  if (role === 'PT') {
    const p = await query('SELECT full_name FROM pt_profiles WHERE user_id = $1', [userId])
    return p.rows[0]?.full_name || ''
  }
  return ''
}

router.post('/login', async (req, res, next) => {
  try {
    const { phone, password } = req.body
    if (!phone || !password) {
      return res.status(400).json({ code: 'ERR_VALIDATION', message: 'Phone and password are required' })
    }
    const userResult = await query<{ id: string; username: string; password_hash: string }>(
      'SELECT id, username, password_hash FROM users WHERE username = $1',
      [phone]
    )
    if (!userResult.rows[0]) {
      return res.status(401).json({ code: 'ERR_AUTH', message: 'Invalid credentials' })
    }
    const user = userResult.rows[0]
    if (!verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ code: 'ERR_AUTH', message: 'Invalid credentials' })
    }
    const roleResult = await query<{ name: string }>(
      'SELECT r.name FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = $1',
      [user.id]
    )
    const role = roleResult.rows[0]?.name || 'Member'
    const name = await getUserDisplayName(user.id, role) || user.username
    logAudit(user.id, 'login', { role: role.toLowerCase() })
    const token = jwt.sign({ userId: user.id, role }, JWT_SECRET, { expiresIn: '7d' })
    res.json({ token, user: { id: user.id, name, role: role.toLowerCase() } })
  } catch (err) {
    next({ status: 500, code: 'ERR_AUTH_LOGIN', message: 'Login failed', details: { error: String(err) } })
  }
})

router.post('/register', async (req, res, next) => {
  try {
    const { name, phone, password, dob } = req.body
    if (!name || !phone || !password) {
      return res.status(400).json({ code: 'ERR_VALIDATION', message: 'Name, phone, and password are required' })
    }
    if (!/^\d{10}$/.test(phone)) {
      return res.status(400).json({ code: 'ERR_VALIDATION', message: 'Phone must be 10 digits' })
    }
    if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
      return res.status(400).json({ code: 'ERR_VALIDATION', message: 'Password must be 8+ chars with letters and numbers' })
    }
    if (!dob) {
      return res.status(400).json({ code: 'ERR_VALIDATION', message: 'Date of birth is required' })
    }
    const dobMatch = dob.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
    if (!dobMatch) {
      return res.status(400).json({ code: 'ERR_VALIDATION', message: 'Date of birth must be in dd/MM/yyyy format' })
    }
    const dobDate = new Date(+dobMatch[3], +dobMatch[2] - 1, +dobMatch[1])
    const today = new Date()
    let age = today.getFullYear() - dobDate.getFullYear()
    const mDiff = today.getMonth() - dobDate.getMonth()
    if (mDiff < 0 || (mDiff === 0 && today.getDate() < dobDate.getDate())) {
      age--
    }
    if (age < 16) {
      return res.status(400).json({ code: 'ERR_VALIDATION', message: 'You must be at least 16 years old to register' })
    }
    const existing = await query('SELECT id FROM users WHERE username = $1', [phone])
    if (existing.rows[0]) {
      return res.status(409).json({ code: 'ERR_DUPLICATE', message: 'Phone number already registered' })
    }
    const hashed = hashPassword(password)
    const userResult = await query<{ id: string }>(
      'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id',
      [phone, hashed]
    )
    const userId = userResult.rows[0].id
    let roleId = (await query<{ id: string }>("SELECT id FROM roles WHERE name = 'Member'")).rows[0]?.id
    if (!roleId) {
      roleId = (await query<{ id: string }>("INSERT INTO roles (name) VALUES ('Member') RETURNING id")).rows[0].id
    }
    await query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)', [userId, roleId])
    await query(
      'INSERT INTO members (user_id, full_name, phone, dob, job, member_type, status) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [userId, name, phone, dobDate.toISOString().split('T')[0], 'N/A', 'regular', 'active']
    )
    const token = jwt.sign({ userId, role: 'Member' }, JWT_SECRET, { expiresIn: '7d' })
    res.status(201).json({
      token,
      user: { id: userId, name, role: 'member' }
    })
  } catch (err) {
    next({ status: 500, code: 'ERR_AUTH_REGISTER', message: 'Registration failed', details: { error: String(err) } })
  }
})

export default router
