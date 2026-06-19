import { Router } from 'express'
import { query } from '../db/query'
import { requireRole } from '../middlewares/auth-middleware'

const router = Router()

router.get('/revenue', async (req, res, next) => {
  try {
    const { from, to } = req.query
    if (!from || !to) {
      return res.status(400).json({ code: 'ERR_VALIDATION', message: 'Missing from/to' })
    }
    const result = await query(
      'SELECT paid_at::date AS day, COALESCE(SUM(amount),0)::int AS total FROM payments WHERE paid_at::date BETWEEN $1 AND $2 GROUP BY day ORDER BY day',
      [String(from), String(to)]
    )
    const breakdown = result.rows.map((row: any) => {
      let dayStr = ''
      if (row.day instanceof Date) {
        const y = row.day.getFullYear()
        const m = String(row.day.getMonth() + 1).padStart(2, '0')
        const d = String(row.day.getDate()).padStart(2, '0')
        dayStr = `${y}-${m}-${d}`
      } else {
        dayStr = String(row.day).split('T')[0]
      }
      return {
        day: dayStr,
        total: Number(row.total)
      }
    })
    const total = breakdown.reduce((sum: number, r: any) => sum + r.total, 0)
    res.json({ total, breakdown })
  } catch (err) {
    next({ status: 500, code: 'ERR_REPORT_REVENUE', message: 'Failed to build revenue report', details: { error: String(err) } })
  }
})

router.get('/traffic', async (req, res, next) => {
  try {
    const { from, to } = req.query
    if (!from || !to) {
      return res.status(400).json({ code: 'ERR_VALIDATION', message: 'Missing from/to' })
    }
    const result = await query(
      'SELECT check_in_at::date AS day, COUNT(*)::int AS total FROM check_ins WHERE check_in_at::date BETWEEN $1 AND $2 GROUP BY day ORDER BY day',
      [String(from), String(to)]
    )
    res.json(result.rows)
  } catch (err) {
    next({ status: 500, code: 'ERR_REPORT_TRAFFIC', message: 'Failed to build traffic report', details: { error: String(err) } })
  }
})

router.get('/equipment', async (_req, res, next) => {
  try {
    const result = await query('SELECT status, COUNT(*)::int AS total FROM equipment GROUP BY status')
    res.json(result.rows)
  } catch (err) {
    next({ status: 500, code: 'ERR_REPORT_EQUIPMENT', message: 'Failed to build equipment report', details: { error: String(err) } })
  }
})

router.get('/staff-performance', requireRole(['Owner']), async (req, res, next) => {
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
    next({ status: 500, code: 'ERR_REPORT_STAFF', message: 'Failed to build staff performance report', details: { error: String(err) } })
  }
})

export default router
