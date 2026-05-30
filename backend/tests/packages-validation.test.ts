import request from 'supertest'
import { app } from '../src/app'

describe('packages validation', () => {
  it('rejects missing fields', async () => {
    const response = await request(app).post('/api/packages').send({})
    expect(response.status).toBe(400)
    expect(response.body.code).toBe('ERR_VALIDATION')
  })

  it('rejects if both durationDays and sessionCount are missing', async () => {
    const response = await request(app).post('/api/packages').send({
      name: 'Test Package No Dur No Sess',
      price: 100000,
      category: 'membership'
    })
    expect(response.status).toBe(400)
    expect(response.body.code).toBe('ERR_VALIDATION')
  })

  it('rejects invalid sessionCount', async () => {
    const response = await request(app).post('/api/packages').send({
      name: 'Test Package Invalid Sess',
      price: 100000,
      category: 'membership',
      durationDays: 30,
      sessionCount: -5
    })
    expect(response.status).toBe(400)
    expect(response.body.code).toBe('ERR_VALIDATION')
  })

  it('rejects invalid ptSessionCount', async () => {
    const response = await request(app).post('/api/packages').send({
      name: 'Test Package Invalid PT',
      price: 100000,
      category: 'pt',
      durationDays: 30,
      ptSessionCount: 0
    })
    expect(response.status).toBe(400)
    expect(response.body.code).toBe('ERR_VALIDATION')
  })

  it('successfully creates a valid session-based package', async () => {
    const uniqueName = `Session PT Package ${Date.now()}`
    const response = await request(app).post('/api/packages').send({
      name: uniqueName,
      price: 1500000,
      category: 'pt',
      durationDays: 60,
      sessionCount: 15,
      description: '15 sessions package test'
    })
    expect(response.status).toBe(201)
    expect(response.body.name).toBe(uniqueName)
    expect(response.body.session_count).toBe(15)
  })

  it('successfully creates package with sessionCount and ptSessionCount', async () => {
    const uniqueName = `Full PT Package ${Date.now()}`
    const response = await request(app).post('/api/packages').send({
      name: uniqueName,
      price: 2500000,
      category: 'pt',
      durationDays: 60,
      sessionCount: 15,
      ptSessionCount: 5
    })
    expect(response.status).toBe(201)
    expect(response.body.session_count).toBe(15)
    expect(response.body.pt_session_count).toBe(5)
  })
})
