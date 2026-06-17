import { Router } from 'express'
import { query } from '../db/query'
import { requireRole } from '../middlewares/auth-middleware'

const router = Router()

router.post('/', async (req, res, next) => {
  try {
    const { name, quantity, origin, warrantyUntil, status } = req.body
    if (!name) {
      return res.status(400).json({ code: 'ERR_VALIDATION', message: 'Missing name' })
    }
    const result = await query(
      'INSERT INTO equipment (name, quantity, origin, warranty_until, status) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [name, quantity || 1, origin || null, warrantyUntil || null, status || 'active']
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    next({ status: 500, code: 'ERR_EQUIP_CREATE', message: 'Failed to create equipment', details: { error: String(err) } })
  }
})

router.get('/maintenance-logs', async (_req, res, next) => {
  try {
    const result = await query('SELECT ml.*, e.name AS equipment_name FROM maintenance_logs ml LEFT JOIN equipment e ON e.id = ml.equipment_id WHERE ml.status = $1 ORDER BY ml.created_at DESC', ['open'])
    res.json(result.rows)
  } catch (err) {
    next({ status: 500, code: 'ERR_MAINT_LOG_LIST', message: 'Failed to list maintenance logs', details: { error: String(err) } })
  }
})

router.get('/alerts', requireRole(['Owner', 'Staff']), async (req, res, next) => {
  try {
    const status = String(req.query.status || 'all').trim().toLowerCase()
    if (!['open', 'warranty_expired', 'all'].includes(status)) {
      return res.status(400).json({ code: 'ERR_VALIDATION', message: 'Invalid status filter' })
    }

    const queries: string[] = []
    if (status === 'open' || status === 'all') {
      queries.push(
        `SELECT ml.id AS id, ml.equipment_id, e.name AS equipment_name, 'maintenance' AS alert_type,
                ml.status AS status, ml.note AS message, ml.created_at, NULL::date AS warranty_until, e.status AS equipment_status
           FROM maintenance_logs ml
           JOIN equipment e ON e.id = ml.equipment_id
          WHERE ml.status = 'open'`
      )
    }
    if (status === 'warranty_expired' || status === 'all') {
      queries.push(
        `SELECT e.id AS id, e.id AS equipment_id, e.name AS equipment_name, 'warranty' AS alert_type,
                'expired' AS status, CONCAT('Warranty expired ', TO_CHAR(e.warranty_until, 'YYYY-MM-DD')) AS message,
                e.warranty_until::timestamp AS created_at, e.warranty_until, e.status AS equipment_status
           FROM equipment e
          WHERE e.warranty_until IS NOT NULL
            AND e.warranty_until < CURRENT_DATE`
      )
    }

    const result = await query(`${queries.join(' UNION ALL ')} ORDER BY created_at DESC`)
    res.json(result.rows)
  } catch (err) {
    next({ status: 500, code: 'ERR_EQUIP_ALERT_LIST', message: 'Failed to list equipment alerts', details: { error: String(err) } })
  }
})

router.get('/:id', async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM equipment WHERE id = $1', [req.params.id])
    if (!result.rows[0]) {
      return res.status(404).json({ code: 'ERR_NOT_FOUND', message: 'Equipment not found' })
    }
    res.json(result.rows[0])
  } catch (err) {
    next({ status: 500, code: 'ERR_EQUIP_GET', message: 'Failed to fetch equipment', details: { error: String(err) } })
  }
})

router.get('/', async (_req, res, next) => {
  try {
    const result = await query('SELECT * FROM equipment ORDER BY name ASC')
    res.json(result.rows)
  } catch (err) {
    next({ status: 500, code: 'ERR_EQUIP_LIST', message: 'Failed to list equipment', details: { error: String(err) } })
  }
})

router.patch('/:id', async (req, res, next) => {
  try {
    const { name, quantity, origin, warrantyUntil, status } = req.body
    if (status) {
      const currentRes = await query('SELECT status FROM equipment WHERE id = $1', [req.params.id])
      if (currentRes.rows[0]) {
        const currentStatus = currentRes.rows[0].status
        if (currentStatus === 'maintenance' && status !== 'maintenance') {
          await query('UPDATE maintenance_logs SET status = $1 WHERE equipment_id = $2 AND status = $3', ['closed', req.params.id, 'open'])
        } else if (currentStatus !== 'maintenance' && status === 'maintenance') {
          const openLogRes = await query('SELECT id FROM maintenance_logs WHERE equipment_id = $1 AND status = $2', [req.params.id, 'open'])
          if (openLogRes.rows.length === 0) {
            await query('INSERT INTO maintenance_logs (equipment_id, note, status) VALUES ($1,$2,$3)', [req.params.id, 'Status changed to maintenance by Owner', 'open'])
          }
        }
      }
    }
    const result = await query(
      'UPDATE equipment SET name = COALESCE($1,name), quantity = COALESCE($2,quantity), origin = COALESCE($3,origin), warranty_until = COALESCE($4,warranty_until), status = COALESCE($5,status) WHERE id = $6 RETURNING *',
      [name || null, quantity || null, origin || null, warrantyUntil || null, status || null, req.params.id]
    )
    if (!result.rows[0]) {
      return res.status(404).json({ code: 'ERR_NOT_FOUND', message: 'Equipment not found' })
    }
    res.json(result.rows[0])
  } catch (err) {
    next({ status: 500, code: 'ERR_EQUIP_UPDATE', message: 'Failed to update equipment', details: { error: String(err) } })
  }
})

router.delete('/:id', async (req, res, next) => {
  try {
    const result = await query('UPDATE equipment SET status = $1 WHERE id = $2 RETURNING *', ['inactive', req.params.id])
    if (!result.rows[0]) {
      return res.status(404).json({ code: 'ERR_NOT_FOUND', message: 'Equipment not found' })
    }
    res.json(result.rows[0])
  } catch (err) {
    next({ status: 500, code: 'ERR_EQUIP_DELETE', message: 'Failed to deactivate equipment', details: { error: String(err) } })
  }
})

router.post('/:id/maintenance', async (req, res, next) => {
  try {
    const { note, status } = req.body
    if (!note) {
      return res.status(400).json({ code: 'ERR_VALIDATION', message: 'Missing note' })
    }
    const result = await query(
      'INSERT INTO maintenance_logs (equipment_id, note, status) VALUES ($1,$2,$3) RETURNING *',
      [req.params.id, note, status || 'open']
    )
    await query('UPDATE equipment SET status = $1 WHERE id = $2', ['maintenance', req.params.id])
    res.status(201).json(result.rows[0])
  } catch (err) {
    next({ status: 500, code: 'ERR_EQUIP_MAINT', message: 'Failed to log maintenance', details: { error: String(err) } })
  }
})

router.patch('/maintenance-logs/:logId/resolve', async (req, res, next) => {
  try {
    const logId = req.params.logId
    const logResult = await query('SELECT * FROM maintenance_logs WHERE id = $1', [logId])
    if (!logResult.rows[0]) {
      return res.status(404).json({ code: 'ERR_NOT_FOUND', message: 'Maintenance log not found' })
    }
    const log = logResult.rows[0]
    await query('UPDATE maintenance_logs SET status = $1 WHERE id = $2', ['closed', logId])
    await query('UPDATE equipment SET status = $1 WHERE id = $2', ['active', log.equipment_id])
    res.json({ message: 'Maintenance completed' })
  } catch (err) {
    next({ status: 500, code: 'ERR_MAINT_LOG_RESOLVE', message: 'Failed to resolve maintenance log', details: { error: String(err) } })
  }
})

export default router
