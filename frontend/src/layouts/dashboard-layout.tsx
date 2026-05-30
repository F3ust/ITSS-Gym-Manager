import { Outlet } from 'react-router-dom'
import { Sidebar } from '../components/sidebar'

export function DashboardLayout() {
  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="dashboard-content">
        <Outlet />
      </main>
    </div>
  )
}
