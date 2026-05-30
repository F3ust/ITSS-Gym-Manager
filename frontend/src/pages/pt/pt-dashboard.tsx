import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiGet } from '../../api/client'
import { pushNotification } from '../../hooks/use-notifications'

export default function PtDashboard() {
  const navigate = useNavigate()
  const [assignedCount, setAssignedCount] = useState(0)
  const [todaySchedules, setTodaySchedules] = useState<any[]>([])
  const [recentWorkouts, setRecentWorkouts] = useState<any[]>([])

  async function loadStats() {
    const today = new Date().toISOString().slice(0, 10)
    let assigned = 0, schedCount = 0
    try {
      const as: any[] = await apiGet('/pt/assignments')
      assigned = as.length
      setAssignedCount(assigned)
    } catch { setAssignedCount(0) }
    try {
      const ss: any[] = await apiGet('/pt/schedules?date=' + today)
      schedCount = ss.length
      setTodaySchedules(ss.slice(0, 5))
    } catch { setTodaySchedules([]) }
    try {
      const ws: any[] = await apiGet('/pt/workouts')
      setRecentWorkouts(ws.slice(0, 5))
    } catch { setRecentWorkouts([]) }
    if (assigned > 0) pushNotification('👤', `You have ${assigned} assigned member${assigned > 1 ? 's' : ''}`)
    if (schedCount > 0) pushNotification('📅', `${schedCount} session${schedCount > 1 ? 's' : ''} scheduled today`)
  }

  useEffect(() => { loadStats() }, [])

  return (
    <div>
      <h2>PT Dashboard</h2>
      <div className="pt-stats-grid">
        <div className="pt-stat-card" style={{ borderLeft: '4px solid #4A90D9' }}>
          <div className="pt-stat-count">{assignedCount}</div>
          <div className="pt-stat-label">Assigned Members</div>
        </div>
        <div className="pt-stat-card" style={{ borderLeft: '4px solid #F5A623' }}>
          <div className="pt-stat-count">{todaySchedules.length}</div>
          <div className="pt-stat-label">Today's Sessions</div>
        </div>
        <div className="pt-stat-card" style={{ borderLeft: '4px solid #9013FE' }}>
          <div className="pt-stat-count">{recentWorkouts.length}</div>
          <div className="pt-stat-label">Recent Workouts</div>
        </div>
      </div>
      <div className="pt-panels">
        <div className="pt-panel">
          <h3>Today's Schedule</h3>
          {todaySchedules.length === 0 ? <p className="pt-empty">No sessions today</p> : (
            <ul className="pt-list">
              {todaySchedules.map(s => (
                <li key={s.id} className="pt-list-item">
                  <strong>{s.start_at?.slice(11, 16)}-{s.end_at?.slice(11, 16)}</strong> {s.member_name || 'Member'}
                  {s.workout_type && <span className="pt-badge">{s.workout_type}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="pt-panel">
          <h3>Recent Workouts</h3>
          {recentWorkouts.length === 0 ? <p className="pt-empty">No workouts logged</p> : (
            <ul className="pt-list">
              {recentWorkouts.map(w => (
                <li key={w.id} className="pt-list-item">
                  <strong>{w.workout_date?.slice(0, 10)}</strong> &mdash; {w.duration_min} min
                  {w.intensity && <span className="pt-badge">{w.intensity}</span>}
                  {w.notes && <div className="pt-note">{w.notes}</div>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <div className="quick-actions">
        <h3>Quick Actions</h3>
        <div className="action-buttons">
          <button className="action-btn" onClick={() => navigate('/pt/schedule')}>Schedule</button>
          <button className="action-btn" onClick={() => navigate('/pt/workout-logs')}>Workout Logs</button>
          <button className="action-btn" onClick={() => navigate('/pt/progress')}>Progress</button>
        </div>
      </div>
      <style>{`
        .pt-stats-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; margin: 20px 0; }
        .pt-stat-card { background: #fff; border-radius: 8px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.12); display: flex; flex-direction: column; align-items: center; }
        .pt-stat-count { font-size: 28px; font-weight: 700; color: #333; }
        .pt-stat-label { font-size: 14px; color: #666; margin-top: 4px; }
        .pt-panels { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 20px 0; }
        .pt-panel { background: #fff; border-radius: 8px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.12); }
        .pt-panel h3 { font-size: 15px; margin-bottom: 12px; color: #333; }
        .pt-empty { color: #999; font-size: 13px; }
        .pt-list { list-style: none; padding: 0; margin: 0; }
        .pt-list-item { padding: 8px 0; border-bottom: 1px solid #f0f0f0; font-size: 13px; }
        .pt-list-item:last-child { border-bottom: none; }
        .pt-badge { display: inline-block; margin-left: 6px; padding: 1px 6px; border-radius: 4px; background: #e8f0fe; font-size: 11px; color: #4A90D9; }
        .pt-note { font-size: 12px; color: #666; margin-top: 2px; }
        .quick-actions { margin-top: 24px; }
        .quick-actions h3 { font-size: 16px; color: #333; margin-bottom: 12px; }
        .action-buttons { display: flex; gap: 12px; flex-wrap: wrap; }
        .action-btn { padding: 10px 20px; border: none; border-radius: 6px; background: #4A90D9; color: #fff; font-size: 14px; cursor: pointer; }
        .action-btn:hover { background: #357ABD; }
      `}</style>
    </div>
  )
}
