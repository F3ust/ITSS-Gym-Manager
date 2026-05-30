import { useState, useEffect } from 'react'
import { apiGet, apiPost, apiPatch } from '../../api/client'

interface Package {
  id: string
  name: string
  duration_days: number
  price: number
  category: string
  session_count: number | null
  pt_session_count: number | null
  description: string | null
  status: string
}

const CATEGORIES = ['membership', 'pt', 'class', 'other']

export default function PackagesPage() {
  const [packages, setPackages] = useState<Package[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', duration_days: '', price: '', category: 'membership', description: '', session_count: '', pt_session_count: '' })
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    try {
      setLoading(true)
      const data = await apiGet<Package[]>('/packages')
      setPackages(data)
    } finally {
      setLoading(false)
    }
  }

  function openCreate() {
    setEditId(null)
    setForm({ name: '', duration_days: '', price: '', category: 'membership', description: '', session_count: '', pt_session_count: '' })
    setShowForm(true)
  }

  function openEdit(pkg: Package) {
    setEditId(pkg.id)
    setForm({
      name: pkg.name,
      duration_days: String(pkg.duration_days),
      price: String(pkg.price),
      category: pkg.category,
      description: pkg.description || '',
      session_count: pkg.session_count ? String(pkg.session_count) : '',
      pt_session_count: pkg.pt_session_count ? String(pkg.pt_session_count) : '',
    })
    setShowForm(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const body = {
      name: form.name,
      durationDays: Number(form.duration_days),
      price: Number(form.price),
      category: form.category,
      description: form.description || undefined,
      sessionCount: form.session_count ? Number(form.session_count) : null,
    }
    if (editId) {
      await apiPatch(`/packages/${editId}`, body)
    } else {
      await apiPost('/packages', body)
    }
    setShowForm(false)
    load()
  }

  async function handleDeactivate(id: string) {
    await apiPatch(`/packages/${id}`, { status: 'inactive' })
    setConfirmDelete(null)
    load()
  }

  function formatVND(amount: number) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)
  }

  if (loading) return <div className="page-loading">Loading...</div>

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Packages</h2>
        <button className="btn-primary" onClick={openCreate}>New Package</button>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editId ? 'Edit Package' : 'New Package'}</h3>
            <form onSubmit={handleSave}>
              <label>Name *</label>
              <input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} required />
              <label>Duration (days) *</label>
              <input type="number" value={form.duration_days} onChange={(e) => setForm(f => ({ ...f, duration_days: e.target.value }))} required />
              <label>Sessions Count (Optional)</label>
              <input type="number" placeholder="Leave empty for time-based" value={form.session_count} onChange={(e) => setForm(f => ({ ...f, session_count: e.target.value }))} />
              <label>Price (VND) *</label>
              <input type="number" value={form.price} onChange={(e) => setForm(f => ({ ...f, price: e.target.value }))} required />
              <label>Category *</label>
              <select value={form.category} onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <label>Description</label>
              <textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} rows={3} />
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn-primary">{editId ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
            <h3>Deactivate Package</h3>
            <p>Are you sure you want to deactivate this package?</p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className="btn-danger" onClick={() => handleDeactivate(confirmDelete)}>Deactivate</button>
            </div>
          </div>
        </div>
      )}

      <table className="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Category</th>
            <th>Duration / Sessions</th>
            <th>Price</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {packages.map((pkg) => (
            <tr key={pkg.id}>
              <td>{pkg.name}</td>
              <td><span className="badge">{pkg.category}</span></td>
              <td>
                {pkg.duration_days} days
                {pkg.session_count ? ` (${pkg.session_count} sessions)` : ''}
              </td>
              <td>{formatVND(pkg.price)}</td>
              <td><span className={`badge badge-${pkg.status}`}>{pkg.status}</span></td>
              <td className="table-actions">
                <button className="btn-sm" onClick={() => openEdit(pkg)}>Edit</button>
                {pkg.status === 'active' && (
                  <button className="btn-sm btn-sm-danger" onClick={() => setConfirmDelete(pkg.id)}>Deactivate</button>
                )}
              </td>
            </tr>
          ))}
          {packages.length === 0 && (
            <tr><td colSpan={6} className="table-empty">No packages found</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
