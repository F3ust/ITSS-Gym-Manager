import { useState, useEffect } from 'react'
import { apiGet, apiPost } from '../../api/client'

interface RoomType {
  id: string
  name: string
  description: string | null
  status: string
}

export default function RoomTypesPage() {
  const [items, setItems] = useState<RoomType[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', description: '' })

  useEffect(() => { load() }, [])

  async function load() {
    try {
      setLoading(true)
      const data = await apiGet<RoomType[]>('/room-types')
      setItems(data)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    await apiPost('/room-types', { name: form.name, description: form.description || undefined })
    setShowForm(false)
    setForm({ name: '', description: '' })
    load()
  }

  if (loading) return <div className="page-loading">Loading...</div>

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Room Types</h2>
        <button className="btn-primary" onClick={() => setShowForm(true)}>New Room Type</button>
      </div>
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>New Room Type</h3>
            <form onSubmit={handleCreate}>
              <label>Name *</label>
              <input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} required />
              <label>Description</label>
              <textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} rows={3} />
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <table className="data-table">
        <thead><tr><th>Name</th><th>Description</th><th>Status</th></tr></thead>
        <tbody>
          {items.map((r) => (
            <tr key={r.id}>
              <td>{r.name}</td>
              <td>{r.description || '-'}</td>
              <td><span className={`badge badge-${r.status}`}>{r.status}</span></td>
            </tr>
          ))}
          {items.length === 0 && <tr><td colSpan={3} className="table-empty">No room types</td></tr>}
        </tbody>
      </table>
    </div>
  )
}
