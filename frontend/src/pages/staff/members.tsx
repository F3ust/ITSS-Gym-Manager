import { useState, useEffect, useCallback } from 'react'
import { apiGet, apiPost } from '../../api/client'

interface Member {
  id: string
  full_name: string
  phone: string
  email: string | null
  dob: string
  job: string
  member_type: string
  status: string
  created_at: string
}

export default function StaffMembersPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [query, setQuery] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ fullName: '', phone: '', email: '', dob: '', job: '', memberType: 'regular' })
  const [dobError, setDobError] = useState('')

  const load = useCallback(async (search?: string) => {
    const data = search
      ? await apiGet<Member[]>(`/members?query=${encodeURIComponent(search)}`)
      : await apiGet<Member[]>('/members')
    setMembers(data)
  }, [])

  useEffect(() => { load() }, [load])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    load(query)
  }

  function validateDob(dob: string): boolean {
    if (!dob) { setDobError('Date of birth is required'); return false }
    const dobDate = new Date(dob)
    const today = new Date()
    let age = today.getFullYear() - dobDate.getFullYear()
    const mDiff = today.getMonth() - dobDate.getMonth()
    if (mDiff < 0 || (mDiff === 0 && today.getDate() < dobDate.getDate())) age--
    if (age < 16) { setDobError('Member must be at least 16 years old'); return false }
    setDobError('')
    return true
  }

  function handleDobChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm(f => ({ ...f, dob: e.target.value }))
    if (e.target.value) validateDob(e.target.value)
    else setDobError('')
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!validateDob(form.dob)) return
    await apiPost('/members', form)
    setShowForm(false)
    setForm({ fullName: '', phone: '', email: '', dob: '', job: '', memberType: 'regular' })
    setDobError('')
    load()
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Members</h2>
        <button className="btn-primary" onClick={() => setShowForm(true)}>Register Member</button>
      </div>

      <form className="search-bar" onSubmit={handleSearch}>
        <input placeholder="Search by name or phone..." value={query} onChange={(e) => setQuery(e.target.value)} />
        <button type="submit" className="btn-primary">Search</button>
      </form>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Register Member</h3>
            <form onSubmit={handleCreate}>
              <label>Full Name *</label>
              <input value={form.fullName} onChange={(e) => setForm(f => ({ ...f, fullName: e.target.value }))} required />
              <label>Phone *</label>
              <input value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} required />
              <label>Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} />
              <label>Date of Birth *</label>
              <input type="date" value={form.dob} onChange={handleDobChange} required />
              {dobError && <p style={{ color: '#d32f2f', fontSize: 13, margin: '4px 0 0' }}>{dobError}</p>}
              <label>Job *</label>
              <input value={form.job} onChange={(e) => setForm(f => ({ ...f, job: e.target.value }))} required />
              <label>Member Type</label>
              <select value={form.memberType} onChange={(e) => setForm(f => ({ ...f, memberType: e.target.value }))}>
                <option value="regular">Regular</option>
                <option value="vip">VIP</option>
              </select>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <table className="data-table">
        <thead><tr><th>Name</th><th>Phone</th><th>Type</th><th>Status</th><th>Registered</th></tr></thead>
        <tbody>
          {members.map((m) => (
            <tr key={m.id}>
              <td>{m.full_name}</td>
              <td>{m.phone}</td>
              <td><span className="badge">{m.member_type}</span></td>
              <td><span className={`badge badge-${m.status}`}>{m.status}</span></td>
              <td>{new Date(m.created_at).toLocaleDateString()}</td>
            </tr>
          ))}
          {members.length === 0 && <tr><td colSpan={5} className="table-empty">No members found</td></tr>}
        </tbody>
      </table>
    </div>
  )
}
