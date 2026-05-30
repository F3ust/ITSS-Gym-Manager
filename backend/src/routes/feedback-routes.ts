import { Router } from 'express'
import pool from '../db/pool'
import { query } from '../db/query'
import { requireRole } from '../middlewares/auth-middleware'

const router = Router()

router.post('/', async (req, res, next) => {
  let client
  try {
    const { memberId, category, rating, content } = req.body
    if (!memberId || !category || !content) {
      return res.status(400).json({ code: 'ERR_VALIDATION', message: 'Missing required fields' })
    }
    client = await pool.connect()
    await client.query('BEGIN')
    const result = await client.query(
      'INSERT INTO feedback (member_id, category, rating, content) VALUES ($1,$2,$3,$4) RETURNING *',
      [memberId, category, rating ?? null, content]
    )
    await client.query(
      'INSERT INTO feedback_notifications (feedback_id) VALUES ($1) ON CONFLICT (feedback_id) DO NOTHING',
      [result.rows[0].id]
    )
    await client.query('COMMIT')
    res.status(201).json(result.rows[0])
  } catch (err) {
    if (client) {
      try {
        await client.query('ROLLBACK')
      } catch {
        // Ignore rollback failures to preserve original error.
      }
    }
    next({ status: 500, code: 'ERR_FEEDBACK_CREATE', message: 'Failed to create feedback', details: { error: String(err) } })
  } finally {
    client?.release()
  }
})

router.get('/', async (req, res, next) => {
  try {
    const memberId = String(req.query.memberId || '').trim()
    const status = String(req.query.status || '').trim()
    if (memberId) {
      const result = status
        ? await query(
            `SELECT f.*, json_agg(json_build_object('id', fr.id, 'response', fr.response, 'created_at', fr.created_at)
              ORDER BY fr.created_at ASC) FILTER (WHERE fr.id IS NOT NULL) AS responses
             FROM feedback f
             LEFT JOIN feedback_responses fr ON fr.feedback_id = f.id
             WHERE f.member_id = $1 AND f.status = $2
             GROUP BY f.id ORDER BY f.created_at DESC`,
            [memberId, status]
          )
        : await query(
            `SELECT f.*, json_agg(json_build_object('id', fr.id, 'response', fr.response, 'created_at', fr.created_at)
              ORDER BY fr.created_at ASC) FILTER (WHERE fr.id IS NOT NULL) AS responses
             FROM feedback f
             LEFT JOIN feedback_responses fr ON fr.feedback_id = f.id
             WHERE f.member_id = $1
             GROUP BY f.id ORDER BY f.created_at DESC`,
            [memberId]
          )
      return res.json(result.rows)
    }
    const result = status
      ? await query('SELECT * FROM feedback WHERE status = $1 ORDER BY created_at DESC', [status])
      : await query('SELECT * FROM feedback ORDER BY created_at DESC')
    res.json(result.rows)
  } catch (err) {
    next({ status: 500, code: 'ERR_FEEDBACK_LIST', message: 'Failed to list feedback', details: { error: String(err) } })
  }
})

router.get('/notifications', requireRole(['Owner', 'Staff']), async (req, res, next) => {
  try {
    const status = String(req.query.status || '').trim()
    const result = status
      ? await query(
          `SELECT n.id, n.feedback_id, n.status, n.created_at, f.member_id, f.category, f.content
           FROM feedback_notifications n
           JOIN feedback f ON f.id = n.feedback_id
           WHERE n.status = $1
           ORDER BY n.created_at DESC`,
          [status]
        )
      : await query(
          `SELECT n.id, n.feedback_id, n.status, n.created_at, f.member_id, f.category, f.content
           FROM feedback_notifications n
           JOIN feedback f ON f.id = n.feedback_id
           ORDER BY n.created_at DESC`
        )
    res.json(result.rows)
  } catch (err) {
    next({ status: 500, code: 'ERR_FEEDBACK_NOTIF_LIST', message: 'Failed to list feedback notifications', details: { error: String(err) } })
  }
})

router.get('/:id', async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM feedback WHERE id = $1', [req.params.id])
    if (!result.rows[0]) {
      return res.status(404).json({ code: 'ERR_NOT_FOUND', message: 'Feedback not found' })
    }
    res.json(result.rows[0])
  } catch (err) {
    next({ status: 500, code: 'ERR_FEEDBACK_GET', message: 'Failed to fetch feedback', details: { error: String(err) } })
  }
})

router.patch('/:id/status', async (req, res, next) => {
  try {
    const { status } = req.body
    if (!status) {
      return res.status(400).json({ code: 'ERR_VALIDATION', message: 'Missing status' })
    }
    const result = await query('UPDATE feedback SET status = $1 WHERE id = $2 RETURNING *', [status, req.params.id])
    if (!result.rows[0]) {
      return res.status(404).json({ code: 'ERR_NOT_FOUND', message: 'Feedback not found' })
    }
    res.json(result.rows[0])
  } catch (err) {
    next({ status: 500, code: 'ERR_FEEDBACK_STATUS', message: 'Failed to update feedback status', details: { error: String(err) } })
  }
})

router.post('/:id/response', requireRole(['Owner', 'Staff']), async (req, res, next) => {
  let client
  try {
    const { staffId, response } = req.body
    if (!response) {
      return res.status(400).json({ code: 'ERR_VALIDATION', message: 'Missing response' })
    }
    client = await pool.connect()
    await client.query('BEGIN')
    const respResult = await client.query(
      'INSERT INTO feedback_responses (feedback_id, staff_id, response) VALUES ($1,$2,$3) RETURNING *',
      [req.params.id, staffId || null, response]
    )
    await client.query(
      "UPDATE feedback SET status = 'completed' WHERE id = $1",
      [req.params.id]
    )
    const feedback = await client.query('SELECT member_id FROM feedback WHERE id = $1', [req.params.id])
    if (feedback.rows[0]) {
      await client.query(
        'INSERT INTO member_notifications (member_id, icon, message) VALUES ($1, $2, $3)',
        [feedback.rows[0].member_id, '💬', 'Staff has responded to your feedback']
      )
    }
    await client.query('COMMIT')
    res.status(201).json(respResult.rows[0])
  } catch (err) {
    if (client) {
      try { await client.query('ROLLBACK') } catch { /* */ }
    }
    next({ status: 500, code: 'ERR_FEEDBACK_RESPONSE', message: 'Failed to respond to feedback', details: { error: String(err) } })
  } finally {
    client?.release()
  }
})

export default router
