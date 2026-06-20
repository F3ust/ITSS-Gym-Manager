import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiGet } from '../../api/client'
import { pushNotification } from '../../hooks/use-notifications'
import { useAuth } from '../../contexts/auth-context'

interface StatCardProps {
  icon: string
  count: number
  label: string
  color: string
}

interface PTAssignment {
  id: string
  member_id: string
  member_name: string
  member_phone?: string
  status: string
}

interface PTSchedule {
  id: string
  start_at: string
  end_at: string
  member_name: string
  workout_type?: string
}

interface PTWorkoutLog {
  id: string
  workout_date: string
  duration_min: number
  intensity?: string
  notes?: string
  member_name?: string
}

function StatCard({ icon, count, label, color }: StatCardProps) {
  return (
    <div className="stat-card" style={{ borderLeft: `4px solid ${color}` }}>
      <div style={{ fontSize: 32, marginBottom: 8, textAlign: 'center' }}>{icon}</div>
      <div className="stat-value" style={{ textAlign: 'center' }}>{count}</div>
      <div className="stat-label" style={{ textAlign: 'center', marginTop: 4 }}>{label}</div>
    </div>
  )
}

export default function PtDashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [assignedCount, setAssignedCount] = useState(0)
  const [todaySchedules, setTodaySchedules] = useState<PTSchedule[]>([])
  const [upcomingSchedules, setUpcomingSchedules] = useState<PTSchedule[]>([])
  const [recentWorkouts, setRecentWorkouts] = useState<PTWorkoutLog[]>([])
  const [assignedMembers, setAssignedMembers] = useState<PTAssignment[]>([])
  const [loading, setLoading] = useState(true)

  async function loadStats(ptId: string) {
    let assigned = 0, schedCount = 0
    try {
      const as: PTAssignment[] = await apiGet('/pt/assignments?ptId=' + ptId)
      assigned = as.length
      setAssignedCount(assigned)
      setAssignedMembers(as.slice(0, 5))
    } catch { 
      setAssignedCount(0) 
      setAssignedMembers([])
    }
    try {
      const ss: PTSchedule[] = await apiGet('/pt/schedules?ptId=' + ptId)
      const todayStr = new Date().toISOString().slice(0, 10)
      const nowTime = new Date()

      const todayList = ss.filter(s => s.start_at?.startsWith(todayStr))
      const upcomingList = ss.filter(s => {
        const start = new Date(s.start_at)
        return start > nowTime && !s.start_at?.startsWith(todayStr)
      })

      schedCount = todayList.length
      setTodaySchedules(todayList.slice(0, 5))
      setUpcomingSchedules(upcomingList.slice(0, 5))
    } catch { 
      setTodaySchedules([])
      setUpcomingSchedules([])
    }
    try {
      const ws: PTWorkoutLog[] = await apiGet('/pt/workouts?ptId=' + ptId)
      setRecentWorkouts(ws.slice(0, 5))
    } catch { setRecentWorkouts([]) }
    
    if (assigned > 0) pushNotification('👤', `You have ${assigned} assigned member${assigned > 1 ? 's' : ''}`)
    if (schedCount > 0) pushNotification('📅', `${schedCount} session${schedCount > 1 ? 's' : ''} scheduled today`)
  }

  useEffect(() => {
    if (!user) return
    setLoading(true)
    apiGet<{ id: string }>('/pt/profile?userId=' + user.id)
      .then((profile) => {
        if (profile?.id) {
          loadStats(profile.id).finally(() => setLoading(false))
        } else {
          setLoading(false)
        }
      })
      .catch(() => setLoading(false))
  }, [user])

  if (loading) return (
    <div className="page-container">
      <div className="page-header"><div className="skeleton-header" style={{ width: 180 }} /></div>
      <div className="stats-grid">
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
        <h2>PT Dashboard</h2>
      </div>

      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <StatCard icon="👤" count={assignedCount} label="Assigned Members" color="#3b82f6" />
        <StatCard icon="📅" count={todaySchedules.length} label="Today's Sessions" color="#ea580c" />
        <StatCard icon="🏋️‍♂️" count={recentWorkouts.length} label="Workout Logs" color="#8b5cf6" />
      </div>

      <div className="bento-grid bento-grid-2-1">
        
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* Today's Schedule Card */}
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 16, marginBottom: 16 }}>Today's Schedule</h3>
            {todaySchedules.length === 0 ? (
              <p className="text-muted" style={{ fontStyle: 'italic', fontSize: 13, textAlign: 'center', padding: '12px 0' }}>
                No sessions scheduled today.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {todaySchedules.map(s => (
                  <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: 'var(--bg)', borderRadius: 10, border: '1px solid var(--stroke)' }}>
                    <div>
                      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent)' }}>
                        {s.start_at?.slice(11, 16)} - {s.end_at?.slice(11, 16)}
                      </span>
                      <span style={{ marginLeft: 12, fontWeight: 600 }}>{s.member_name || 'Member'}</span>
                    </div>
                    {s.workout_type && (
                      <span className="badge" style={{ background: '#e0f2fe', color: '#0369a1', fontSize: 11, fontWeight: 700 }}>
                        {s.workout_type}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Schedule Card */}
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 16, marginBottom: 16 }}>Upcoming Schedule (Next 7 Days)</h3>
            {upcomingSchedules.length === 0 ? (
              <p className="text-muted" style={{ fontStyle: 'italic', fontSize: 13, textAlign: 'center', padding: '12px 0' }}>
                No upcoming sessions scheduled this week.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {upcomingSchedules.map(s => (
                  <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: 'var(--bg)', borderRadius: 10, border: '1px solid var(--stroke)' }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>
                        {new Date(s.start_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </div>
                      <div style={{ marginTop: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>
                          {s.start_at?.slice(11, 16)} - {s.end_at?.slice(11, 16)}
                        </span>
                        <span style={{ marginLeft: 12, fontWeight: 600 }}>{s.member_name || 'Member'}</span>
                      </div>
                    </div>
                    {s.workout_type && (
                      <span className="badge" style={{ background: '#f0fdf4', color: '#16a34a', fontSize: 11, fontWeight: 700 }}>
                        {s.workout_type}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Workouts Log Card */}
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 16, marginBottom: 16 }}>Recent Workout Logs</h3>
            {recentWorkouts.length === 0 ? (
              <p className="text-muted" style={{ fontStyle: 'italic', fontSize: 13, textAlign: 'center', padding: '12px 0' }}>
                No workouts logged recently.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {recentWorkouts.map(w => (
                  <div key={w.id} style={{ padding: '12px 14px', background: 'var(--bg)', borderRadius: 10, border: '1px solid var(--stroke)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600 }}>{w.member_name || 'Member'}</span>
                      <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                        {w.workout_date ? new Date(w.workout_date).toLocaleDateString() : '-'}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-strong)', marginTop: 4 }}>
                      Duration: <span style={{ fontWeight: 600, color: 'var(--accent)' }}>{w.duration_min} min</span>
                      {w.intensity && <span className="badge" style={{ marginLeft: 8, fontSize: 10 }}>{w.intensity}</span>}
                    </div>
                    {w.notes && (
                      <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6, lineHeight: 1.4, fontStyle: 'italic' }}>
                        Notes: "{w.notes}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* Assigned Members Quick List */}
          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: 12 }}>My Assigned Members</h3>
            {assignedMembers.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {assignedMembers.map(m => (
                  <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'var(--bg)', borderRadius: 10, border: '1px solid var(--stroke)' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{m.member_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>{m.member_phone || '-'}</div>
                    </div>
                    <span className="badge badge-active" style={{ fontSize: 11 }}>
                      {m.status}
                    </span>
                  </div>
                ))}
                <button className="btn-sm" style={{ width: '100%', marginTop: 6 }} onClick={() => navigate('/pt/members')}>
                  View All Members
                </button>
              </div>
            ) : (
              <p className="text-muted" style={{ fontStyle: 'italic', fontSize: 13, padding: '12px 0', textAlign: 'center' }}>
                No assigned members.
              </p>
            )}
          </div>

          {/* Quick Actions Shortcuts */}
          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: 12 }}>Quick Actions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button className="btn-primary" style={{ width: '100%', justifyContent: 'flex-start', paddingLeft: 16 }} onClick={() => navigate('/pt/schedule')}>
                📅 Manage PT Schedule
              </button>
              <button className="btn-primary" style={{ width: '100%', justifyContent: 'flex-start', paddingLeft: 16 }} onClick={() => navigate('/pt/workout-logs')}>
                🏋️‍♂️ Log Member Workouts
              </button>
              <button className="btn-primary" style={{ width: '100%', justifyContent: 'flex-start', paddingLeft: 16 }} onClick={() => navigate('/pt/progress')}>
                📈 Check Member Progress
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}
