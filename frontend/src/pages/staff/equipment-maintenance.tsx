import { useState, useEffect, useCallback } from 'react'
import { apiGet, apiPost } from '../../api/client'
import type { AppNotification } from '../../hooks/use-notifications'

interface Equipment { id: string; name: string; status: string }
interface EquipmentAlert {
  id: string
  equipment_id: string
  equipment_name: string
  alert_type: 'maintenance' | 'warranty'
  status: string
  message: string
  created_at: string
}

const NOTIFICATION_KEY = 'gym_notifications'

function loadNotifications(): AppNotification[] {
  try {
    return JSON.parse(localStorage.getItem(NOTIFICATION_KEY) || '[]')
  } catch {
    return []
  }
}

function saveNotifications(items: AppNotification[]) {
  localStorage.setItem(NOTIFICATION_KEY, JSON.stringify(items))
}

export default function EquipmentMaintenancePage() {
  const [items, setItems] = useState<Equipment[]>([])
  const [alerts, setAlerts] = useState<EquipmentAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  function syncAlertsToNotifications(alerts: EquipmentAlert[]) {
    if (!alerts.length) return
    const current = loadNotifications()
    const next = [...current]

    for (const alert of alerts) {
      const id = `equipment-alert:${alert.alert_type}:${alert.equipment_id}:${alert.id}`
      if (next.some((item) => item.id === id)) continue
      next.unshift({
        id,
        icon: alert.alert_type === 'maintenance' ? '🛠️' : '⚠️',
        message: `${alert.equipment_name}: ${alert.message}`,
        timestamp: alert.created_at,
        read: false,
      })
    }

    if (next.length !== current.length) {
      saveNotifications(next)
    }
  }

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setMessage('')
      setError('')
      const [data, alertData] = await Promise.all([
        apiGet<Equipment[]>('/equipment'),
        apiGet<EquipmentAlert[]>('/equipment/alerts?status=all'),
      ])
      setItems(data)
      setAlerts(alertData)
      syncAlertsToNotifications(alertData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    async function fetchData() {
      await load()
    }
    void fetchData()
  }, [load])

  async function reportFault(equipmentId: string) {
    if (!note.trim()) return
    setError('')
    setMessage('')
    try {
      await apiPost(`/equipment/${equipmentId}/maintenance`, { note })
      setShowForm(null)
      setNote('')
      setMessage('Maintenance reported')
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to report')
    }
  }

  if (loading) return <div className="page-loading">Loading...</div>

  return (
    <div className="page-container">
      <div className="page-header"><h2>Equipment Maintenance</h2></div>
      {error && <p className="form-error">{error}</p>}
      {message && <p style={{ color: '#2e7d32', fontSize: 14 }}>{message}</p>}
      {alerts.length > 0 && (
        <div className="card" style={{ marginBottom: 16, padding: 16 }}>
          <h3>Equipment Alerts</h3>
          <div className="alert-grid" style={{ display: 'grid', gap: 12 }}>
            {alerts.map((alert) => (
              <div key={alert.id} className="alert-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <strong>{alert.equipment_name}</strong>
                  <span className={`badge badge-${alert.alert_type}`}>{alert.alert_type === 'maintenance' ? 'Maintenance' : 'Warranty'}</span>
                </div>
                <p style={{ margin: '8px 0' }}>{alert.message}</p>
                <small>{new Date(alert.created_at).toLocaleDateString()}</small>
              </div>
            ))}
          </div>
        </div>
      )}
      <table className="data-table">
        <thead><tr><th>Name</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {items.map((e) => (
            <tr key={e.id}>
              <td>{e.name}</td>
              <td><span className={`badge badge-${e.status}`}>{e.status}</span></td>
              <td>
                <button className="btn-sm btn-sm-danger" onClick={() => setShowForm(e.id)}>Report Fault</button>
                {showForm === e.id && (
                  <div className="modal-overlay" onClick={() => setShowForm(null)}>
                    <div className="modal modal-sm" onClick={(ev) => ev.stopPropagation()}>
                      <h3>Report Fault: {e.name}</h3>
                      <textarea value={note} onChange={(ev) => setNote(ev.target.value)} placeholder="Describe the issue..." rows={3} />
                      <div className="modal-actions">
                        <button className="btn-secondary" onClick={() => setShowForm(null)}>Cancel</button>
                        <button className="btn-danger" onClick={() => reportFault(e.id)}>Submit</button>
                      </div>
                    </div>
                  </div>
                )}
              </td>
            </tr>
          ))}
          {items.length === 0 && <tr><td colSpan={3} className="table-empty">No equipment</td></tr>}
        </tbody>
      </table>
    </div>
  )
}
