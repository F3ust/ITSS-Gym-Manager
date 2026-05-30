import { Router } from 'express'
import { query } from '../db/query'

const router = Router()

router.post('/', async (req, res, next) => {
  try {
    const { name, durationDays, price, category, description, sessionCount, ptSessionCount } = req.body
    if (!name || !price || !category) {
      return res.status(400).json({ code: 'ERR_VALIDATION', message: 'Missing required fields' })
    }
    if (!durationDays && !sessionCount) {
      return res.status(400).json({ code: 'ERR_VALIDATION', message: 'Either durationDays or sessionCount must be provided' })
    }
    if (sessionCount !== undefined && sessionCount !== null) {
      const sCount = Number(sessionCount)
      if (!Number.isInteger(sCount) || sCount <= 0) {
        return res.status(400).json({ code: 'ERR_VALIDATION', message: 'sessionCount must be a positive integer' })
      }
    }
    if (ptSessionCount !== undefined && ptSessionCount !== null) {
      const psCount = Number(ptSessionCount)
      if (!Number.isInteger(psCount) || psCount <= 0) {
        return res.status(400).json({ code: 'ERR_VALIDATION', message: 'ptSessionCount must be a positive integer' })
      }
    }
    const result = await query(
      'INSERT INTO packages (name, duration_days, price, category, session_count, pt_session_count, description) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [name, durationDays || 30, price, category, sessionCount || null, ptSessionCount || null, description || null]
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    next({ status: 500, code: 'ERR_PACKAGE_CREATE', message: 'Failed to create package', details: { error: String(err) } })
  }
})

router.get('/', async (_req, res, next) => {
  try {
    const result = await query('SELECT * FROM packages ORDER BY name ASC')
    res.json(result.rows)
  } catch (err) {
    next({ status: 500, code: 'ERR_PACKAGE_LIST', message: 'Failed to list packages', details: { error: String(err) } })
  }
})

router.get('/:id', async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM packages WHERE id = $1', [req.params.id])
    if (!result.rows[0]) {
      return res.status(404).json({ code: 'ERR_NOT_FOUND', message: 'Package not found' })
    }
    res.json(result.rows[0])
  } catch (err) {
    next({ status: 500, code: 'ERR_PACKAGE_GET', message: 'Failed to fetch package', details: { error: String(err) } })
  }
})

router.patch('/:id', async (req, res, next) => {
  try {
    const { name, durationDays, price, category, description, sessionCount, ptSessionCount, status } = req.body
    if (sessionCount !== undefined && sessionCount !== null) {
      const sCount = Number(sessionCount)
      if (!Number.isInteger(sCount) || sCount <= 0) {
        return res.status(400).json({ code: 'ERR_VALIDATION', message: 'sessionCount must be a positive integer' })
      }
    }
    if (ptSessionCount !== undefined && ptSessionCount !== null) {
      const psCount = Number(ptSessionCount)
      if (!Number.isInteger(psCount) || psCount <= 0) {
        return res.status(400).json({ code: 'ERR_VALIDATION', message: 'ptSessionCount must be a positive integer' })
      }
    }
    const result = await query(
      'UPDATE packages SET name = COALESCE($1,name), duration_days = COALESCE($2,duration_days), price = COALESCE($3,price), category = COALESCE($4,category), session_count = COALESCE($5,session_count), pt_session_count = COALESCE($6,pt_session_count), description = COALESCE($7,description), status = COALESCE($8,status) WHERE id = $9 RETURNING *',
      [name || null, durationDays || null, price || null, category || null, sessionCount || null, ptSessionCount !== undefined ? ptSessionCount : null, description || null, status || null, req.params.id]
    )
    if (!result.rows[0]) {
      return res.status(404).json({ code: 'ERR_NOT_FOUND', message: 'Package not found' })
    }
    res.json(result.rows[0])
  } catch (err) {
    next({ status: 500, code: 'ERR_PACKAGE_UPDATE', message: 'Failed to update package', details: { error: String(err) } })
  }
})

router.delete('/:id', async (req, res, next) => {
  try {
    const result = await query('UPDATE packages SET status = $1 WHERE id = $2 RETURNING *', ['inactive', req.params.id])
    if (!result.rows[0]) {
      return res.status(404).json({ code: 'ERR_NOT_FOUND', message: 'Package not found' })
    }
    res.json(result.rows[0])
  } catch (err) {
    next({ status: 500, code: 'ERR_PACKAGE_DELETE', message: 'Failed to deactivate package', details: { error: String(err) } })
  }
})

export default router
