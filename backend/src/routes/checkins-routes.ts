import { Router } from 'express'
import type { PoolClient } from 'pg'
import pool from '../db/pool'

const router = Router()

const safeRollback = async (client: PoolClient) => {
  try {
    await client.query('ROLLBACK')
  } catch {
    // Ignore rollback failures to preserve original error.
  }
}

router.post('/', async (req, res, next) => {
  const { memberId, method, withPt } = req.body
  if (!memberId || !method) {
    return res.status(400).json({ code: 'ERR_VALIDATION', message: 'Missing required fields' })
  }
  const methodValue = String(method).trim().toLowerCase().replace(/\s+/g, '_')
  if (methodValue === 'fingerprint_wrong') {
    return res.status(403).json({ code: 'ERR_FINGERPRINT_DENIED', message: 'Fingerprint verification failed' })
  }
  let client
  try {
    client = await pool.connect()
    await client.query('BEGIN')
    const subResult = await client.query(
      'SELECT * FROM subscriptions WHERE member_id = $1 AND status = $2 AND end_date >= CURRENT_DATE ORDER BY end_date DESC LIMIT 1 FOR UPDATE',
      [memberId, 'active']
    )
    const subscription = subResult.rows[0]
    if (!subscription) {
      await safeRollback(client)
      return res.status(400).json({ code: 'ERR_SUB_INACTIVE', message: 'No active subscription' })
    }
    let remainingAfter = subscription.remaining_sessions
    if (withPt === true) {
      const ptSessions = subscription.remaining_pt_sessions
      if (ptSessions === null) {
        await safeRollback(client)
        return res.status(400).json({ code: 'ERR_NO_PT_SESSIONS', message: 'No PT sessions on this subscription' })
      }
      if (ptSessions <= 0) {
        await safeRollback(client)
        return res.status(409).json({ code: 'ERR_NO_PT_SESSIONS', message: 'No remaining PT sessions' })
      }
      const decrementResult = await client.query(
        'UPDATE subscriptions SET remaining_pt_sessions = remaining_pt_sessions - 1 WHERE id = $1 AND remaining_pt_sessions > 0 RETURNING remaining_pt_sessions',
        [subscription.id]
      )
      if (!decrementResult.rows[0]) {
        await safeRollback(client)
        return res.status(409).json({ code: 'ERR_NO_PT_SESSIONS', message: 'No remaining PT sessions' })
      }
      remainingAfter = decrementResult.rows[0].remaining_pt_sessions
    } else if (remainingAfter !== null) {
      if (remainingAfter <= 0) {
        await safeRollback(client)
        return res.status(409).json({ code: 'ERR_NO_SESSIONS', message: 'No remaining sessions' })
      }
      const decrementResult = await client.query(
        'UPDATE subscriptions SET remaining_sessions = remaining_sessions - 1 WHERE id = $1 AND remaining_sessions > 0 RETURNING remaining_sessions',
        [subscription.id]
      )
      if (!decrementResult.rows[0]) {
        await safeRollback(client)
        return res.status(409).json({ code: 'ERR_NO_SESSIONS', message: 'No remaining sessions' })
      }
      remainingAfter = decrementResult.rows[0].remaining_sessions
    }
    const checkinResult = await client.query(
      'INSERT INTO check_ins (member_id, method, with_pt, remaining_sessions_after) VALUES ($1,$2,$3,$4) RETURNING *',
      [memberId, methodValue, withPt === true, remainingAfter]
    )
    await client.query('COMMIT')
    res.status(201).json(checkinResult.rows[0])
  } catch (err) {
    if (client) {
      await safeRollback(client)
    }
    next({ status: 500, code: 'ERR_CHECKIN_CREATE', message: 'Failed to check-in', details: { error: String(err) } })
  } finally {
    client?.release()
  }
})

router.get('/:id', async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM check_ins WHERE id = $1', [req.params.id])
    if (!result.rows[0]) {
      return res.status(404).json({ code: 'ERR_NOT_FOUND', message: 'Check-in not found' })
    }
    res.json(result.rows[0])
  } catch (err) {
    next({ status: 500, code: 'ERR_CHECKIN_GET', message: 'Failed to fetch check-in', details: { error: String(err) } })
  }
})

router.get('/', async (req, res, next) => {
  try {
    const memberId = String(req.query.memberId || '')
    const date = String(req.query.date || '')
    let sql = 'SELECT * FROM check_ins'
    const params: string[] = []
    const clauses: string[] = []
    if (memberId) { params.push(memberId); clauses.push(`member_id = $${params.length}`) }
    if (date) { params.push(date); clauses.push(`check_in_at::date = $${params.length}`) }
    if (clauses.length) sql += ' WHERE ' + clauses.join(' AND ')
    sql += ' ORDER BY check_in_at DESC'
    const result = await pool.query(sql, params)
    res.json(result.rows)
  } catch (err) {
    next({ status: 500, code: 'ERR_CHECKIN_LIST', message: 'Failed to list check-ins', details: { error: String(err) } })
  }
})

export default router
