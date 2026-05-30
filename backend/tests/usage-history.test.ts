import request from 'supertest'
import { app } from '../src/app'

describe('usage-history endpoint', () => {
  it('rejects missing from', async () => {
    const res = await request(app).get('/api/members/usage-history?to=2026-12-31').set('x-role', 'Owner')
    expect(res.status).toBe(400)
    expect(res.body.code).toBe('ERR_VALIDATION')
  })

  it('rejects missing to', async () => {
    const res = await request(app).get('/api/members/usage-history?from=2026-01-01').set('x-role', 'Owner')
    expect(res.status).toBe(400)
    expect(res.body.code).toBe('ERR_VALIDATION')
  })

  it('rejects inverted range', async () => {
    const res = await request(app).get('/api/members/usage-history?from=2026-12-31&to=2026-01-01').set('x-role', 'Owner')
    expect(res.status).toBe(400)
    expect(res.body.code).toBe('ERR_VALIDATION')
  })

  it('denies PT role', async () => {
    const res = await request(app).get('/api/members/usage-history?from=2026-01-01&to=2026-12-31').set('x-role', 'PT')
    expect(res.status).toBe(403)
    expect(res.body.code).toBe('ERR_FORBIDDEN')
  })

  it('allows Owner with valid params', async () => {
    const res = await request(app).get('/api/members/usage-history?from=2026-01-01&to=2026-12-31&memberId=00000000-0000-0000-0000-000000000000').set('x-role', 'Owner')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('items')
  })

  it('allows Staff with valid params', async () => {
    const res = await request(app).get('/api/members/usage-history?from=2026-01-01&to=2026-12-31&memberId=00000000-0000-0000-0000-000000000000').set('x-role', 'Staff')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('items')
  })

  it('requires userId for Member role', async () => {
    const res = await request(app).get('/api/members/usage-history?from=2026-01-01&to=2026-12-31').set('x-role', 'Member')
    expect(res.status).toBe(400)
    expect(res.body.code).toBe('ERR_VALIDATION')
  })

  it('rejects Member accessing another member', async () => {
    const res = await request(app).get('/api/members/usage-history?from=2026-01-01&to=2026-12-31&memberId=00000000-0000-0000-0000-000000000000&userId=00000000-0000-0000-0000-000000000001').set('x-role', 'Member')
    expect(res.status).toBe(400)
    expect(res.body.code).toBe('ERR_VALIDATION')
  })

  it('rejects no role header', async () => {
    const res = await request(app).get('/api/members/usage-history?from=2026-01-01&to=2026-12-31')
    expect(res.status).toBe(403)
    expect(res.body.code).toBe('ERR_FORBIDDEN')
  })
})
