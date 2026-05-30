import request from 'supertest'
import { app } from '../src/app'

describe('payments validation', () => {
  it('rejects missing fields', async () => {
    const response = await request(app).post('/api/payments').send({})
    expect(response.status).toBe(400)
    expect(response.body.code).toBe('ERR_VALIDATION')
  })

  it('rejects non-numeric amount', async () => {
    const response = await request(app)
      .post('/api/payments')
      .send({ subscriptionId: '1', amount: 'abc', method: 'cash' })
    expect(response.status).toBe(400)
    expect(response.body.code).toBe('ERR_VALIDATION')
  })

  it('rejects negative amount', async () => {
    const response = await request(app)
      .post('/api/payments')
      .send({ subscriptionId: '1', amount: -1, method: 'cash' })
    expect(response.status).toBe(400)
    expect(response.body.code).toBe('ERR_VALIDATION')
  })

  it('rejects invalid amount type', async () => {
    const response = await request(app)
      .post('/api/payments')
      .send({ subscriptionId: '1', amount: [], method: 'cash' })
    expect(response.status).toBe(400)
    expect(response.body.code).toBe('ERR_VALIDATION')
  })

  it('rejects non-string method', async () => {
    const response = await request(app)
      .post('/api/payments')
      .send({ subscriptionId: '1', amount: 0, method: 123 })
    expect(response.status).toBe(400)
    expect(response.body.code).toBe('ERR_VALIDATION')
  })

  it('rejects blank method', async () => {
    const response = await request(app)
      .post('/api/payments')
      .send({ subscriptionId: '1', amount: 0, method: '' })
    expect(response.status).toBe(400)
    expect(response.body.code).toBe('ERR_VALIDATION')
  })
})
