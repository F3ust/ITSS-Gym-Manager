import { useState, useEffect, useRef } from 'react'
import { apiGet, apiPost, apiPatch } from '../../api/client'

interface Equipment {
  id: string
  name: string
  quantity: number
  origin: string | null
  warranty_until: string | null
  status: string
}

const STATUSES = ['active', 'maintenance', 'inactive']

export default function EquipmentPage() {
  const [items, setItems] = useState<Equipment[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', origin: '', warrantyUntil: '' })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (!editingId) { setMenuPos(null); return }
    function onDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setEditingId(null)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [editingId])

  async function load() {
    try {
      setLoading(true)
      const data = await apiGet<Equipment[]>('/equipment')
      setItems(data)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    await apiPost('/equipment', {
      name: form.name,
      quantity: 1,
      origin: form.origin || undefined,
      warrantyUntil: form.warrantyUntil || undefined,
    })
    setShowForm(false)
    setForm({ name: '', origin: '', warrantyUntil: '' })
    load()
  }

  async function changeStatus(id: string, status: string) {
    try {
      await apiPatch('/equipment/' + id, { status })
    } catch (err) {
      console.error('Failed to update status', err)
    }
    setEditingId(null)
    load()
  }

  function openMenu(id: string, e: React.MouseEvent) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setMenuPos({ top: rect.bottom + 4, left: rect.left })
    setEditingId(id)
  }

  if (loading) return <div className="page-loading">Loading...</div>

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Equipment Catalog</h2>
        <button className="btn-primary" onClick={() => setShowForm(true)}>Add Equipment</button>
      </div>
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Add Equipment</h3>
            <form onSubmit={handleSave}>
              <label>Name *</label>
              <input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} required />
              <label>Origin</label>
              <input value={form.origin} onChange={(e) => setForm(f => ({ ...f, origin: e.target.value }))} />
              <label>Warranty Until</label>
              <input type="date" value={form.warrantyUntil} onChange={(e) => setForm(f => ({ ...f, warrantyUntil: e.target.value }))} />
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <table className="data-table">
        <thead><tr><th>Name</th><th>Origin</th><th>Warranty</th><th className="eq-col-status">Status</th></tr></thead>
        <tbody>
          {items.map((e) => (
            <tr key={e.id}>
              <td>{e.name}</td>
              <td>{e.origin || '-'}</td>
              <td>{e.warranty_until ? new Date(e.warranty_until).toLocaleDateString() : '-'}</td>
              <td className="eq-col-status">
                <span
                  className="eq-status-badge"
                  onClick={(ev) => openMenu(e.id, ev)}
                >
                  <span className={`badge badge-${e.status}`}>{e.status}</span>
                  <span className="eq-arrow">&#9662;</span>
                </span>
              </td>
            </tr>
          ))}
          {items.length === 0 && <tr><td colSpan={4} className="table-empty">No equipment</td></tr>}
        </tbody>
      </table>
      {menuPos && (() => {
        const item = items.find(x => x.id === editingId)
        if (!item) return null
        return (
          <div className="eq-overlay" onClick={() => setEditingId(null)}>
            <div
              ref={menuRef}
              className="eq-menu"
              style={{ top: menuPos.top, left: menuPos.left }}
              onClick={(e) => e.stopPropagation()}
            >
              {STATUSES.map(s => (
                <div
                  key={s}
                  className={`eq-menu-item${s === item.status ? ' eq-menu-item-active' : ''}`}
                  onClick={() => changeStatus(item.id, s)}
                >
                  <span className={`badge badge-${s}`}>{s}</span>
                </div>
              ))}
            </div>
          </div>
        )
      })()}
      <style>{`
        .eq-col-status, .data-table th.eq-col-status { min-width: 120px; text-align: center; }
        .eq-status-badge {
          cursor: pointer; display: inline-flex; align-items: center; gap: 4px;
          transition: opacity 0.15s;
        }
        .eq-status-badge:hover { opacity: 0.7; }
        .eq-arrow { font-size: 10px; color: var(--muted); }
        .eq-overlay { position: fixed; inset: 0; z-index: 100; }
        .eq-menu {
          position: fixed; z-index: 101;
          background: var(--panel); border: 1px solid var(--stroke);
          border-radius: 10px; padding: 4px; box-shadow: var(--shadow-strong);
          display: flex; flex-direction: column; gap: 2px; min-width: 130px;
        }
        .eq-menu-item { padding: 6px 8px; border-radius: 8px; cursor: pointer; transition: background 0.12s; }
        .eq-menu-item:hover { background: var(--chip); }
        .eq-menu-item-active { background: var(--chip); }
      `}</style>
    </div>
  )
}
