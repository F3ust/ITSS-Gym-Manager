import { Router } from 'express'
import type { PoolClient } from 'pg'
import pool from '../db/pool'
import { logAudit } from '../utils/audit-logger'

const router = Router()

const safeRollback = async (client: PoolClient) => {
  try {
    await client.query('ROLLBACK')
  } catch {
    // Ignore rollback failures to preserve original error.
  }
}

router.post('/', async (req, res, next) => {
  const { subscriptionId, amount, method, endDate, remainingSessions } = req.body
  if (!subscriptionId || amount === undefined || amount === null || typeof method !== 'string') {
    return res.status(400).json({ code: 'ERR_VALIDATION', message: 'Missing required fields' })
  }
  const methodValue = method.trim()
  if (methodValue.length === 0) {
    return res.status(400).json({ code: 'ERR_VALIDATION', message: 'Missing required fields' })
  }
  let amountValue: number
  if (typeof amount === 'number') {
    amountValue = amount
  } else if (typeof amount === 'string') {
    const trimmed = amount.trim()
    if (trimmed.length === 0) {
      return res.status(400).json({ code: 'ERR_VALIDATION', message: 'Missing required fields' })
    }
    if (!/^\d+(\.\d+)?$/.test(trimmed)) {
      return res.status(400).json({ code: 'ERR_VALIDATION', message: 'Invalid amount' })
    }
    amountValue = Number(trimmed)
  } else {
    return res.status(400).json({ code: 'ERR_VALIDATION', message: 'Invalid amount' })
  }
  if (!Number.isFinite(amountValue) || amountValue < 0) {
    return res.status(400).json({ code: 'ERR_VALIDATION', message: 'Invalid amount' })
  }
  let client
  try {
    client = await pool.connect()
    await client.query('BEGIN')
    const subscriptionResult = await client.query(
      'UPDATE subscriptions SET end_date = COALESCE($1,end_date), remaining_sessions = COALESCE($2,remaining_sessions), status = $3 WHERE id = $4 RETURNING *',
      [endDate || null, remainingSessions ?? null, 'active', subscriptionId]
    )
    if (!subscriptionResult.rows[0]) {
      await safeRollback(client)
      return res.status(404).json({ code: 'ERR_NOT_FOUND', message: 'Subscription not found' })
    }
    const paymentResult = await client.query(
      'INSERT INTO payments (subscription_id, amount, method) VALUES ($1,$2,$3) RETURNING *',
      [subscriptionId, amountValue, methodValue]
    )
    const invoiceResult = await client.query(
      'INSERT INTO invoices (payment_id) VALUES ($1) RETURNING *',
      [paymentResult.rows[0].id]
    )
    await client.query('COMMIT')
    logAudit(null, 'payment', { subscriptionId, amount: amountValue, method: methodValue })
    res.status(201).json({
      subscription: subscriptionResult.rows[0],
      payment: paymentResult.rows[0],
      invoice: invoiceResult.rows[0]
    })
  } catch (err) {
    if (client) {
      await safeRollback(client)
    }
    next({ status: 500, code: 'ERR_PAYMENT_CREATE', message: 'Failed to create payment', details: { error: String(err) } })
  } finally {
    client?.release()
  }
})

router.get('/:id', async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM payments WHERE id = $1', [req.params.id])
    if (!result.rows[0]) {
      return res.status(404).json({ code: 'ERR_NOT_FOUND', message: 'Payment not found' })
    }
    res.json(result.rows[0])
  } catch (err) {
    next({ status: 500, code: 'ERR_PAYMENT_GET', message: 'Failed to fetch payment', details: { error: String(err) } })
  }
})

export default router
