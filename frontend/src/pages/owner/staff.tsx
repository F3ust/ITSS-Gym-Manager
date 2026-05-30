import { useState, useEffect } from 'react'
import { apiGet, apiPost } from '../../api/client'

interface Staff {
  id: string
  full_name: string
  role_title: string
  created_at: string
}

export default function StaffPage() {
  const [staff, setStaff] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ fullName: '', roleTitle: '', username: '', password: '' })

  useEffect(() => { load() }, [])

  async function load() {
    try {
      setLoading(true)
      const data = await apiGet<Staff[]>('/staff')
      setStaff(data)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    await apiPost('/staff', form)
    setShowForm(false)
    setForm({ fullName: '', roleTitle: '', username: '', password: '' })
    load()
  }

  if (loading) return <div className="page-loading">Loading...</div>

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Staff & Roles</h2>
        <button className="btn-primary" onClick={() => setShowForm(true)}>Add Staff</button>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Add Staff</h3>
            <form onSubmit={handleCreate}>
              <label>Full Name *</label>
              <input value={form.fullName} onChange={(e) => setForm(f => ({ ...f, fullName: e.target.value }))} required />
              <label>Role Title *</label>
              <input value={form.roleTitle} onChange={(e) => setForm(f => ({ ...f, roleTitle: e.target.value }))} required />
              <label>Username (Phone) *</label>
              <input value={form.username} onChange={(e) => setForm(f => ({ ...f, username: e.target.value }))} placeholder="10-digit phone number" required />
              <label>Password *</label>
              <input type="password" value={form.password} onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))} placeholder="8+ chars, letters + numbers" required />
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <table className="data-table">
        <thead>
          <tr><th>Name</th><th>Role</th><th>Created</th></tr>
        </thead>
        <tbody>
          {staff.map((s) => (
            <tr key={s.id}>
              <td>{s.full_name}</td>
              <td><span className="badge">{s.role_title}</span></td>
              <td>{new Date(s.created_at).toLocaleDateString()}</td>
            </tr>
          ))}
          {staff.length === 0 && <tr><td colSpan={3} className="table-empty">No staff found</td></tr>}
        </tbody>
      </table>
    </div>
  )
}
