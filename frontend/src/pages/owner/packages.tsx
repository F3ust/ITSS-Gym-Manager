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

const CATEGORIES = ['membership', 'pt', 'combo']

export default function PackagesPage() {
  const [packages, setPackages] = useState<Package[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', duration_days: '', price: '', category: 'membership', description: '', pt_session_count: '' })
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [priceWarning, setPriceWarning] = useState<{ count: number; pendingBody: Record<string, unknown> } | null>(null)

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
    setForm({ name: '', duration_days: '', price: '', category: 'membership', description: '', pt_session_count: '' })
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
      pt_session_count: pkg.pt_session_count ? String(pkg.pt_session_count) : '',
    })
    setShowForm(true)
  }

  async function handleSave(e: React.FormEvent, confirmed = false) {
    e.preventDefault()
    const isPt = form.category === 'pt'
    const isCombo = form.category === 'combo'

    const body = {
      name: form.name,
      durationDays: isPt ? 30 : Number(form.duration_days),
      price: Number(form.price),
      category: form.category,
      description: form.description || undefined,
      sessionCount: null,
      ptSessionCount: (isPt || isCombo) && form.pt_session_count ? Number(form.pt_session_count) : null,
      ...(confirmed ? { confirmPriceChange: true } : {}),
    }
    if (editId) {
      try {
        await apiPatch(`/packages/${editId}`, body)
      } catch (err) {
        const msg = err instanceof Error ? err.message : ''
        const details = (err as Error & { details?: { activeCount?: number } }).details
        if (msg.includes('ERR_PRICE_CHANGE_WARNING') || msg.includes('active members')) {
          setPriceWarning({ count: details?.activeCount ?? 0, pendingBody: body })
          return
        }
        throw err
      }
    } else {
      await apiPost('/packages', body)
    }
    setShowForm(false)
    load()
  }

  async function confirmPriceUpdate() {
    if (!priceWarning || !editId) return
    await apiPatch(`/packages/${editId}`, { ...priceWarning.pendingBody, confirmPriceChange: true })
    setPriceWarning(null)
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

  if (loading) return (
    <div className="page-container">
      <div className="page-header">
        <div className="skeleton-header" style={{ width: 140 }} />
        <div className="skeleton-header" style={{ width: 120, height: 42, borderRadius: 12 }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginTop: 16 }}>
        <div>
          <div className="skeleton-header" style={{ width: 180, height: 20, marginBottom: 16 }} />
          <div className="stats-grid">
            <div className="skeleton-card" style={{ minHeight: 180 }} />
            <div className="skeleton-card" style={{ minHeight: 180 }} />
            <div className="skeleton-card" style={{ minHeight: 180 }} />
          </div>
        </div>
      </div>
    </div>
  )

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
              <label>Category *</label>
              <select value={form.category} onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c === 'pt' ? 'Personal Training' : c === 'combo' ? 'Combo Pack' : 'Gym Entry'}
                  </option>
                ))}
              </select>
              <label>Name *</label>
              <input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} required />
              {form.category !== 'pt' && (
                <>
                  <label>Duration (days) *</label>
                  <input type="number" value={form.duration_days} onChange={(e) => setForm(f => ({ ...f, duration_days: e.target.value }))} required />
                </>
              )}
              {(form.category === 'pt' || form.category === 'combo') && (
                <>
                  <label>PT Sessions Count *</label>
                  <input type="number" value={form.pt_session_count} onChange={(e) => setForm(f => ({ ...f, pt_session_count: e.target.value }))} required />
                </>
              )}
              <label>Price (VND) *</label>
              <input type="number" value={form.price} onChange={(e) => setForm(f => ({ ...f, price: e.target.value }))} required />
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

      {priceWarning && (
        <div className="modal-overlay" onClick={() => setPriceWarning(null)}>
          <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
            <h3>Price Change Warning</h3>
            <p>There are <strong>{priceWarning.count} active members</strong> using this package. Are you sure you want to change the price?</p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setPriceWarning(null)}>Cancel</button>
              <button className="btn-primary" onClick={confirmPriceUpdate}>Yes, Update</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginTop: 16 }}>
        <div>
          <h3 style={{ marginBottom: 12, fontSize: 15, borderBottom: '1px solid var(--stroke)', paddingBottom: 6 }}>1. Gym Entry (Membership)</h3>
          <div className="stats-grid">
            {packages.filter(p => p.category === 'membership').map((pkg) => (
              <div key={pkg.id} className="stat-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 180, gap: 10 }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="badge badge-active">Gym Entry</span>
                    <span className={`badge badge-${pkg.status}`}>{pkg.status === 'active' ? 'Active' : 'Inactive'}</span>
                  </div>
                  <h4 style={{ fontSize: 16, marginTop: 8, marginBottom: 4, fontWeight: 700 }}>{pkg.name}</h4>
                  <div style={{ fontSize: 13, color: 'var(--muted)' }}>Duration: {pkg.duration_days} days</div>
                  {pkg.description && <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8, lineHeight: '1.4' }}>{pkg.description}</p>}
                </div>
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent)', marginBottom: 8 }}>{formatVND(pkg.price)}</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn-sm" style={{ flex: 1 }} onClick={() => openEdit(pkg)}>Edit</button>
                    {pkg.status === 'active' && (
                      <button className="btn-sm btn-sm-danger" style={{ flex: 1 }} onClick={() => setConfirmDelete(pkg.id)}>Deactivate</button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {packages.filter(p => p.category === 'membership').length === 0 && (
              <p className="text-muted" style={{ gridColumn: '1/-1' }}>No memberships found</p>
            )}
          </div>
        </div>

        <div>
          <h3 style={{ marginBottom: 12, fontSize: 15, borderBottom: '1px solid var(--stroke)', paddingBottom: 6 }}>2. Personal Training (PT)</h3>
          <div className="stats-grid">
            {packages.filter(p => p.category === 'pt').map((pkg) => (
              <div key={pkg.id} className="stat-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 180, gap: 10 }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="badge badge-active" style={{ background: '#e0f2fe', color: '#0369a1' }}>PT Package</span>
                    <span className={`badge badge-${pkg.status}`}>{pkg.status === 'active' ? 'Active' : 'Inactive'}</span>
                  </div>
                  <h4 style={{ fontSize: 16, marginTop: 8, marginBottom: 4, fontWeight: 700 }}>{pkg.name}</h4>
                  <div style={{ fontSize: 13, color: 'var(--muted)' }}>Sessions: {pkg.pt_session_count} PT sessions (Unlimited)</div>
                  {pkg.description && <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8, lineHeight: '1.4' }}>{pkg.description}</p>}
                </div>
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent)', marginBottom: 8 }}>{formatVND(pkg.price)}</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn-sm" style={{ flex: 1 }} onClick={() => openEdit(pkg)}>Edit</button>
                    {pkg.status === 'active' && (
                      <button className="btn-sm btn-sm-danger" style={{ flex: 1 }} onClick={() => setConfirmDelete(pkg.id)}>Deactivate</button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {packages.filter(p => p.category === 'pt').length === 0 && (
              <p className="text-muted" style={{ gridColumn: '1/-1' }}>No PT packages found</p>
            )}
          </div>
        </div>

        <div>
          <h3 style={{ marginBottom: 12, fontSize: 15, borderBottom: '1px solid var(--stroke)', paddingBottom: 6 }}>3. Combo Packages (Gym Entry & PT)</h3>
          <div className="stats-grid">
            {packages.filter(p => p.category === 'combo').map((pkg) => (
              <div key={pkg.id} className="stat-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 180, gap: 10 }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="badge badge-active" style={{ background: '#fef3c7', color: '#b45309' }}>Combo</span>
                    <span className={`badge badge-${pkg.status}`}>{pkg.status === 'active' ? 'Active' : 'Inactive'}</span>
                  </div>
                  <h4 style={{ fontSize: 16, marginTop: 8, marginBottom: 4, fontWeight: 700 }}>{pkg.name}</h4>
                  <div style={{ fontSize: 13, color: 'var(--muted)' }}>Details: {pkg.duration_days} days gym access & {pkg.pt_session_count} PT sessions</div>
                  {pkg.description && <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8, lineHeight: '1.4' }}>{pkg.description}</p>}
                </div>
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent)', marginBottom: 8 }}>{formatVND(pkg.price)}</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn-sm" style={{ flex: 1 }} onClick={() => openEdit(pkg)}>Edit</button>
                    {pkg.status === 'active' && (
                      <button className="btn-sm btn-sm-danger" style={{ flex: 1 }} onClick={() => setConfirmDelete(pkg.id)}>Deactivate</button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {packages.filter(p => p.category === 'combo').length === 0 && (
              <p className="text-muted" style={{ gridColumn: '1/-1' }}>No combo packages found</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
