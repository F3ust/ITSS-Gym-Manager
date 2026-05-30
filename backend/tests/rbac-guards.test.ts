import request from 'supertest'
import { app } from '../src/app'

describe('rbac guards', () => {
  it('denies staff schedules for non-owner', async () => {
    const response = await request(app).get('/api/staff/schedules')
    expect(response.status).toBe(403)
    expect(response.body.code).toBe('ERR_FORBIDDEN')
  })

  it('denies staff performance report for staff role', async () => {
    const response = await request(app)
      .get('/api/reports/staff-performance?from=2025-01-01&to=2025-01-31')
      .set('x-role', 'Staff')
    expect(response.status).toBe(403)
    expect(response.body.code).toBe('ERR_FORBIDDEN')
  })

  it('denies staff performance report for member role', async () => {
    const response = await request(app)
      .get('/api/reports/staff-performance?from=2025-01-01&to=2025-01-31')
      .set('x-role', 'Member')
    expect(response.status).toBe(403)
    expect(response.body.code).toBe('ERR_FORBIDDEN')
  })

  it('allows owner through RBAC before validation', async () => {
    const response = await request(app).get('/api/reports/staff-performance').set('x-role', 'Owner')
    expect(response.status).toBe(400)
    expect(response.body.code).toBe('ERR_VALIDATION')
  })

  it('denies gym profile update without role', async () => {
    const response = await request(app).put('/api/gym-profile').send({ name: 'Gym', address: '123 St', phone: '0123456789' })
    expect(response.status).toBe(403)
    expect(response.body.code).toBe('ERR_FORBIDDEN')
  })

  it('denies gym profile update for non-owner role', async () => {
    const response = await request(app).put('/api/gym-profile').set('x-role', 'Staff').send({ name: 'Gym', address: '123 St', phone: '0123456789' })
    expect(response.status).toBe(403)
    expect(response.body.code).toBe('ERR_FORBIDDEN')
  })

  it('denies feedback response without role', async () => {
    const response = await request(app).post('/api/feedback/1/response').send({ response: 'Thanks' })
    expect(response.status).toBe(403)
    expect(response.body.code).toBe('ERR_FORBIDDEN')
  })

  it('allows owner through feedback response RBAC before validation', async () => {
    const response = await request(app).post('/api/feedback/1/response').set('x-role', 'Owner').send({})
    expect(response.status).toBe(400)
    expect(response.body.code).toBe('ERR_VALIDATION')
  })

  it('allows staff through feedback response RBAC before validation', async () => {
    const response = await request(app).post('/api/feedback/1/response').set('x-role', 'Staff').send({})
    expect(response.status).toBe(400)
    expect(response.body.code).toBe('ERR_VALIDATION')
  })
})
