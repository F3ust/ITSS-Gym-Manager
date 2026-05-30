import request from 'supertest'
import { app } from '../src/app'

describe('health endpoint', () => {
  it('returns ok', async () => {
    const response = await request(app).get('/health')
    expect(response.status).toBe(200)
    expect(response.body).toEqual({ status: 'ok' })
  })
})

describe('gym profile', () => {
  it('returns gym profile data', async () => {
    const response = await request(app).get('/api/gym-profile')
    expect(response.status).toBe(200)
    expect(response.body).toHaveProperty('name')
    expect(response.body).toHaveProperty('address')
  })

  it('rejects update with missing fields', async () => {
    const response = await request(app).put('/api/gym-profile').set('x-role', 'Owner').send({ name: '' })
    expect(response.status).toBe(400)
    expect(response.body.code).toBe('ERR_VALIDATION')
  })
})

describe('audit logs', () => {
  it('returns audit logs array', async () => {
    const response = await request(app).get('/api/roles/audit-logs').set('x-role', 'Owner')
    expect(response.status).toBe(200)
    expect(Array.isArray(response.body)).toBe(true)
  })
})
