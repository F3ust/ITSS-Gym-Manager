import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiGet } from '../../api/client'
import { pushNotification } from '../../hooks/use-notifications'

interface StatCardProps {
  icon: string
  count: number
  label: string
  color: string
  onClick?: () => void
}

function StatCard({ icon, count, label, color, onClick }: StatCardProps) {
  return (
    <div className="stat-card" style={{ borderLeft: `4px solid ${color}` }} onClick={onClick}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-count">{count}</div>
      <div className="stat-label">{label}</div>
      <style>{`
        .stat-card {
          background: #fff; border-radius: 8px; padding: 20px; cursor: ${onClick ? 'pointer' : 'default'};
          box-shadow: 0 1px 3px rgba(0,0,0,0.12); transition: box-shadow 0.2s, transform 0.2s;
          display: flex; flex-direction: column; align-items: center; text-align: center;
        }
        .stat-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.15); transform: translateY(-2px); }
        .stat-icon { font-size: 32px; margin-bottom: 8px; }
        .stat-count { font-size: 28px; font-weight: 700; color: #333; }
        .stat-label { font-size: 14px; color: #666; margin-top: 4px; }
      `}</style>
    </div>
  )
}

export default function StaffDashboard() {
  const navigate = useNavigate()
  const [checkinCount, setCheckinCount] = useState(0)
  const [pendingFeedbackCount, setPendingFeedbackCount] = useState(0)
  const [expiringCount, setExpiringCount] = useState(0)
  const [maintenanceCount, setMaintenanceCount] = useState(0)

  async function loadStats() {
    const today = new Date().toISOString().slice(0, 10)
    let feedbackCount = 0, expireCount = 0
    try {
      const checkins: any[] = await apiGet(`/check-ins?date=${today}`)
      setCheckinCount(checkins.length)
    } catch { setCheckinCount(0) }
    try {
      const feedback: any[] = await apiGet('/feedback?status=' + encodeURIComponent('Mới'))
      feedbackCount = feedback.length
      setPendingFeedbackCount(feedbackCount)
    } catch { setPendingFeedbackCount(0) }
    try {
      const subs: any[] = await apiGet('/subscriptions')
      const now = new Date()
      const limit = new Date()
      limit.setDate(limit.getDate() + 7)
      expireCount = subs.filter(s => {
        if (s.status !== 'active') return false
        const end = new Date(s.end_date)
        return end >= now && end <= limit
      }).length
      setExpiringCount(expireCount)
    } catch { setExpiringCount(0) }
    try {
      const logs: any[] = await apiGet('/equipment/maintenance-logs')
      setMaintenanceCount(logs.length)
    } catch { setMaintenanceCount(0) }
    if (feedbackCount > 0) pushNotification('📝', `${feedbackCount} pending feedback items`)
    if (expireCount > 0) pushNotification('⏰', `${expireCount} subscriptions expiring within 7 days`)
  }

  useEffect(() => { loadStats() }, [])

  return (
    <div>
      <h2>Staff Dashboard</h2>
      <div className="stats-grid">
        <StatCard icon="📋" count={checkinCount} label="Today's Check-Ins" color="#4A90D9" />
        <StatCard icon="📝" count={pendingFeedbackCount} label="Pending Feedback" color="#F5A623" onClick={() => navigate('/staff/feedback')} />
        <StatCard icon="⏰" count={expiringCount} label="Expiring Soon (7 days)" color="#D0021B" onClick={() => navigate('/staff/renewals')} />
        <StatCard icon="🔧" count={maintenanceCount} label="Needs Maintenance" color="#9013FE" onClick={() => navigate('/staff/equipment')} />
      </div>
      <div className="quick-actions">
        <h3>Quick Actions</h3>
        <div className="action-buttons">
          <button className="action-btn" onClick={() => navigate('/staff/check-in')}>Check-In</button>
          <button className="action-btn" onClick={() => navigate('/staff/package-registration')}>Package Registration</button>
          <button className="action-btn" onClick={() => navigate('/staff/renewals')}>Renewals</button>
        </div>
      </div>
      <style>{`
        .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin: 20px 0; }
        .quick-actions { margin-top: 24px; }
        .quick-actions h3 { font-size: 16px; color: #333; margin-bottom: 12px; }
        .action-buttons { display: flex; gap: 12px; flex-wrap: wrap; }
        .action-btn {
          padding: 10px 20px; border: none; border-radius: 6px; background: #4A90D9; color: #fff;
          font-size: 14px; cursor: pointer; transition: background 0.2s;
        }
        .action-btn:hover { background: #357ABD; }
      `}</style>
    </div>
  )
}
