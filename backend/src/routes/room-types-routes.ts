import { Router } from 'express'
import { query } from '../db/query'

const router = Router()

router.post('/', async (req, res, next) => {
  try {
    const { name, description } = req.body
    if (!name) {
      return res.status(400).json({ code: 'ERR_VALIDATION', message: 'Missing name' })
    }
    const result = await query(
      'INSERT INTO room_types (name, description) VALUES ($1,$2) RETURNING *',
      [name, description || null]
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    next({ status: 500, code: 'ERR_ROOMTYPE_CREATE', message: 'Failed to create room type', details: { error: String(err) } })
  }
})

router.get('/:id', async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM room_types WHERE id = $1', [req.params.id])
    if (!result.rows[0]) {
      return res.status(404).json({ code: 'ERR_NOT_FOUND', message: 'Room type not found' })
    }
    res.json(result.rows[0])
  } catch (err) {
    next({ status: 500, code: 'ERR_ROOMTYPE_GET', message: 'Failed to fetch room type', details: { error: String(err) } })
  }
})

router.get('/', async (_req, res, next) => {
  try {
    const result = await query('SELECT * FROM room_types ORDER BY name ASC')
    res.json(result.rows)
  } catch (err) {
    next({ status: 500, code: 'ERR_ROOMTYPE_LIST', message: 'Failed to list room types', details: { error: String(err) } })
  }
})

router.patch('/:id', async (req, res, next) => {
  try {
    const { name, description, status } = req.body
    const result = await query(
      'UPDATE room_types SET name = COALESCE($1,name), description = COALESCE($2,description), status = COALESCE($3,status) WHERE id = $4 RETURNING *',
      [name || null, description || null, status || null, req.params.id]
    )
    if (!result.rows[0]) {
      return res.status(404).json({ code: 'ERR_NOT_FOUND', message: 'Room type not found' })
    }
    res.json(result.rows[0])
  } catch (err) {
    next({ status: 500, code: 'ERR_ROOMTYPE_UPDATE', message: 'Failed to update room type', details: { error: String(err) } })
  }
})

router.delete('/:id', async (req, res, next) => {
  try {
    const result = await query('UPDATE room_types SET status = $1 WHERE id = $2 RETURNING *', ['inactive', req.params.id])
    if (!result.rows[0]) {
      return res.status(404).json({ code: 'ERR_NOT_FOUND', message: 'Room type not found' })
    }
    res.json(result.rows[0])
  } catch (err) {
    next({ status: 500, code: 'ERR_ROOMTYPE_DELETE', message: 'Failed to deactivate room type', details: { error: String(err) } })
  }
})

export default router
