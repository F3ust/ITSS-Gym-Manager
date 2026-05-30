import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../contexts/auth-context'
import { useNotifications } from '../hooks/use-notifications'
import { apiGet } from '../api/client'

interface NavItem {
  label: string
  path: string
}

const navMap: Record<string, NavItem[]> = {
  owner: [
    { label: 'Dashboard', path: '/owner' },
    { label: 'Packages', path: '/owner/packages' },
    { label: 'Staff & Roles', path: '/owner/staff' },
    { label: 'Staff Schedules', path: '/owner/schedules' },
    { label: 'Room Types', path: '/owner/facilities/room-types' },
    { label: 'Rooms', path: '/owner/facilities/rooms' },
    { label: 'Equipment', path: '/owner/equipment' },
    { label: 'Reports', path: '/owner/reports' },
    { label: 'Settings', path: '/owner/settings' },
  ],
  staff: [
    { label: 'Dashboard', path: '/staff' },
    { label: 'Member Management', path: '/staff/members' },
    { label: 'Check-In', path: '/staff/check-in' },
    { label: 'Package Registration', path: '/staff/package-registration' },
    { label: 'Renewals', path: '/staff/renewals' },
    { label: 'Equipment Maintenance', path: '/staff/equipment' },
    { label: 'Feedback Inbox', path: '/staff/feedback' },
  ],
  pt: [
    { label: 'Dashboard', path: '/pt' },
    { label: 'Assigned Members', path: '/pt/members' },
    { label: 'PT Schedule', path: '/pt/schedule' },
    { label: 'Workout Logs', path: '/pt/workout-logs' },
    { label: 'Progress Overview', path: '/pt/progress' },
  ],
  member: [
    { label: 'Dashboard', path: '/member' },
    { label: 'My Profile', path: '/member/profile' },
    { label: 'Available Packages', path: '/member/packages' },
    { label: 'Register Package', path: '/member/register-package' },
    { label: 'My Package', path: '/member/my-package' },
    { label: 'Workout History', path: '/member/workout-history' },
    { label: 'Feedback', path: '/member/feedback' },
  ],
}

export function Sidebar() {
  const { user, logout } = useAuth()
  const [memberId, setMemberId] = useState<string>()

  useEffect(() => {
    if (user?.role === 'member') {
      apiGet<{ id: string }>(`/members?userId=${user.id}`).then(m => setMemberId(m.id)).catch(() => {})
    }
  }, [user])

  const { unreadCount } = useNotifications(memberId)
  if (!user) return null

  const items = navMap[user.role] ?? []
  const unread = unreadCount()

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <strong>Gym Manager</strong>
        <span className="sidebar-role">{user.role.toUpperCase()}</span>
      </div>
      <nav className="sidebar-nav">
        {items.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === `/${user.role}`}
            className={({ isActive }) => (isActive ? 'sidebar-link active' : 'sidebar-link')}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-footer">
        <NavLink to="/notifications" className={({ isActive }) => (isActive ? 'sidebar-link active' : 'sidebar-link')}>
          {unread > 0 ? `Notifications (${unread})` : 'Notifications'}
        </NavLink>
        <NavLink to="/help" className={({ isActive }) => (isActive ? 'sidebar-link active' : 'sidebar-link')}>Help</NavLink>
        <span className="sidebar-user">{user.name}</span>
        <button className="sidebar-logout" onClick={logout}>Logout</button>
      </div>
    </aside>
  )
}
