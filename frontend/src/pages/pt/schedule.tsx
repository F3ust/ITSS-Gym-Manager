import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/auth-context'
import { apiGet, apiPost } from '../../api/client'

interface Schedule {
  id: string; pt_id: string; member_id: string;
  start_at: string; end_at: string; workout_type: string; status: string
}
interface Member { id: string; full_name: string }
interface PtProfile { id: string }

export default function PtSchedulePage() {
  const { user } = useAuth()
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [members, setMembers] = useState<Map<string, Member>>(new Map())
  const [ptProfile, setPtProfile] = useState<PtProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ memberId: '', startAt: '', endAt: '', workoutType: '' })
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    load()
  }, [])

  async function load() {
    try {
      setLoading(true)
      const [sch, mems, profile] = await Promise.all([
        apiGet<Schedule[]>('/pt/schedules'),
        apiGet<Member[]>('/members'),
        user ? apiGet<PtProfile>('/pt/profile?userId=' + user.id) : Promise.resolve(null),
      ])
      setSchedules(sch)
      setMembers(new Map(mems.map((m: Member) => [m.id, m])))
      setPtProfile(profile)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setMessage('')
    if (!ptProfile) { setError('PT profile not loaded'); return }
    try {
      await apiPost('/pt/schedules', {
        ptId: ptProfile.id,
        memberId: form.memberId,
        startAt: new Date(form.startAt).toISOString(),
        endAt: new Date(form.endAt).toISOString(),
        workoutType: form.workoutType,
      })
      setShowForm(false)
      setForm({ memberId: '', startAt: '', endAt: '', workoutType: '' })
      setMessage('Session created')
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create')
    }
  }

  if (loading) return <div className="page-loading">Loading...</div>

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>PT Schedule</h2>
        <button className="btn-primary" onClick={() => setShowForm(true)}>New Session</button>
      </div>
      {error && <p className="form-error">{error}</p>}
      {message && <p style={{ color: '#2e7d32', fontSize: 14 }}>{message}</p>}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>New Session</h3>
            <form onSubmit={handleCreate}>
              <label>Member *</label>
              <select value={form.memberId} onChange={(e) => setForm(f => ({ ...f, memberId: e.target.value }))} required>
                <option value="">-- Select --</option>
                {[...members.entries()].map(([id, m]) => <option key={id} value={id}>{m.full_name}</option>)}
              </select>
              <label>Start *</label>
              <input type="datetime-local" value={form.startAt} onChange={(e) => setForm(f => ({ ...f, startAt: e.target.value }))} required />
              <label>End *</label>
              <input type="datetime-local" value={form.endAt} onChange={(e) => setForm(f => ({ ...f, endAt: e.target.value }))} required />
              <label>Workout Type *</label>
              <input value={form.workoutType} onChange={(e) => setForm(f => ({ ...f, workoutType: e.target.value }))} required />
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <table className="data-table">
        <thead><tr><th>Member</th><th>Workout</th><th>Start</th><th>End</th><th>Status</th></tr></thead>
        <tbody>
          {schedules.map((s) => (
            <tr key={s.id}>
              <td>{members.get(s.member_id)?.full_name || 'Unknown'}</td>
              <td><span className="badge">{s.workout_type}</span></td>
              <td>{new Date(s.start_at).toLocaleString()}</td>
              <td>{new Date(s.end_at).toLocaleString()}</td>
              <td><span className={`badge badge-${s.status}`}>{s.status}</span></td>
            </tr>
          ))}
          {schedules.length === 0 && <tr><td colSpan={5} className="table-empty">No sessions</td></tr>}
        </tbody>
      </table>
    </div>
  )
}
