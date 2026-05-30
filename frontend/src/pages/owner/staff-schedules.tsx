import { useState, useEffect } from 'react'
import { apiGet, apiPost, apiPatch, apiDelete } from '../../api/client'

interface Staff { id: string; full_name: string; role_title: string }
interface Schedule { id: string; staff_id: string; start_at: string; end_at: string; role: string; status: string }

export default function StaffSchedulesPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Schedule | null>(null)
  const [filter, setFilter] = useState('')
  const [form, setForm] = useState({ staffId: '', startAt: '', endAt: '', role: '', status: 'active' })

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const [s, st] = await Promise.all([
        apiGet<Schedule[]>('/staff/schedules'),
        apiGet<Staff[]>('/staff'),
      ])
      setSchedules(s); setStaff(st)
    } catch { /* */ }
    setLoading(false)
  }

  function openCreate() {
    setEditing(null)
    setForm({ staffId: '', startAt: '', endAt: '', role: '', status: 'active' })
    setShowForm(true)
  }

  function openEdit(s: Schedule) {
    setEditing(s)
    setForm({
      staffId: s.staff_id,
      startAt: s.start_at.slice(0, 16),
      endAt: s.end_at.slice(0, 16),
      role: s.role,
      status: s.status,
    })
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      if (editing) {
        await apiPatch('/staff/schedules/' + editing.id, form)
      } else {
        await apiPost('/staff/schedules', form)
      }
      setShowForm(false)
      load()
    } catch (err) { alert('Failed to save: ' + (err as Error).message) }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this schedule entry?')) return
    try {
      await apiDelete('/staff/schedules/' + id)
      load()
    } catch (err) { alert('Failed to delete: ' + (err as Error).message) }
  }

  const staffMap = Object.fromEntries(staff.map(s => [s.id, s.full_name]))
  const filtered = schedules.filter(s => !filter || s.staff_id === filter)

  if (loading) return <div className="page-loading">Loading...</div>

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Staff Schedules</h2>
        <button className="btn-primary" onClick={openCreate}>Add Shift</button>
      </div>

      <div style={{ marginBottom: 12 }}>
        <select value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="">All Staff</option>
          {staff.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
        </select>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>{editing ? 'Edit Shift' : 'Add Shift'}</h3>
            <form onSubmit={handleSubmit}>
              <label>Staff *</label>
              <select value={form.staffId} onChange={e => setForm(f => ({ ...f, staffId: e.target.value }))} required>
                <option value="">Select staff...</option>
                {staff.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
              </select>
              <label>Start *</label>
              <input type="datetime-local" value={form.startAt} onChange={e => setForm(f => ({ ...f, startAt: e.target.value }))} required />
              <label>End *</label>
              <input type="datetime-local" value={form.endAt} onChange={e => setForm(f => ({ ...f, endAt: e.target.value }))} required />
              <label>Role *</label>
              <input value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} required placeholder="e.g. Receptionist" />
              <label>Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn-primary">{editing ? 'Save' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <table className="data-table">
        <thead><tr><th>Staff</th><th>Start</th><th>End</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          {filtered.map(s => (
            <tr key={s.id}>
              <td>{staffMap[s.staff_id] || s.staff_id}</td>
              <td>{new Date(s.start_at).toLocaleString()}</td>
              <td>{new Date(s.end_at).toLocaleString()}</td>
              <td><span className="badge">{s.role}</span></td>
              <td><span className={`badge badge-${s.status}`}>{s.status}</span></td>
              <td>
                <button className="btn-secondary btn-sm" onClick={() => openEdit(s)}>Edit</button>
                <button className="btn-danger btn-sm" style={{ marginLeft: 4 }} onClick={() => handleDelete(s.id)}>Delete</button>
              </td>
            </tr>
          ))}
          {filtered.length === 0 && <tr><td colSpan={6} className="table-empty">No schedules found</td></tr>}
        </tbody>
      </table>
    </div>
  )
}
