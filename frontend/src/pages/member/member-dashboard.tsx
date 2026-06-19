import { useState, useEffect } from 'react'
import { apiGet } from '../../api/client'
import { useAuth } from '../../contexts/auth-context'

interface CheckIn { id: string; check_in_at: string; method: string }

export default function MemberDashboard() {
  const { user } = useAuth()
  const [checkins, setCheckins] = useState<CheckIn[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    setLoading(true)
    apiGet<{ id: string }>(`/members?userId=${user.id}`)
      .then((member) => {
        if (member?.id) {
          apiGet<CheckIn[]>(`/check-ins?memberId=${member.id}`).then((data) => {
            setCheckins(data.slice(0, 5))
          }).catch(() => {})
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user])

  if (loading) return <div className="page-loading">Loading...</div>

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
