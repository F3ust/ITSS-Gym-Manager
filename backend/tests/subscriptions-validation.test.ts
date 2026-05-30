import request from 'supertest'
import { app } from '../src/app'

describe('subscriptions validation', () => {
  it('rejects missing fields', async () => {
    const response = await request(app).post('/api/subscriptions').send({})
    expect(response.status).toBe(400)
    expect(response.body.code).toBe('ERR_VALIDATION')
  })

  it('auto-seeds remaining_sessions from package session_count', async () => {
    // 1. Create a session-based package
    const pkgName = `Sess Sub Package ${Date.now()}`
    const pkgResponse = await request(app).post('/api/packages').send({
      name: pkgName,
      price: 1200000,
      category: 'pt',
      durationDays: 30,
      sessionCount: 12
    })
    expect(pkgResponse.status).toBe(201)
    const packageId = pkgResponse.body.id

    // 2. Create a member
    const phone = `09${Math.floor(10000000 + Math.random() * 90000000)}`
    const memberResponse = await request(app).post('/api/members').send({
      fullName: 'Test Sub Member',
      phone,
      dob: '1995-05-15',
      job: 'Engineer',
      memberType: 'regular'
    })
    expect(memberResponse.status).toBe(201)
    const memberId = memberResponse.body.id

    // 3. Create subscription, omitting remainingSessions
    const subResponse = await request(app).post('/api/subscriptions').send({
      memberId,
      packageId,
      startDate: '2026-05-18',
      endDate: '2026-06-17'
    })
    expect(subResponse.status).toBe(201)
    expect(subResponse.body.remaining_sessions).toBe(12)
    expect(subResponse.body.remaining_pt_sessions).toBeNull()
  })

  it('auto-seeds remaining_pt_sessions from package pt_session_count', async () => {
    const pkgName = `PT Sub Package ${Date.now()}`
    const pkgResponse = await request(app).post('/api/packages').send({
      name: pkgName,
      price: 2000000,
      category: 'pt',
      durationDays: 30,
      sessionCount: 10,
      ptSessionCount: 5
    })
    expect(pkgResponse.status).toBe(201)
    const packageId = pkgResponse.body.id

    const phone = `09${Math.floor(10000000 + Math.random() * 90000000)}`
    const memberResponse = await request(app).post('/api/members').send({
      fullName: 'PT Sub Member',
      phone,
      dob: '1995-06-15',
      job: 'Trainer',
      memberType: 'regular'
    })
    expect(memberResponse.status).toBe(201)
    const memberId = memberResponse.body.id

    const subResponse = await request(app).post('/api/subscriptions').send({
      memberId,
      packageId,
      startDate: '2026-05-18',
      endDate: '2026-06-17'
    })
    expect(subResponse.status).toBe(201)
    expect(subResponse.body.remaining_sessions).toBe(10)
    expect(subResponse.body.remaining_pt_sessions).toBe(5)
  })

  it('overrides remaining_pt_sessions from request body', async () => {
    const pkgName = `Override PT Sub Package ${Date.now()}`
    const pkgResponse = await request(app).post('/api/packages').send({
      name: pkgName,
      price: 2000000,
      category: 'pt',
      durationDays: 30,
      sessionCount: 10,
      ptSessionCount: 5
    })
    expect(pkgResponse.status).toBe(201)
    const packageId = pkgResponse.body.id

    const phone = `09${Math.floor(10000000 + Math.random() * 90000000)}`
    const memberResponse = await request(app).post('/api/members').send({
      fullName: 'Override PT Sub Member',
      phone,
      dob: '1995-07-15',
      job: 'Member',
      memberType: 'regular'
    })
    expect(memberResponse.status).toBe(201)
    const memberId = memberResponse.body.id

    const subResponse = await request(app).post('/api/subscriptions').send({
      memberId,
      packageId,
      startDate: '2026-05-18',
      endDate: '2026-06-17',
      remainingPtSessions: 3
    })
    expect(subResponse.status).toBe(201)
    expect(subResponse.body.remaining_pt_sessions).toBe(3)
  })

  it('denies DELETE for non-staff roles', async () => {
    const res = await request(app).delete('/api/subscriptions/some-id').set('x-role', 'Member')
    expect(res.status).toBe(403)
    expect(res.body.code).toBe('ERR_FORBIDDEN')
  })

  it('cancels subscription via DELETE', async () => {
    const pkgName = `Cancel Sub Pkg ${Date.now()}`
    const pkgRes = await request(app).post('/api/packages').set('x-role', 'Owner').send({
      name: pkgName, price: 500000, category: 'pt', durationDays: 30, sessionCount: 5
    })
    expect(pkgRes.status).toBe(201)

    const phone = `09${Math.floor(10000000 + Math.random() * 90000000)}`
    const memberRes = await request(app).post('/api/members').set('x-role', 'Owner').send({
      fullName: 'Cancel Sub Member', phone, dob: '1990-01-01', job: 'Tester', memberType: 'regular'
    })
    expect(memberRes.status).toBe(201)
    const memberId = memberRes.body.id

    const subRes = await request(app).post('/api/subscriptions').set('x-role', 'Owner').send({
      memberId, packageId: pkgRes.body.id, startDate: '2026-05-18', endDate: '2026-06-17'
    })
    expect(subRes.status).toBe(201)
    const subId = subRes.body.id

    const delRes = await request(app).delete(`/api/subscriptions/${subId}`).set('x-role', 'Owner')
    expect(delRes.status).toBe(200)

    const getRes = await request(app).get(`/api/subscriptions/${subId}`).set('x-role', 'Owner')
    expect(getRes.body.status).toBe('cancelled')
  })
})
