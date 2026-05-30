import request from 'supertest'
import { app } from '../src/app'

describe('check-in validation', () => {
  it('rejects missing fields', async () => {
    const response = await request(app).post('/api/check-ins').send({})
    expect(response.status).toBe(400)
    expect(response.body.code).toBe('ERR_VALIDATION')
  })

  it('denies fingerprint wrong', async () => {
    const response = await request(app).post('/api/check-ins').send({ memberId: '1', method: 'fingerprint_wrong' })
    expect(response.status).toBe(403)
    expect(response.body.code).toBe('ERR_FINGERPRINT_DENIED')
  })

  it('denies fingerprint wrong with spacing', async () => {
    const response = await request(app).post('/api/check-ins').send({ memberId: '1', method: 'Fingerprint wrong' })
    expect(response.status).toBe(403)
    expect(response.body.code).toBe('ERR_FINGERPRINT_DENIED')
  })

  it('decrements remaining_sessions and remaining_pt_sessions independently', async () => {
    // 1. Create a package with 2 regular sessions + 2 PT sessions
    const pkgName = `Sess Checkin Package ${Date.now()}`
    const pkgResponse = await request(app).post('/api/packages').send({
      name: pkgName,
      price: 500000,
      category: 'pt',
      durationDays: 30,
      sessionCount: 2,
      ptSessionCount: 2
    })
    expect(pkgResponse.status).toBe(201)
    const packageId = pkgResponse.body.id

    // 2. Create a member
    const phone = `09${Math.floor(10000000 + Math.random() * 90000000)}`
    const memberResponse = await request(app).post('/api/members').send({
      fullName: 'Sess Checkin Member',
      phone,
      dob: '1990-10-10',
      job: 'Designer',
      memberType: 'regular'
    })
    expect(memberResponse.status).toBe(201)
    const memberId = memberResponse.body.id

    // 3. Create active subscription
    const subResponse = await request(app).post('/api/subscriptions').send({
      memberId,
      packageId,
      startDate: '2026-05-18',
      endDate: '2026-06-17'
    })
    expect(subResponse.status).toBe(201)
    expect(subResponse.body.remaining_sessions).toBe(2)
    expect(subResponse.body.remaining_pt_sessions).toBe(2)

    // 4. Regular check-in: decrements sessions from 2 to 1
    const checkin1 = await request(app).post('/api/check-ins').send({
      memberId,
      method: 'card'
    })
    expect(checkin1.status).toBe(201)
    expect(checkin1.body.remaining_sessions_after).toBe(1)

    // 5. PT check-in: decrements PT sessions from 2 to 1
    const ptCheckin = await request(app).post('/api/check-ins').send({
      memberId,
      method: 'card',
      withPt: true
    })
    expect(ptCheckin.status).toBe(201)
    expect(ptCheckin.body.remaining_sessions_after).toBe(1)

    // 6. Second regular check-in: sessions 1 to 0
    const checkin2 = await request(app).post('/api/check-ins').send({
      memberId,
      method: 'card'
    })
    expect(checkin2.status).toBe(201)
    expect(checkin2.body.remaining_sessions_after).toBe(0)

    // 7. Third regular check-in: should be denied
    const checkin3 = await request(app).post('/api/check-ins').send({
      memberId,
      method: 'card'
    })
    expect(checkin3.status).toBe(409)
    expect(checkin3.body.code).toBe('ERR_NO_SESSIONS')
  }, 15000)

  it('rejects PT check-in when remaining_pt_sessions is null', async () => {
    const pkgName = `No PT Pkg ${Date.now()}`
    const pkgResponse = await request(app).post('/api/packages').send({
      name: pkgName,
      price: 300000,
      category: 'membership',
      durationDays: 30
    })
    expect(pkgResponse.status).toBe(201)
    const packageId = pkgResponse.body.id

    const phone = `09${Math.floor(10000000 + Math.random() * 90000000)}`
    const memberResponse = await request(app).post('/api/members').send({
      fullName: 'No PT Member',
      phone,
      dob: '1992-10-10',
      job: 'Tester',
      memberType: 'regular'
    })
    expect(memberResponse.status).toBe(201)
    const memberId = memberResponse.body.id

    await request(app).post('/api/subscriptions').send({
      memberId,
      packageId,
      startDate: '2026-05-18',
      endDate: '2026-06-17'
    })

    const response = await request(app).post('/api/check-ins').send({
      memberId,
      method: 'card',
      withPt: true
    })
    expect(response.status).toBe(400)
    expect(response.body.code).toBe('ERR_NO_PT_SESSIONS')
  })

  it('rejects check-in when subscription has expired (end_date in the past)', async () => {
    const pkgName = `Expired Pkg ${Date.now()}`
    const pkgResponse = await request(app).post('/api/packages').send({
      name: pkgName, price: 300000, category: 'membership', durationDays: 30
    })
    expect(pkgResponse.status).toBe(201)

    const phone = `09${Math.floor(10000000 + Math.random() * 90000000)}`
    const memberResponse = await request(app).post('/api/members').send({
      fullName: 'Expired Sub Member', phone, dob: '1992-10-10', job: 'Tester', memberType: 'regular'
    })
    expect(memberResponse.status).toBe(201)
    const memberId = memberResponse.body.id

    // Create sub with end_date in the past
    await request(app).post('/api/subscriptions').send({
      memberId, packageId: pkgResponse.body.id, startDate: '2025-01-01', endDate: '2025-02-01'
    })

    const response = await request(app).post('/api/check-ins').send({
      memberId, method: 'card'
    })
    expect(response.status).toBe(400)
    expect(response.body.code).toBe('ERR_SUB_INACTIVE')
  })
})
