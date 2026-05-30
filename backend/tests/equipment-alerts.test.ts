import request from 'supertest'
import pool from '../src/db/pool'
import { app } from '../src/app'

describe('equipment alerts', () => {
  let openEquipmentId: string
  let warrantyEquipmentId: string
  let maintenanceLogId: string

  beforeAll(async () => {
    const openEquip = await pool.query(
      'INSERT INTO equipment (name, quantity, origin, status) VALUES ($1,$2,$3,$4) RETURNING *',
      ['Alert Equipment Open', 1, 'test', 'active']
    )
    openEquipmentId = openEquip.rows[0].id

    const warrantyEquip = await pool.query(
      'INSERT INTO equipment (name, quantity, origin, warranty_until, status) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      ['Alert Equipment Warranty', 1, 'test', '2024-01-01', 'active']
    )
    warrantyEquipmentId = warrantyEquip.rows[0].id

    const log = await pool.query(
      'INSERT INTO maintenance_logs (equipment_id, note, status) VALUES ($1,$2,$3) RETURNING *',
      [openEquipmentId, 'Needs urgent repair', 'open']
    )
    maintenanceLogId = log.rows[0].id
  })

  afterAll(async () => {
    await pool.query('DELETE FROM maintenance_logs WHERE id = $1', [maintenanceLogId])
    await pool.query('DELETE FROM equipment WHERE id IN ($1,$2)', [openEquipmentId, warrantyEquipmentId])
    await pool.end()
  })

  it('denies equipment alerts for non-staff roles', async () => {
    const response = await request(app).get('/api/equipment/alerts')
    expect(response.status).toBe(403)
    expect(response.body.code).toBe('ERR_FORBIDDEN')
  })

  it('returns open maintenance alerts for staff', async () => {
    const response = await request(app).get('/api/equipment/alerts?status=open').set('x-role', 'Staff')
    expect(response.status).toBe(200)
    expect(Array.isArray(response.body)).toBe(true)
    expect(response.body.some((item: any) => item.alert_type === 'maintenance' && item.equipment_id === openEquipmentId)).toBe(true)
  })

  it('returns warranty expired alerts for owner', async () => {
    const response = await request(app).get('/api/equipment/alerts?status=warranty_expired').set('x-role', 'Owner')
    expect(response.status).toBe(200)
    expect(Array.isArray(response.body)).toBe(true)
    expect(response.body.some((item: any) => item.alert_type === 'warranty' && item.equipment_id === warrantyEquipmentId)).toBe(true)
  })
})
