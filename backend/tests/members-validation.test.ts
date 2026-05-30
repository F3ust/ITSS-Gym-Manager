import request from 'supertest'
import { app } from '../src/app'

describe('members validation', () => {
  it('rejects missing fields', async () => {
    const response = await request(app).post('/api/members').send({})
    expect(response.status).toBe(400)
    expect(response.body.code).toBe('ERR_VALIDATION')
  })

  it('rejects member with invalid dob', async () => {
    const response = await request(app).post('/api/members').send({
      fullName: 'Test', phone: '0999999999', dob: 'not-a-date', job: 'Student', memberType: 'regular'
    })
    expect(response.status).toBe(400)
    expect(response.body.code).toBe('ERR_VALIDATION')
  })

  it('rejects member under 16 years old', async () => {
    const response = await request(app).post('/api/members').send({
      fullName: 'Young', phone: '0999999998', dob: '2015-06-01', job: 'Student', memberType: 'regular'
    })
    expect(response.status).toBe(400)
    expect(response.body.code).toBe('ERR_VALIDATION')
    expect(response.body.message).toMatch(/16 years/i)
  })

  it('rejects staff creation without username/password', async () => {
    const response = await request(app).post('/api/staff').set('x-role', 'Owner').send({ fullName: 'Staff', roleTitle: 'Receptionist' })
    expect(response.status).toBe(400)
    expect(response.body.code).toBe('ERR_VALIDATION')
  })

  it('rejects staff creation with short password', async () => {
    const response = await request(app).post('/api/staff').set('x-role', 'Owner').send({
      fullName: 'Staff', roleTitle: 'Receptionist', username: '0999999997', password: 'short'
    })
    expect(response.status).toBe(400)
    expect(response.body.code).toBe('ERR_VALIDATION')
  })

  it('rejects PT creation without username/password', async () => {
    const response = await request(app).post('/api/pt').set('x-role', 'Owner').send({ fullName: 'Trainer' })
    expect(response.status).toBe(400)
    expect(response.body.code).toBe('ERR_VALIDATION')
  })

  it('rejects PT creation with short password', async () => {
    const response = await request(app).post('/api/pt').set('x-role', 'Owner').send({
      fullName: 'Trainer', username: '0999999996', password: '123'
    })
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
