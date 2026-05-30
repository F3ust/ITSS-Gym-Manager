import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/auth-context'
import { apiGet } from '../../api/client'

interface UsageItem {
  id: string; occurred_at: string; type: 'checkin' | 'workout'
  method?: string; remaining_sessions_after?: number | null
  duration_min?: number; intensity?: string | null; notes?: string | null; rating?: number | null
}

function fmt(iso: string) { return new Date(iso).toLocaleString() }
function fmtDate(iso: string) { return new Date(iso).toLocaleDateString() }

export default function WorkoutHistoryPage() {
  const { user } = useAuth()
  const [items, setItems] = useState<UsageItem[]>([])
  const [tab, setTab] = useState<'checkins' | 'workouts'>('checkins')
  const [loading, setLoading] = useState(true)
  const [from, setFrom] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().slice(0, 10) })
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10))

  useEffect(() => {
    if (!user) return
    setLoading(true)
    apiGet<UsageItem[]>(`/members/usage-history?from=${from}&to=${to}&userId=${user.id}`).then((data: any) => {
      setItems((data?.items || []) as UsageItem[])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [user, from, to])

  const checkins = items.filter(i => i.type === 'checkin')
  const workouts = items.filter(i => i.type === 'workout')

  return (
    <div className="page-container">
      <div className="page-header"><h2>Workout History</h2></div>
      <div className="filter-bar" style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16 }}>
        <label>From: <input type="date" value={from} onChange={e => setFrom(e.target.value)} /></label>
        <label>To: <input type="date" value={to} onChange={e => setTo(e.target.value)} /></label>
      </div>
      <div className="tabs" style={{ marginBottom: 16 }}>
        <button className={`tab ${tab === 'checkins' ? 'tab-active' : ''}`} onClick={() => setTab('checkins')}>Check-Ins ({checkins.length})</button>
        <button className={`tab ${tab === 'workouts' ? 'tab-active' : ''}`} onClick={() => setTab('workouts')}>PT Workouts ({workouts.length})</button>
      </div>
      {loading ? <div className="page-loading">Loading...</div> : (
        <>
          {tab === 'checkins' && (
            <table className="data-table">
              <thead><tr><th>Date</th></tr></thead>
              <tbody>
                {checkins.map((c) => (
                  <tr key={c.id}>
                    <td>{fmt(c.occurred_at)}</td>
                  </tr>
                ))}
                {checkins.length === 0 && <tr><td className="table-empty">No check-ins</td></tr>}
              </tbody>
            </table>
          )}
          {tab === 'workouts' && (
            <table className="data-table">
              <thead><tr><th>Date</th><th>Duration</th><th>Intensity</th><th>Rating</th><th>Notes</th></tr></thead>
              <tbody>
                {workouts.map((w) => (
                  <tr key={w.id}>
                    <td>{fmtDate(w.occurred_at)}</td>
                    <td>{w.duration_min} min</td>
                    <td>{w.intensity ? <span className="badge">{w.intensity}</span> : '-'}</td>
                    <td>{w.rating != null ? '★'.repeat(w.rating) + '☆'.repeat(5 - w.rating) : '-'}</td>
                    <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.notes || '-'}</td>
                  </tr>
                ))}
                {workouts.length === 0 && <tr><td colSpan={5} className="table-empty">No workout logs</td></tr>}
              </tbody>
            </table>
          )}
        </>
      )}
      <style>{`
        .filter-bar input { padding: 6px 8px; border: 1px solid #ddd; border-radius: 4px; }
        .filter-bar label { display: flex; align-items: center; gap: 6px; font-size: 13px; color: #555; }
      `}</style>
    </div>
  )
}
