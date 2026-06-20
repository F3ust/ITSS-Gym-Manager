import { useState, useEffect } from 'react'
import { apiGet, apiPatch, apiPut } from '../../api/client'

interface User { id: string; username: string; status: string; created_at: string; role: string }
interface Role { id: string; name: string }
interface AuditLog { id: string; created_at: string; user_id: string; username: string | null; action: string; details: any }
interface GymProfile { id: string; name: string; address: string; phone: string; email: string; open_hours: string }

export default function SettingsPage() {
  const [tab, setTab] = useState('users')
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [gymForm, setGymForm] = useState({ name: '', address: '', phone: '', email: '', open_hours: '' })
  const [gymSaving, setGymSaving] = useState(false)
  const [gymMessage, setGymMessage] = useState('')

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    try { setUsers(await apiGet<User[]>('/roles/users')) } catch { /* */ }
    try { setRoles(await apiGet<Role[]>('/roles')) } catch { /* */ }
    try { setLogs(await apiGet<AuditLog[]>('/roles/audit-logs')) } catch { /* */ }
    try {
      const gp = await apiGet<GymProfile>('/gym-profile')
      if (gp) setGymForm({ name: gp.name, address: gp.address, phone: gp.phone, email: gp.email || '', open_hours: gp.open_hours || '' })
    } catch { /* */ }
    setLoading(false)
  }

  async function saveGymProfile(e: React.FormEvent) {
    e.preventDefault()
    setGymMessage('')
    setGymSaving(true)
    try {
      await apiPut<GymProfile>('/gym-profile', gymForm)
      setGymMessage('Gym profile updated successfully')
    } catch (err) {
      setGymMessage(err instanceof Error ? err.message : 'Failed to update')
    } finally {
      setGymSaving(false)
    }
  }

  async function toggleStatus(userId: string, current: string) {
    const newStatus = current === 'active' ? 'inactive' : 'active'
    try {
      await apiPatch('/roles/users/' + userId + '/status', { status: newStatus })
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: newStatus } : u))
    } catch (e) { alert('Failed to update status: ' + (e as Error).message) }
  }

  async function changeRole(userId: string, roleName: string) {
    try {
      await apiPatch('/roles/users/' + userId + '/role', { role: roleName })
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: roleName } : u))
    } catch (e) { alert('Failed to change role: ' + (e as Error).message) }
  }

  const filteredUsers = users.filter(u =>
    u.username.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <div className="page-loading">Loading...</div>

  return (
    <div className="page-container">
      <div className="page-header"><h2>System Settings</h2></div>
      <div className="tabs">
        <button className={`tab ${tab === 'profile' ? 'tab-active' : ''}`} onClick={() => setTab('profile')}>Gym Profile</button>
        <button className={`tab ${tab === 'users' ? 'tab-active' : ''}`} onClick={() => setTab('users')}>User Management</button>
        <button className={`tab ${tab === 'roles' ? 'tab-active' : ''}`} onClick={() => setTab('roles')}>Role Management</button>
        <button className={`tab ${tab === 'audit' ? 'tab-active' : ''}`} onClick={() => setTab('audit')}>Audit Logs</button>
      </div>

      {tab === 'profile' && (
        <div className="card" style={{ padding: 24 }}>
          <form onSubmit={saveGymProfile} style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 480 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--muted)', marginBottom: 4 }}>Gym Name *</label>
              <input value={gymForm.name} onChange={(e) => setGymForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--muted)', marginBottom: 4 }}>Address *</label>
              <input value={gymForm.address} onChange={(e) => setGymForm(f => ({ ...f, address: e.target.value }))} required />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--muted)', marginBottom: 4 }}>Phone *</label>
              <input value={gymForm.phone} onChange={(e) => setGymForm(f => ({ ...f, phone: e.target.value }))} required />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--muted)', marginBottom: 4 }}>Email</label>
              <input value={gymForm.email} onChange={(e) => setGymForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--muted)', marginBottom: 4 }}>Opening Hours</label>
              <input value={gymForm.open_hours} onChange={(e) => setGymForm(f => ({ ...f, open_hours: e.target.value }))} placeholder="e.g. Mon-Sun 6:00-22:00" />
            </div>
            {gymMessage && <p style={{ fontSize: 14, color: gymMessage.includes('updated') ? '#2e7d32' : '#d32f2f', margin: 0 }}>{gymMessage}</p>}
            <button type="submit" className="btn-primary" disabled={gymSaving} style={{ alignSelf: 'flex-start', padding: '10px 24px' }}>
              {gymSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>
      )}

      {tab === 'users' && (
        <div className="card">
          <div style={{ marginBottom: 12 }}>
            <input placeholder="Search by phone..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <table className="data-table">
            <thead><tr><th>Phone</th><th>Role</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead>
            <tbody>
              {filteredUsers.map(u => (
                <tr key={u.id}>
                  <td>{u.username}</td>
                  <td>
                    <select value={u.role || ''} onChange={e => changeRole(u.id, e.target.value)}>
                      {roles.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                    </select>
                  </td>
                  <td><span className={`badge badge-${u.status}`}>{u.status}</span></td>
                  <td>{new Date(u.created_at).toLocaleDateString()}</td>
                  <td>
                    <button className="btn-secondary btn-sm" onClick={() => toggleStatus(u.id, u.status)}>
                      {u.status === 'active' ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && <tr><td colSpan={5} className="table-empty">No users found</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'roles' && (
        <div className="card">
          <table className="data-table">
            <thead><tr><th>Role Name</th><th>User Count</th></tr></thead>
            <tbody>
              {roles.map(r => (
                <tr key={r.id}>
                  <td><span className="badge">{r.name}</span></td>
                  <td>{users.filter(u => u.role === r.name).length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'audit' && (
        <div className="card">
          {logs.length === 0
            ? <p className="text-muted">No audit logs available.</p>
            : (
              <table className="data-table">
                <thead><tr><th>Time</th><th>User</th><th>Action</th><th>Details</th></tr></thead>
                <tbody>
                  {logs.map(l => (
                    <tr key={l.id}>
                      <td>{new Date(l.created_at).toLocaleString()}</td>
                      <td>{l.username || l.user_id || '-'}</td>
                      <td><span className="badge">{l.action}</span></td>
                      <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {l.details && typeof l.details === 'object' ? JSON.stringify(l.details) : (l.details || '-')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          }
        </div>
      )}
    </div>
  )
}
