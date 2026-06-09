import { Router } from 'express'
import authRoutes from './auth-routes'
import membersRoutes from './members-routes'
import packagesRoutes from './packages-routes'
import subscriptionsRoutes from './subscriptions-routes'
import paymentsRoutes from './payments-routes'
import checkinsRoutes from './checkins-routes'
import roomTypesRoutes from './room-types-routes'
import roomsRoutes from './rooms-routes'
import equipmentRoutes from './equipment-routes'
import staffRoutes from './staff-routes'
import ptRoutes from './pt-routes'
import feedbackRoutes from './feedback-routes'
import reportsRoutes from './reports-routes'
import rolesRoutes from './roles-routes'
import notificationsRoutes from './notifications-routes'
import { query } from '../db/query'
import gymProfileRoutes from './gym-profile-routes'

const router = Router()

router.use('/auth', authRoutes)
router.use('/members', membersRoutes)
router.use('/packages', packagesRoutes)
router.use('/subscriptions', subscriptionsRoutes)
router.use('/payments', paymentsRoutes)
router.use('/check-ins', checkinsRoutes)
router.use('/room-types', roomTypesRoutes)
router.use('/rooms', roomsRoutes)
router.use('/equipment', equipmentRoutes)
router.use('/staff', staffRoutes)
router.use('/pt', ptRoutes)
router.use('/feedback', feedbackRoutes)
router.use('/reports', reportsRoutes)
router.use('/roles', rolesRoutes)
router.use('/notifications', notificationsRoutes)
router.use('/gym-profile', gymProfileRoutes)

// Cron trigger for membership expiration check
router.get('/cron/check-expiry', async (req, res, next) => {
  try {
    const result = await query(
      `INSERT INTO member_notifications (member_id, icon, message)
       SELECT s.member_id, '⚠️', 'Gói tập của bạn sắp hết hạn vào ngày mai!'
       FROM subscriptions s
       JOIN members m ON m.id = s.member_id
       WHERE s.end_date = CURRENT_DATE + 1
         AND s.status = 'active'
         AND NOT EXISTS (
           SELECT 1 FROM member_notifications mn
           WHERE mn.member_id = s.member_id
             AND mn.message LIKE '%h%E1%BA%A1n%'
             AND mn.created_at > CURRENT_DATE
         )`
    )
    res.json({ status: 'ok', insertedCount: result.rowCount || 0 })
  } catch (err) {
    next(err)
  }
})

export default router

