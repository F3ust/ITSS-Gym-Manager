import { useState, useEffect } from 'react'
import { apiGet } from '../../api/client'

interface CheckIn { id: string; check_in_at: string; method: string }

export default function MemberDashboard() {
  const [checkins, setCheckins] = useState<CheckIn[]>([])

  useEffect(() => {
    apiGet<CheckIn[]>('/check-ins?limit=5').then(setCheckins).catch(() => {})
  }, [])

  return (
    <div className="page-container">
      <div className="page-header"><h2>Member Dashboard</h2></div>
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-value">{checkins.length}</span>
          <span className="stat-label">Recent Check-Ins</span>
        </div>
      </div>
      {checkins.length > 0 && (
        <table className="data-table">
          <thead><tr><th>Date</th><th>Method</th></tr></thead>
          <tbody>
            {checkins.map((c) => (
              <tr key={c.id}>
                <td>{new Date(c.check_in_at).toLocaleString()}</td>
                <td><span className="badge">{c.method}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
