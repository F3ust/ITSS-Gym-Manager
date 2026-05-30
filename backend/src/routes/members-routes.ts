import { Router } from 'express'
import { query } from '../db/query'
import { requireRole } from '../middlewares/auth-middleware'
import { logAudit } from '../utils/audit-logger'

const router = Router()

router.post('/', async (req, res, next) => {
  try {
    const { fullName, email, phone, avatarUrl, dob, job, memberType, fingerprintHash } = req.body
    if (!fullName || !phone || !dob || !job || !memberType) {
      return res.status(400).json({ code: 'ERR_VALIDATION', message: 'Missing required fields' })
    }
    const dobDate = new Date(dob)
    if (isNaN(dobDate.getTime())) {
      return res.status(400).json({ code: 'ERR_VALIDATION', message: 'Invalid date of birth' })
    }
    const today = new Date()
    let age = today.getFullYear() - dobDate.getFullYear()
    const mDiff = today.getMonth() - dobDate.getMonth()
    if (mDiff < 0 || (mDiff === 0 && today.getDate() < dobDate.getDate())) age--
    if (age < 16) {
      return res.status(400).json({ code: 'ERR_VALIDATION', message: 'You must be at least 16 years old to register' })
    }
    const result = await query(
      'INSERT INTO members (full_name, email, phone, avatar_url, dob, job, member_type, fingerprint_hash) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
      [fullName, email || null, phone, avatarUrl || null, dob, job, memberType, fingerprintHash || null]
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    next({ status: 500, code: 'ERR_MEMBER_CREATE', message: 'Failed to create member', details: { error: String(err) } })
  }
})

router.get('/', async (req, res, next) => {
  try {
    const userId = String(req.query.userId || '').trim()
    if (userId) {
      const result = await query('SELECT * FROM members WHERE user_id = $1', [userId])
      return res.json(result.rows[0] || null)
    }
    const queryText = String(req.query.query || '').trim()
    if (queryText) {
      const result = await query(
        'SELECT * FROM members WHERE full_name ILIKE $1 OR phone ILIKE $1 ORDER BY created_at DESC',
        [`%${queryText}%`]
      )
      return res.json(result.rows)
    }
    const result = await query('SELECT * FROM members ORDER BY created_at DESC')
    res.json(result.rows)
  } catch (err) {
    next({ status: 500, code: 'ERR_MEMBER_LIST', message: 'Failed to list members', details: { error: String(err) } })
  }
})

router.get('/usage-history', requireRole(['Owner', 'Staff', 'Member']), async (req, res, next) => {
  try {
    const role = (req.header('x-role') || '').toLowerCase()
    const from = String(req.query.from || '').trim()
    const to = String(req.query.to || '').trim()
    const memberId = String(req.query.memberId || '').trim()
    const userId = String(req.query.userId || '').trim()

    if (!from || !to) {
      return res.status(400).json({ code: 'ERR_VALIDATION', message: 'from and to are required' })
    }
    if (from > to) {
      return res.status(400).json({ code: 'ERR_VALIDATION', message: 'from must be before to' })
    }

    let resolvedMemberId = memberId

    if (role === 'member') {
      if (!userId) {
        return res.status(400).json({ code: 'ERR_VALIDATION', message: 'userId is required for Member role' })
      }
      const member = await query('SELECT id FROM members WHERE user_id = $1', [userId])
      if (!member.rows[0]) {
        return res.status(400).json({ code: 'ERR_VALIDATION', message: 'Member profile not found' })
      }
      if (resolvedMemberId && resolvedMemberId !== member.rows[0].id) {
        return res.status(403).json({ code: 'ERR_FORBIDDEN', message: 'Access denied' })
      }
      resolvedMemberId = member.rows[0].id
    }

    if (!resolvedMemberId) {
      return res.status(400).json({ code: 'ERR_VALIDATION', message: 'memberId is required' })
    }

    const checkins = await query(
      `SELECT id, check_in_at AS occurred_at, method, remaining_sessions_after, 'checkin' AS type FROM check_ins WHERE member_id = $1 AND check_in_at::date >= $2 AND check_in_at::date <= $3 ORDER BY check_in_at DESC`,
      [resolvedMemberId, from, to]
    )

    const workouts = await query(
      `SELECT id, workout_date AS occurred_at, duration_min, intensity, notes, rating, 'workout' AS type FROM workout_logs WHERE member_id = $1 AND workout_date >= $2 AND workout_date <= $3 ORDER BY workout_date DESC`,
      [resolvedMemberId, from, to]
    )

    const items = [...checkins.rows, ...workouts.rows].sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime())

    res.json({ items })
  } catch (err) {
    next({ status: 500, code: 'ERR_USAGE_HISTORY', message: 'Failed to fetch usage history', details: { error: String(err) } })
  }
})

router.get('/:id', async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM members WHERE id = $1', [req.params.id])
    if (!result.rows[0]) {
      return res.status(404).json({ code: 'ERR_NOT_FOUND', message: 'Member not found' })
    }
    res.json(result.rows[0])
  } catch (err) {
    next({ status: 500, code: 'ERR_MEMBER_GET', message: 'Failed to fetch member', details: { error: String(err) } })
  }
})

router.patch('/:id', async (req, res, next) => {
  try {
    const { email, phone, avatarUrl, fullName, dob, job, memberType } = req.body
    const result = await query(
      'UPDATE members SET email = COALESCE($1,email), phone = COALESCE($2,phone), avatar_url = COALESCE($3,avatar_url), full_name = COALESCE($4,full_name), dob = COALESCE($5,dob), job = COALESCE($6,job), member_type = COALESCE($7,member_type) WHERE id = $8 RETURNING *',
      [email || null, phone || null, avatarUrl || null, fullName || null, dob || null, job || null, memberType || null, req.params.id]
    )
    if (!result.rows[0]) {
      return res.status(404).json({ code: 'ERR_NOT_FOUND', message: 'Member not found' })
    }
    logAudit(result.rows[0].user_id, 'member_update', { memberId: req.params.id })
    res.json(result.rows[0])
  } catch (err) {
    next({ status: 500, code: 'ERR_MEMBER_UPDATE', message: 'Failed to update member', details: { error: String(err) } })
  }
})

router.delete('/:id', async (req, res, next) => {
  try {
    const result = await query('UPDATE members SET status = $1 WHERE id = $2 RETURNING *', ['inactive', req.params.id])
    if (!result.rows[0]) {
      return res.status(404).json({ code: 'ERR_NOT_FOUND', message: 'Member not found' })
    }
    res.json(result.rows[0])
  } catch (err) {
    next({ status: 500, code: 'ERR_MEMBER_DELETE', message: 'Failed to deactivate member', details: { error: String(err) } })
  }
})

export default router
