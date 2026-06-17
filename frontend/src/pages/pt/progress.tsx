import { useState, useEffect } from 'react'
import { apiGet } from '../../api/client'
import { useAuth } from '../../contexts/auth-context'

interface Workout {
  id: string; member_id: string; workout_date: string;
  duration_min: number; intensity: string | null; rating: number | null
}
interface Member { id: string; full_name: string }
interface Assignment { id: string; member_id: string; status: string }

export default function ProgressPage() {
  const { user } = useAuth()
  const [members, setMembers] = useState<Map<string, Member>>(new Map())
  const [selected, setSelected] = useState('')
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    setLoading(true)
    apiGet<{ id: string }>('/pt/profile?userId=' + user.id)
      .then(async (profile) => {
        if (profile?.id) {
          const [asgn, mems] = await Promise.all([
            apiGet<Assignment[]>('/pt/assignments?ptId=' + profile.id),
            apiGet<Member[]>('/members'),
          ])
          const memberIds = new Set(asgn.filter((a) => a.status !== 'inactive').map((a) => a.member_id))
          setMembers(new Map(mems.filter((m: Member) => memberIds.has(m.id)).map((m: Member) => [m.id, m])))
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user])

  async function loadWorkouts(memberId: string) {
    setSelected(memberId)
    try {
      const data = await apiGet<Workout[]>(`/pt/workouts?memberId=${memberId}`)
      setWorkouts(data)
    } catch {
      setWorkouts([])
    }
  }

  if (loading) return <div className="page-loading">Loading...</div>

  return (
    <div className="page-container">
      <div className="page-header"><h2>Progress Overview</h2></div>
      <div className="card">
        <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>Select Member</label>
        <select value={selected} onChange={(e) => loadWorkouts(e.target.value)} style={{ marginTop: 8, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--stroke)', background: 'var(--panel)', color: 'var(--text-strong)', fontSize: 14, width: '100%' }}>
          <option value="">-- Select --</option>
          {[...members.entries()].map(([id, m]) => <option key={id} value={id}>{m.full_name}</option>)}
        </select>
      </div>
      {selected && (
        <table className="data-table">
          <thead><tr><th>Date</th><th>Duration</th><th>Intensity</th><th>Rating</th></tr></thead>
          <tbody>
            {workouts.map((w) => (
              <tr key={w.id}>
                <td>{new Date(w.workout_date).toLocaleDateString()}</td>
                <td>{w.duration_min} min</td>
                <td>{w.intensity ? <span className="badge">{w.intensity}</span> : '-'}</td>
                <td>{w.rating != null ? '★'.repeat(w.rating) + '☆'.repeat(5 - w.rating) : '-'}</td>
              </tr>
            ))}
            {workouts.length === 0 && <tr><td colSpan={4} className="table-empty">No workout data</td></tr>}
          </tbody>
        </table>
      )}
    </div>
  )
}
