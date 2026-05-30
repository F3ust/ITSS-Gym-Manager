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

export default router
