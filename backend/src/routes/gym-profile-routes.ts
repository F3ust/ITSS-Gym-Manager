import { Router } from 'express'
import { query } from '../db/query'
import { requireRole } from '../middlewares/auth-middleware'

const router = Router()

router.get('/', async (_req, res, next) => {
  try {
    const result = await query('SELECT * FROM gym_profile LIMIT 1')
    res.json(result.rows[0] || null)
  } catch (err) {
    next({ status: 500, code: 'ERR_GYM_PROFILE_GET', message: 'Failed to fetch gym profile', details: { error: String(err) } })
  }
})

router.put('/', requireRole(['Owner']), async (req, res, next) => {
  try {
    const { name, address, phone, email, open_hours } = req.body
    if (!name || !address || !phone) {
      return res.status(400).json({ code: 'ERR_VALIDATION', message: 'Name, address, and phone are required' })
    }
    const result = await query(
      `UPDATE gym_profile SET name = $1, address = $2, phone = $3, email = $4, open_hours = $5, updated_at = NOW()
       WHERE id = (SELECT id FROM gym_profile LIMIT 1) RETURNING *`,
      [name, address, phone, email || '', open_hours || '']
    )
    if (!result.rows[0]) {
      return res.status(404).json({ code: 'ERR_NOT_FOUND', message: 'Gym profile not found' })
    }
    res.json(result.rows[0])
  } catch (err) {
    next({ status: 500, code: 'ERR_GYM_PROFILE_UPDATE', message: 'Failed to update gym profile', details: { error: String(err) } })
  }
})

export default router
