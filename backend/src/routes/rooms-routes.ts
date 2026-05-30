import { Router } from 'express'
import { query } from '../db/query'

const router = Router()

router.post('/', async (req, res, next) => {
  try {
    const { roomTypeId, name, capacity, status } = req.body
    if (!name) {
      return res.status(400).json({ code: 'ERR_VALIDATION', message: 'Missing name' })
    }
    const result = await query(
      'INSERT INTO rooms (room_type_id, name, capacity, status) VALUES ($1,$2,$3,$4) RETURNING *',
      [roomTypeId || null, name, capacity || null, status || 'active']
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    next({ status: 500, code: 'ERR_ROOM_CREATE', message: 'Failed to create room', details: { error: String(err) } })
  }
})

router.get('/:id', async (req, res, next) => {
  try {
    const result = await query('SELECT rooms.*, room_types.name AS room_type_name FROM rooms LEFT JOIN room_types ON room_types.id = rooms.room_type_id WHERE rooms.id = $1', [req.params.id])
    if (!result.rows[0]) {
      return res.status(404).json({ code: 'ERR_NOT_FOUND', message: 'Room not found' })
    }
    res.json(result.rows[0])
  } catch (err) {
    next({ status: 500, code: 'ERR_ROOM_GET', message: 'Failed to fetch room', details: { error: String(err) } })
  }
})

router.get('/', async (_req, res, next) => {
  try {
    const result = await query(
      'SELECT rooms.*, room_types.name AS room_type_name FROM rooms LEFT JOIN room_types ON room_types.id = rooms.room_type_id ORDER BY rooms.name ASC'
    )
    res.json(result.rows)
  } catch (err) {
    next({ status: 500, code: 'ERR_ROOM_LIST', message: 'Failed to list rooms', details: { error: String(err) } })
  }
})

router.patch('/:id', async (req, res, next) => {
  try {
    const { roomTypeId, name, capacity, status } = req.body
    const result = await query(
      'UPDATE rooms SET room_type_id = COALESCE($1,room_type_id), name = COALESCE($2,name), capacity = COALESCE($3,capacity), status = COALESCE($4,status) WHERE id = $5 RETURNING *',
      [roomTypeId || null, name || null, capacity || null, status || null, req.params.id]
    )
    if (!result.rows[0]) {
      return res.status(404).json({ code: 'ERR_NOT_FOUND', message: 'Room not found' })
    }
    res.json(result.rows[0])
  } catch (err) {
    next({ status: 500, code: 'ERR_ROOM_UPDATE', message: 'Failed to update room', details: { error: String(err) } })
  }
})

router.delete('/:id', async (req, res, next) => {
  try {
    const result = await query('UPDATE rooms SET status = $1 WHERE id = $2 RETURNING *', ['inactive', req.params.id])
    if (!result.rows[0]) {
      return res.status(404).json({ code: 'ERR_NOT_FOUND', message: 'Room not found' })
    }
    res.json(result.rows[0])
  } catch (err) {
    next({ status: 500, code: 'ERR_ROOM_DELETE', message: 'Failed to deactivate room', details: { error: String(err) } })
  }
})

export default router
