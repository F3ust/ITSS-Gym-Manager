import { Router } from 'express'
import { query } from '../db/query'
import { requireRole } from '../middlewares/auth-middleware'
import pool from '../db/pool'

const router = Router()

router.post('/', async (req, res, next) => {
  try {
    const { memberId, packageId, startDate, endDate, remainingSessions, remainingPtSessions } = req.body
    if (!memberId || !packageId || !startDate || !endDate) {
      return res.status(400).json({ code: 'ERR_VALIDATION', message: 'Missing required fields' })
    }
    const pkgResult = await query('SELECT session_count, pt_session_count, duration_days FROM packages WHERE id = $1', [packageId])
    const pkg = pkgResult.rows[0]
    if (!pkg) {
      return res.status(404).json({ code: 'ERR_NOT_FOUND', message: 'Package not found' })
    }
    let finalStatus = 'active'
    let finalStartDate = startDate
    let finalEndDate = endDate
    let finalRemainingSessions = remainingSessions
    if (finalRemainingSessions === undefined || finalRemainingSessions === null) {
      finalRemainingSessions = pkg.session_count ?? null
    }
    let finalRemainingPtSessions = remainingPtSessions
    if (finalRemainingPtSessions === undefined || finalRemainingPtSessions === null) {
      finalRemainingPtSessions = pkg.pt_session_count ?? null
    }
    const activeSub = await query(
      "SELECT id, end_date FROM subscriptions WHERE member_id = $1 AND status = 'active' AND end_date >= CURRENT_DATE ORDER BY end_date DESC LIMIT 1",
      [memberId]
    )
    if (activeSub.rows[0]) {
      finalStatus = 'pending'
      const nextStart = new Date(activeSub.rows[0].end_date)
      nextStart.setDate(nextStart.getDate() + 1)
      finalStartDate = nextStart.toISOString().split('T')[0]
      const nextEnd = new Date(finalStartDate)
      nextEnd.setDate(nextEnd.getDate() + pkg.duration_days)
      finalEndDate = nextEnd.toISOString().split('T')[0]
      finalRemainingSessions = pkg.session_count ?? null
      finalRemainingPtSessions = pkg.pt_session_count ?? null
    }
    const result = await query(
      'INSERT INTO subscriptions (member_id, package_id, start_date, end_date, remaining_sessions, remaining_pt_sessions, status) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [memberId, packageId, finalStartDate, finalEndDate, finalRemainingSessions, finalRemainingPtSessions, finalStatus]
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    next({ status: 500, code: 'ERR_SUB_CREATE', message: 'Failed to create subscription', details: { error: String(err) } })
  }
})

async function activatePending() {
  await query("UPDATE subscriptions SET status = 'active' WHERE status = 'pending' AND start_date <= CURRENT_DATE")
}

router.get('/', async (_req, res, next) => {
  try {
    await activatePending()
    const result = await query('SELECT * FROM subscriptions ORDER BY end_date ASC')
    res.json(result.rows)
  } catch (err) {
    next({ status: 500, code: 'ERR_SUB_LIST', message: 'Failed to list subscriptions', details: { error: String(err) } })
  }
})

router.get('/:id', async (req, res, next) => {
  try {
    await activatePending()
    const result = await query('SELECT * FROM subscriptions WHERE id = $1', [req.params.id])
    if (!result.rows[0]) {
      return res.status(404).json({ code: 'ERR_NOT_FOUND', message: 'Subscription not found' })
    }
    res.json(result.rows[0])
  } catch (err) {
    next({ status: 500, code: 'ERR_SUB_GET', message: 'Failed to fetch subscription', details: { error: String(err) } })
  }
})

router.patch('/:id', async (req, res, next) => {
  try {
    const { memberId, packageId, startDate, endDate, remainingSessions, remainingPtSessions, status } = req.body
    const result = await query(
      `UPDATE subscriptions SET member_id = COALESCE($1,member_id), package_id = COALESCE($2,package_id),
       start_date = COALESCE($3,start_date), end_date = COALESCE($4,end_date),
       remaining_sessions = COALESCE($5,remaining_sessions), remaining_pt_sessions = COALESCE($6,remaining_pt_sessions), status = COALESCE($7,status) WHERE id = $8 RETURNING *`,
      [memberId || null, packageId || null, startDate || null, endDate || null, remainingSessions ?? null, remainingPtSessions ?? null, status || null, req.params.id]
    )
    if (!result.rows[0]) {
      return res.status(404).json({ code: 'ERR_NOT_FOUND', message: 'Subscription not found' })
    }
    res.json(result.rows[0])
  } catch (err) {
    next({ status: 500, code: 'ERR_SUB_UPDATE', message: 'Failed to update subscription', details: { error: String(err) } })
  }
})

router.delete('/:id', requireRole(['Owner', 'Staff']), async (req, res, next) => {
  let client
  try {
    const id = String(req.params.id)
    client = await pool.connect()
    await client.query('BEGIN')
    const subResult = await client.query('SELECT member_id FROM subscriptions WHERE id = $1', [id])
    if (!subResult.rows[0]) {
      await client.query('ROLLBACK')
      return res.status(404).json({ code: 'ERR_NOT_FOUND', message: 'Subscription not found' })
    }
    const memberId = subResult.rows[0].member_id
    await client.query(
      "UPDATE subscriptions SET status = 'cancelled' WHERE id = $1", [id]
    )
    await client.query(
      "UPDATE pt_assignments SET status = 'inactive' WHERE member_id = $1 AND status = 'active'", [memberId]
    )
    await client.query('COMMIT')
    res.json({ id, status: 'cancelled' })
  } catch (err) {
    if (client) await client.query('ROLLBACK')
    next({ status: 500, code: 'ERR_SUB_DELETE', message: 'Failed to cancel subscription', details: { error: String(err) } })
  } finally {
    if (client) client.release()
  }
})

router.post('/:id/renew', async (req, res, next) => {
  try {
    const { endDate, remainingSessions, remainingPtSessions } = req.body
    const result = await query(
      'UPDATE subscriptions SET end_date = COALESCE($1,end_date), remaining_sessions = COALESCE($2,remaining_sessions), remaining_pt_sessions = COALESCE($3,remaining_pt_sessions), status = $4 WHERE id = $5 RETURNING *',
      [endDate || null, remainingSessions ?? null, remainingPtSessions ?? null, 'active', req.params.id]
    )
    if (!result.rows[0]) {
      return res.status(404).json({ code: 'ERR_NOT_FOUND', message: 'Subscription not found' })
    }
    res.json(result.rows[0])
  } catch (err) {
    next({ status: 500, code: 'ERR_SUB_RENEW', message: 'Failed to renew subscription', details: { error: String(err) } })
  }
})

export default router
