import { useState, useEffect } from 'react'
import { apiGet, apiPost, apiPatch } from '../../api/client'
import { useAuth } from '../../contexts/auth-context'

interface Workout {
  id: string; member_id: string; pt_id: string | null;
  workout_date: string; duration_min: number; intensity: string | null;
  notes: string | null; rating: number | null
}
interface Member { id: string; full_name: string }

export default function WorkoutLogsPage() {
  const { user } = useAuth()
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [members, setMembers] = useState<Map<string, Member>>(new Map())
  const [ptProfile, setPtProfile] = useState<{ id: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ memberId: '', workoutDate: '', durationMin: '', intensity: '', notes: '', rating: '' })
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!user) return
    setLoading(true)
    apiGet<Member[]>('/members')
      .then(async (mems) => {
        setMembers(new Map(mems.map((x: Member) => [x.id, x])))
        const profile = await apiGet<{ id: string }>('/pt/profile?userId=' + user.id)
        setPtProfile(profile)
        if (profile) {
          const w = await apiGet<Workout[]>('/pt/workouts?ptId=' + profile.id)
          setWorkouts(w)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setMessage('')
    try {
      const body = {
        memberId: form.memberId,
        workoutDate: form.workoutDate,
        durationMin: Number(form.durationMin),
        intensity: form.intensity || null,
        notes: form.notes || null,
        rating: form.rating ? Number(form.rating) : null,
        ptId: ptProfile?.id || null,
      }
      if (editingId) {
        await apiPatch(`/pt/workouts/${editingId}`, body)
        setMessage('Workout updated')
      } else {
        await apiPost('/pt/workouts', body)
        setMessage('Workout logged')
      }
      setShowForm(false)
      setEditingId(null)
      setForm({ memberId: '', workoutDate: '', durationMin: '', intensity: '', notes: '', rating: '' })
      if (ptProfile) {
        const w = await apiGet<Workout[]>('/pt/workouts?ptId=' + ptProfile.id)
        setWorkouts(w)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    }
  }

  function editWorkout(w: Workout) {
    setEditingId(w.id)
    setForm({
      memberId: w.member_id,
      workoutDate: w.workout_date.slice(0, 10),
      durationMin: String(w.duration_min),
      intensity: w.intensity || '',
      notes: w.notes || '',
      rating: w.rating != null ? String(w.rating) : '',
    })
    setShowForm(true)
  }

  if (loading) return <div className="page-loading">Loading...</div>

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Workout Logs</h2>
        <button className="btn-primary" onClick={() => setShowForm(true)}>Log Workout</button>
      </div>
      {error && <p className="form-error">{error}</p>}
      {message && <p style={{ color: '#2e7d32', fontSize: 14 }}>{message}</p>}

      {showForm && (
        <div className="modal-overlay" onClick={() => { setShowForm(false); setEditingId(null) }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editingId ? 'Edit Workout' : 'Log Workout'}</h3>
            <form onSubmit={handleSubmit}>
              <label>Member *</label>
              <select value={form.memberId} onChange={(e) => setForm(f => ({ ...f, memberId: e.target.value }))} required>
                <option value="">-- Select --</option>
                {[...members.entries()].map(([id, m]) => <option key={id} value={id}>{m.full_name}</option>)}
              </select>
              <label>Date *</label>
              <input type="date" value={form.workoutDate} onChange={(e) => setForm(f => ({ ...f, workoutDate: e.target.value }))} required />
              <label>Duration (min) *</label>
              <input type="number" value={form.durationMin} onChange={(e) => setForm(f => ({ ...f, durationMin: e.target.value }))} required />
              <label>Intensity</label>
              <select value={form.intensity} onChange={(e) => setForm(f => ({ ...f, intensity: e.target.value }))}>
                <option value="">-- Select --</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
              <label>Notes</label>
              <textarea value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} />
              <label>Rating (1-5)</label>
              <select value={form.rating} onChange={(e) => setForm(f => ({ ...f, rating: e.target.value }))}>
                <option value="">-- None --</option>
                {[1,2,3,4,5].map((n) => <option key={n} value={n}>{'★'.repeat(n)}{'☆'.repeat(5-n)}</option>)}
              </select>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => { setShowForm(false); setEditingId(null) }}>Cancel</button>
                <button type="submit" className="btn-primary">Log</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <table className="data-table">
        <thead><tr><th>Member</th><th>Date</th><th>Duration</th><th>Intensity</th><th>Rating</th><th>Notes</th><th></th></tr></thead>
        <tbody>
          {workouts.map((w) => (
            <tr key={w.id}>
              <td>{members.get(w.member_id)?.full_name || 'Unknown'}</td>
              <td>{new Date(w.workout_date).toLocaleDateString()}</td>
              <td>{w.duration_min} min</td>
              <td>{w.intensity ? <span className="badge">{w.intensity}</span> : '-'}</td>
              <td>{w.rating != null ? '★'.repeat(w.rating) + '☆'.repeat(5 - w.rating) : '-'}</td>
              <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.notes || '-'}</td>
              <td><button className="btn-sm btn-secondary" onClick={() => editWorkout(w)}>Edit</button></td>
            </tr>
          ))}
          {workouts.length === 0 && <tr><td colSpan={7} className="table-empty">No workout logs</td></tr>}
        </tbody>
      </table>
    </div>
  )
}
