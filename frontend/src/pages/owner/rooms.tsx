import { useState, useEffect } from 'react'
import { apiGet, apiPost } from '../../api/client'

interface Room {
  id: string
  name: string
  room_type_id: string | null
  capacity: number | null
  status: string
}

interface RoomType {
  id: string
  name: string
}

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', roomTypeId: '', capacity: '' })

  useEffect(() => { load() }, [])

  async function load() {
    try {
      setLoading(true)
      const [roomsData, typesData] = await Promise.all([
        apiGet<Room[]>('/rooms'),
        apiGet<RoomType[]>('/room-types'),
      ])
      setRooms(roomsData)
      setRoomTypes(typesData)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    await apiPost('/rooms', {
      name: form.name,
      roomTypeId: form.roomTypeId || undefined,
      capacity: form.capacity ? Number(form.capacity) : undefined,
    })
    setShowForm(false)
    setForm({ name: '', roomTypeId: '', capacity: '' })
    load()
  }

  if (loading) return <div className="page-loading">Loading...</div>

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Rooms</h2>
        <button className="btn-primary" onClick={() => setShowForm(true)}>New Room</button>
      </div>
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>New Room</h3>
            <form onSubmit={handleCreate}>
              <label>Name *</label>
              <input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} required />
              <label>Room Type</label>
              <select value={form.roomTypeId} onChange={(e) => setForm(f => ({ ...f, roomTypeId: e.target.value }))}>
                <option value="">-- None --</option>
                {roomTypes.map((rt) => <option key={rt.id} value={rt.id}>{rt.name}</option>)}
              </select>
              <label>Capacity</label>
              <input type="number" value={form.capacity} onChange={(e) => setForm(f => ({ ...f, capacity: e.target.value }))} />
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <table className="data-table">
        <thead><tr><th>Name</th><th>Type</th><th>Capacity</th><th>Status</th></tr></thead>
        <tbody>
          {rooms.map((r) => (
            <tr key={r.id}>
              <td>{r.name}</td>
              <td>{roomTypes.find((rt) => rt.id === r.room_type_id)?.name || '-'}</td>
              <td>{r.capacity ?? '-'}</td>
              <td><span className={`badge badge-${r.status}`}>{r.status}</span></td>
            </tr>
          ))}
          {rooms.length === 0 && <tr><td colSpan={4} className="table-empty">No rooms</td></tr>}
        </tbody>
      </table>
    </div>
  )
}
