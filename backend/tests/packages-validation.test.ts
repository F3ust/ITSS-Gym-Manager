import request from 'supertest'
import { app } from '../src/app'

describe('packages validation', () => {
  it('rejects missing fields', async () => {
    const response = await request(app).post('/api/packages').send({})
    expect(response.status).toBe(400)
    expect(response.body.code).toBe('ERR_VALIDATION')
  })

  it('rejects if durationDays is missing for membership package', async () => {
    const response = await request(app).post('/api/packages').send({
      name: 'Test Package No Dur',
      price: 100000,
      category: 'membership'
    })
    expect(response.status).toBe(400)
    expect(response.body.code).toBe('ERR_VALIDATION')
  })

  it('rejects invalid category', async () => {
    const response = await request(app).post('/api/packages').send({
      name: 'Test Package Invalid Category',
      price: 100000,
      category: 'invalid_category',
      durationDays: 30
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

  it('successfully creates a valid PT package', async () => {
    const uniqueName = `PT Package ${Date.now()}`
    const response = await request(app).post('/api/packages').send({
      name: uniqueName,
      price: 1500000,
      category: 'pt',
      ptSessionCount: 15,
      description: '15 PT sessions package test'
    })
    expect(response.status).toBe(201)
    expect(response.body.name).toBe(uniqueName)
    expect(response.body.pt_session_count).toBe(15)
  })

  it('successfully creates a valid combo package', async () => {
    const uniqueName = `Combo Package ${Date.now()}`
    const response = await request(app).post('/api/packages').send({
      name: uniqueName,
      price: 2500000,
      category: 'combo',
      durationDays: 60,
      ptSessionCount: 5
    })
    expect(response.status).toBe(201)
    expect(response.body.duration_days).toBe(60)
    expect(response.body.pt_session_count).toBe(5)
  })
})
