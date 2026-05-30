import { Router } from 'express'
import { query } from '../db/query'
import { requireRole } from '../middlewares/auth-middleware'

const router = Router()

router.get('/', async (req, res, next) => {
  try {
    const memberId = String(req.query.memberId || '').trim()
    if (!memberId) {
      return res.status(400).json({ code: 'ERR_VALIDATION', message: 'memberId is required' })
    }
    const result = await query(
      'SELECT id, icon, message, read, created_at FROM member_notifications WHERE member_id = $1 ORDER BY created_at DESC',
      [memberId]
    )
    res.json(result.rows)
  } catch (err) {
    next({ status: 500, code: 'ERR_NOTIF_LIST', message: 'Failed to list notifications', details: { error: String(err) } })
  }
})

router.post('/', requireRole(['Owner', 'Staff', 'PT']), async (req, res, next) => {
  try {
    const { memberId, icon, message } = req.body
    if (!memberId || !message) {
      return res.status(400).json({ code: 'ERR_VALIDATION', message: 'memberId and message are required' })
    }
    const result = await query(
      'INSERT INTO member_notifications (member_id, icon, message) VALUES ($1, $2, $3) RETURNING *',
      [memberId, icon || '🔔', message]
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    next({ status: 500, code: 'ERR_NOTIF_CREATE', message: 'Failed to create notification', details: { error: String(err) } })
  }
})

router.patch('/:id/read', async (req, res, next) => {
  try {
    const result = await query(
      'UPDATE member_notifications SET read = true WHERE id = $1 RETURNING *',
      [req.params.id]
    )
    if (!result.rows[0]) {
      return res.status(404).json({ code: 'ERR_NOT_FOUND', message: 'Notification not found' })
    }
    res.json(result.rows[0])
  } catch (err) {
    next({ status: 500, code: 'ERR_NOTIF_READ', message: 'Failed to mark notification as read', details: { error: String(err) } })
  }
})

router.delete('/', async (req, res, next) => {
  try {
    const memberId = String(req.query.memberId || '').trim()
    if (!memberId) {
      return res.status(400).json({ code: 'ERR_VALIDATION', message: 'memberId is required' })
    }
    await query('DELETE FROM member_notifications WHERE member_id = $1', [memberId])
    res.json({ success: true })
  } catch (err) {
    next({ status: 500, code: 'ERR_NOTIF_CLEAR', message: 'Failed to clear notifications', details: { error: String(err) } })
  }
})

export default router
