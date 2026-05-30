import request from 'supertest'
import { app } from '../src/app'

describe('members validation', () => {
  it('rejects missing fields', async () => {
    const response = await request(app).post('/api/members').send({})
    expect(response.status).toBe(400)
    expect(response.body.code).toBe('ERR_VALIDATION')
  })
})

describe('registration DOB validation', () => {
  it('rejects missing DOB', async () => {
    const response = await request(app).post('/api/auth/register').send({ name: 'Test', phone: '0987654321', password: 'Pass1234' })
    expect(response.status).toBe(400)
    expect(response.body.code).toBe('ERR_VALIDATION')
    expect(response.body.message).toMatch(/date of birth/i)
  })

  it('rejects invalid DOB format', async () => {
    const response = await request(app).post('/api/auth/register').send({ name: 'Test', phone: '0987654321', password: 'Pass1234', dob: '2020-01-01' })
    expect(response.status).toBe(400)
    expect(response.body.code).toBe('ERR_VALIDATION')
    expect(response.body.message).toMatch(/dd\/MM\/yyyy/i)
  })

  it('rejects under-16 DOB', async () => {
    const response = await request(app).post('/api/auth/register').send({ name: 'Test', phone: '0987654321', password: 'Pass1234', dob: '01/01/2020' })
    expect(response.status).toBe(400)
    expect(response.body.code).toBe('ERR_VALIDATION')
    expect(response.body.message).toMatch(/16 years/i)
  })
})
