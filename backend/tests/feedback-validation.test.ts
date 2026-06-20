import request from 'supertest'
import { app } from '../src/app'

describe('feedback validation', () => {
  it('rejects missing fields on create', async () => {
    const response = await request(app).post('/api/feedback').send({})
    expect(response.status).toBe(400)
    expect(response.body.code).toBe('ERR_VALIDATION')
  })

  it('rejects missing status updates', async () => {
    const response = await request(app).patch('/api/feedback/1/status').set('x-role', 'Staff').send({})
    expect(response.status).toBe(400)
    expect(response.body.code).toBe('ERR_VALIDATION')
  })

  it('denies status updates without correct role', async () => {
    const response = await request(app).patch('/api/feedback/1/status').send({ status: 'processing' })
    expect(response.status).toBe(403)
    expect(response.body.code).toBe('ERR_FORBIDDEN')
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

  it('successfully updates feedback status', async () => {
    const phone = `09${Math.floor(10000000 + Math.random() * 90000000)}`
    const memberResponse = await request(app).post('/api/members').send({
      fullName: 'Feedback Test Member',
      phone,
      dob: '1990-10-10',
      job: 'Designer',
      memberType: 'regular'
    })
    expect(memberResponse.status).toBe(201)
    const memberId = memberResponse.body.id

    const feedbackResponse = await request(app).post('/api/feedback').send({
      memberId,
      category: 'cleanliness',
      content: 'The gym is very clean!'
    })
    expect(feedbackResponse.status).toBe(201)
    const feedbackId = feedbackResponse.body.id

    const updateResponse = await request(app)
      .patch(`/api/feedback/${feedbackId}/status`)
      .set('x-role', 'Staff')
      .send({ status: 'processing' })
    
    expect(updateResponse.status).toBe(200)
    expect(updateResponse.body.status).toBe('processing')

    // Verify that the notification status in feedback_notifications is also updated to 'processing'
    const notifResponse = await request(app)
      .get('/api/feedback/notifications?status=processing')
      .set('x-role', 'Staff')
    expect(notifResponse.status).toBe(200)
    const matchingNotif = notifResponse.body.find((n: any) => n.feedback_id === feedbackId)
    expect(matchingNotif).toBeDefined()
    expect(matchingNotif.status).toBe('processing')
  })
})
