import { Routes, Route, Navigate } from 'react-router-dom'
import { DashboardLayout } from './layouts/dashboard-layout'
import { RouteGuard } from './components/route-guard'
import { AuthGuard } from './components/auth-guard'
import LoginPage from './pages/login'
import CreateAccountPage from './pages/create-account'
import NotFound from './pages/shared/not-found'
import NotificationsPage from './pages/shared/notifications'
import HelpPage from './pages/shared/help'
import StaffSchedulesPage from './pages/owner/staff-schedules'
import OwnerDashboard from './pages/owner/owner-dashboard'
import PackagesPage from './pages/owner/packages'
import StaffPage from './pages/owner/staff'
import RoomTypesPage from './pages/owner/room-types'
import RoomsPage from './pages/owner/rooms'
import EquipmentPage from './pages/owner/equipment'
import ReportsPage from './pages/owner/reports'
import SettingsPage from './pages/owner/settings'
import StaffDashboard from './pages/staff/staff-dashboard'
import StaffMembersPage from './pages/staff/members'
import CheckInPage from './pages/staff/check-in'
import PackageRegistrationPage from './pages/staff/package-registration'
import PaymentPage from './pages/staff/payment'
import RenewalsPage from './pages/staff/renewals'
import EquipmentMaintenancePage from './pages/staff/equipment-maintenance'
import FeedbackInboxPage from './pages/staff/feedback-inbox'
import PtDashboard from './pages/pt/pt-dashboard'
import AssignedMembersPage from './pages/pt/assigned-members'
import PtSchedulePage from './pages/pt/schedule'
import WorkoutLogsPage from './pages/pt/workout-logs'
import ProgressPage from './pages/pt/progress'
import MemberDashboard from './pages/member/member-dashboard'
import ProfilePage from './pages/member/profile'
import AvailablePackagesPage from './pages/member/available-packages'
import RegisterPackagePage from './pages/member/register-package'
import MemberPaymentPage from './pages/member/payment'
import MyPackagePage from './pages/member/my-package'
import WorkoutHistoryPage from './pages/member/workout-history'
import SendFeedbackPage from './pages/member/send-feedback'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<CreateAccountPage />} />
      <Route path="/notifications" element={<AuthGuard><DashboardLayout /></AuthGuard>}>
        <Route index element={<NotificationsPage />} />
      </Route>
      <Route path="/help" element={<AuthGuard><DashboardLayout /></AuthGuard>}>
        <Route index element={<HelpPage />} />
      </Route>
      <Route element={<RouteGuard requiredRole="owner"><DashboardLayout /></RouteGuard>}>
        <Route path="/owner" element={<OwnerDashboard />} />
        <Route path="/owner/packages" element={<PackagesPage />} />
        <Route path="/owner/packages/:id" element={<PackagesPage />} />
        <Route path="/owner/staff" element={<StaffPage />} />
        <Route path="/owner/staff/:id" element={<StaffPage />} />
        <Route path="/owner/schedules" element={<StaffSchedulesPage />} />
        <Route path="/owner/facilities/room-types" element={<RoomTypesPage />} />
        <Route path="/owner/facilities/rooms" element={<RoomsPage />} />
        <Route path="/owner/equipment" element={<EquipmentPage />} />
        <Route path="/owner/reports" element={<ReportsPage />} />
        <Route path="/owner/settings" element={<SettingsPage />} />
      </Route>
      <Route element={<RouteGuard requiredRole="staff"><DashboardLayout /></RouteGuard>}>
        <Route path="/staff" element={<StaffDashboard />} />
        <Route path="/staff/members" element={<StaffMembersPage />} />
        <Route path="/staff/check-in" element={<CheckInPage />} />
        <Route path="/staff/package-registration" element={<PackageRegistrationPage />} />
        <Route path="/staff/payment/:subscriptionId" element={<PaymentPage />} />
        <Route path="/staff/renewals" element={<RenewalsPage />} />
        <Route path="/staff/equipment" element={<EquipmentMaintenancePage />} />
        <Route path="/staff/feedback" element={<FeedbackInboxPage />} />
      </Route>
      <Route element={<RouteGuard requiredRole="pt"><DashboardLayout /></RouteGuard>}>
        <Route path="/pt" element={<PtDashboard />} />
        <Route path="/pt/members" element={<AssignedMembersPage />} />
        <Route path="/pt/schedule" element={<PtSchedulePage />} />
        <Route path="/pt/workout-logs" element={<WorkoutLogsPage />} />
        <Route path="/pt/progress" element={<ProgressPage />} />
      </Route>
      <Route element={<RouteGuard requiredRole="member"><DashboardLayout /></RouteGuard>}>
        <Route path="/member" element={<MemberDashboard />} />
        <Route path="/member/profile" element={<ProfilePage />} />
        <Route path="/member/packages" element={<AvailablePackagesPage />} />
        <Route path="/member/register-package" element={<RegisterPackagePage />} />
        <Route path="/member/payment/:subscriptionId" element={<MemberPaymentPage />} />
        <Route path="/member/my-package" element={<MyPackagePage />} />
        <Route path="/member/workout-history" element={<WorkoutHistoryPage />} />
        <Route path="/member/feedback" element={<SendFeedbackPage />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export default App
