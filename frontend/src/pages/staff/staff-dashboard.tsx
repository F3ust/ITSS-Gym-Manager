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

interface CheckIn {
  id: string
  check_in_at: string
  method: string
  member_name?: string
  member_phone?: string
}

interface Feedback {
  id: string
  title: string
  content: string
  status: string
  created_at: string
  member_name?: string
}

interface Room {
  id: string
  name: string
  capacity: number | null
  status: string
  room_type_name?: string
}

function StatCard({ icon, count, label, color, onClick }: StatCardProps) {
  return (
    <div
      className="stat-card"
      style={{ borderLeft: `4px solid ${color}`, cursor: onClick ? 'pointer' : 'default' }}
      onClick={onClick}
    >
      <div style={{ fontSize: 32, marginBottom: 8, textAlign: 'center' }}>{icon}</div>
      <div className="stat-value" style={{ textAlign: 'center' }}>{count}</div>
      <div className="stat-label" style={{ textAlign: 'center', marginTop: 4 }}>{label}</div>
    </div>
  )
}

export default function StaffDashboard() {
  const navigate = useNavigate()
  const [checkinCount, setCheckinCount] = useState(0)
  const [pendingFeedbackCount, setPendingFeedbackCount] = useState(0)
  const [expiringCount, setExpiringCount] = useState(0)
  const [maintenanceCount, setMaintenanceCount] = useState(0)
  const [recentCheckins, setRecentCheckins] = useState<CheckIn[]>([])
  const [pendingFeedbacks, setPendingFeedbacks] = useState<Feedback[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)

  async function loadDashboardData() {
    const today = new Date().toISOString().slice(0, 10)
    setLoading(true)
    try {
      const [checkinsData, feedbacksData, subsData, logsData, roomsData] = await Promise.all([
        apiGet<CheckIn[]>(`/check-ins?date=${today}`),
        apiGet<Feedback[]>('/feedback'),
        apiGet<any[]>('/subscriptions'),
        apiGet<any[]>('/equipment/maintenance-logs'),
        apiGet<Room[]>('/rooms').catch(() => [])
      ])

      setCheckinCount(checkinsData.length)
      setRecentCheckins(checkinsData.slice(0, 5))

      const pendingFb = feedbacksData.filter(f => f.status === 'new' || f.status === 'pending')
      setPendingFeedbackCount(pendingFb.length)
      setPendingFeedbacks(pendingFb.slice(0, 3))

      const now = new Date()
      const limit = new Date()
      limit.setDate(limit.getDate() + 7)
      const expireCount = subsData.filter(s => {
        if (s.status !== 'active') return false
        const end = new Date(s.end_date)
        return end >= now && end <= limit
      }).length
      setExpiringCount(expireCount)

      setMaintenanceCount(logsData.length)
      setRooms(roomsData.slice(0, 4))

      if (pendingFb.length > 0) pushNotification('📝', `${pendingFb.length} pending feedback items`)
      if (expireCount > 0) pushNotification('⏰', `${expireCount} subscriptions expiring within 7 days`)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadDashboardData() }, [])

  if (loading) return (
    <div className="page-container">
      <div className="page-header"><div className="skeleton-header" style={{ width: 200 }} /></div>
      <div className="stats-grid">
        <div className="skeleton-card" style={{ height: 110 }} />
        <div className="skeleton-card" style={{ height: 110 }} />
        <div className="skeleton-card" style={{ height: 110 }} />
        <div className="skeleton-card" style={{ height: 110 }} />
      </div>
      <div className="bento-grid bento-grid-2-1" style={{ marginTop: 24 }}>
        <div className="skeleton-card" style={{ height: 260 }} />
        <div className="skeleton-card" style={{ height: 260 }} />
      </div>
    </div>
  )

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Staff Dashboard</h2>
      </div>
      
      <div className="stats-grid">
        <StatCard icon="📋" count={checkinCount} label="Today's Check-Ins" color="#3b82f6" />
        <StatCard icon="📝" count={pendingFeedbackCount} label="Pending Feedback" color="#ea580c" onClick={() => navigate('/staff/feedback')} />
        <StatCard icon="⏰" count={expiringCount} label="Expiring Soon (7 days)" color="#ef4444" onClick={() => navigate('/staff/renewals')} />
        <StatCard icon="🔧" count={maintenanceCount} label="Needs Maintenance" color="#8b5cf6" onClick={() => navigate('/staff/equipment')} />
      </div>

      <div className="bento-grid bento-grid-2-1" style={{ marginTop: 24 }}>
        
        {/* Live Check-Ins Feed */}
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 16, marginBottom: 16 }}>Live Check-Ins Feed</h3>
          {recentCheckins.length > 0 ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Time</th>
                  <th>Method</th>
                </tr>
              </thead>
              <tbody>
                {recentCheckins.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{c.member_name || 'Hội viên'}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>{c.member_phone || '-'}</div>
                    </td>
                    <td>{new Date(c.check_in_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</td>
                    <td>
                      <span className="badge" style={{ background: 'var(--chip)', color: 'var(--text-strong)', padding: '4px 10px', fontSize: 11 }}>
                        {c.method}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-muted" style={{ padding: 24, textAlign: 'center', fontStyle: 'italic', fontSize: 13 }}>
              No check-ins recorded yet today.
            </p>
          )}
        </div>

        {/* Cột phải: Ý kiến đóng góp & Phím tắt */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* Pending Feedbacks Feed */}
          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: 12 }}>Pending Feedbacks</h3>
            {pendingFeedbacks.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {pendingFeedbacks.map(f => (
                  <div key={f.id} style={{ padding: '10px 12px', background: 'var(--bg)', borderRadius: 10, border: '1px solid var(--stroke)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{f.title}</span>
                      <span className="badge" style={{ background: 'var(--accent-light)', color: 'var(--accent)', fontSize: 10 }}>New</span>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.4 }}>
                      {f.content}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, fontSize: 11, color: 'var(--muted)' }}>
                      <span>From: {f.member_name || 'Member'}</span>
                      <button className="btn-sm" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => navigate('/staff/feedback')}>
                        Reply
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted" style={{ fontStyle: 'italic', fontSize: 13, padding: '12px 0', textAlign: 'center' }}>
                ✓ No pending feedbacks to reply.
              </p>
            )}
          </div>

          {/* Gym Zones Status */}
          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: 12 }}>Gym Zones Status</h3>
            {rooms.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {rooms.map(r => (
                  <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'var(--bg)', borderRadius: 10, border: '1px solid var(--stroke)' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{r.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>Type: {r.room_type_name || 'General Area'}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className="badge" style={{ background: r.status === 'active' ? 'var(--success-light)' : 'var(--stroke)', color: r.status === 'active' ? 'var(--success)' : 'var(--muted)', fontSize: 10, textTransform: 'uppercase', fontWeight: 700 }}>
                        {r.status}
                      </span>
                      {r.capacity && <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>Cap: {r.capacity}</div>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted" style={{ fontStyle: 'italic', fontSize: 13, padding: '12px 0', textAlign: 'center' }}>
                No gym zones registered.
              </p>
            )}
          </div>

          {/* Quick Actions Shortcuts */}
          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: 12 }}>Quick Actions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button className="btn-primary" style={{ width: '100%', justifyContent: 'flex-start', paddingLeft: 16 }} onClick={() => navigate('/staff/check-in')}>
                🔑 Check-In Member
              </button>
              <button className="btn-primary" style={{ width: '100%', justifyContent: 'flex-start', paddingLeft: 16 }} onClick={() => navigate('/staff/package-registration')}>
                📝 Register New Package
              </button>
              <button className="btn-primary" style={{ width: '100%', justifyContent: 'flex-start', paddingLeft: 16 }} onClick={() => navigate('/staff/renewals')}>
                ⏰ Renew Expired Subscription
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}
