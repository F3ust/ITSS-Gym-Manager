import request from 'supertest'
import { app } from '../src/app'

describe('feedback validation', () => {
  it('rejects missing fields on create', async () => {
    const response = await request(app).post('/api/feedback').send({})
    expect(response.status).toBe(400)
    expect(response.body.code).toBe('ERR_VALIDATION')
  })

  it('rejects missing status updates', async () => {
    const response = await request(app).patch('/api/feedback/1/status').send({})
    expect(response.status).toBe(400)
    expect(response.body.code).toBe('ERR_VALIDATION')
  })

  it('denies notifications list without role', async () => {
    const response = await request(app).get('/api/feedback/notifications')
    expect(response.status).toBe(403)
    expect(response.body.code).toBe('ERR_FORBIDDEN')
  })

  it('rejects feedback response missing response body', async () => {
    const response = await request(app).post('/api/feedback/1/response').set('x-role', 'Owner').send({})
    expect(response.status).toBe(400)
    expect(response.body.code).toBe('ERR_VALIDATION')
  })
})
