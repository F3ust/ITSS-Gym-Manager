import { Router } from 'express'
import { query } from '../db/query'
import { logAudit } from '../utils/audit-logger'
import { requireRole } from '../middlewares/auth-middleware'

const router = Router()

router.get('/', async (_req, res, next) => {
  try {
    const result = await query('SELECT * FROM roles ORDER BY name ASC')
    res.json(result.rows)
  } catch (err) {
    next({ status: 500, code: 'ERR_ROLES_LIST', message: 'Failed to list roles', details: { error: String(err) } })
  }
})

router.get('/audit-logs', requireRole(['Owner']), async (_req, res, _next) => {
  try {
    const result = await query(
      `SELECT a.id, a.user_id, a.action, a.details, a.created_at, u.username
       FROM audit_logs a LEFT JOIN users u ON u.id = a.user_id
       ORDER BY a.created_at DESC LIMIT 200`
    )
    res.json(result.rows)
  } catch {
    res.json([])
  }
})

router.patch('/users/:id/status', async (req, res, next) => {
  try {
    const { status } = req.body
    if (!status || !['active', 'inactive'].includes(status)) {
      return res.status(400).json({ code: 'ERR_VALIDATION', message: 'Status must be active or inactive' })
    }
    const result = await query('UPDATE users SET status = $1 WHERE id = $2 RETURNING id, username, status', [status, req.params.id])
    if (!result.rows[0]) {
      return res.status(404).json({ code: 'ERR_NOT_FOUND', message: 'User not found' })
    }
    logAudit(req.params.id, 'status_change', { status })
    res.json(result.rows[0])
  } catch (err) {
    next({ status: 500, code: 'ERR_USER_STATUS', message: 'Failed to update user status', details: { error: String(err) } })
  }
})

router.patch('/users/:id/role', async (req, res, next) => {
  try {
    const { role } = req.body
    if (!role) {
      return res.status(400).json({ code: 'ERR_VALIDATION', message: 'Missing role' })
    }
    const roleResult = await query('SELECT id FROM roles WHERE name = $1', [role])
    if (!roleResult.rows[0]) {
      return res.status(400).json({ code: 'ERR_VALIDATION', message: 'Invalid role name' })
    }
    await query('DELETE FROM user_roles WHERE user_id = $1', [req.params.id])
    await query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)', [req.params.id, roleResult.rows[0].id])
    logAudit(req.params.id, 'role_change', { role })
    res.json({ success: true })
  } catch (err) {
    next({ status: 500, code: 'ERR_USER_ROLE', message: 'Failed to update user role', details: { error: String(err) } })
  }
})

router.get('/users', async (_req, res, next) => {
  try {
    const result = await query(
      `SELECT u.id, u.username, u.status, u.created_at, r.name AS role
       FROM users u LEFT JOIN user_roles ur ON ur.user_id = u.id LEFT JOIN roles r ON r.id = ur.role_id
       ORDER BY u.created_at DESC`
    )
    res.json(result.rows)
  } catch (err) {
    next({ status: 500, code: 'ERR_USERS_LIST', message: 'Failed to list users', details: { error: String(err) } })
  }
})

export default router
