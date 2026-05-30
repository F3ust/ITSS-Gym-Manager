import { useState, useEffect } from 'react'
import { apiGet, apiPost, apiDelete } from '../../api/client'

interface Subscription {
  id: string
  member_id: string
  package_id: string
  start_date: string
  end_date: string
  remaining_sessions: number | null
  remaining_pt_sessions: number | null
  status: string
}

interface Member { id: string; full_name: string; phone: string }
interface Package { id: string; name: string; price: number; duration_days: number }

export default function RenewalsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [members, setMembers] = useState<Map<string, Member>>(new Map())
  const [pkgs, setPkgs] = useState<Map<string, Package>>(new Map())
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [cancelTarget, setCancelTarget] = useState<Subscription | null>(null)

  useEffect(() => {
    Promise.all([
      apiGet<Subscription[]>('/subscriptions'),
      apiGet<Member[]>('/members'),
      apiGet<Package[]>('/packages'),
    ]).then(([subs, mems, pkgList]) => {
      setSubscriptions(subs)
      setMembers(new Map(mems.map((m: Member) => [m.id, m])))
      setPkgs(new Map(pkgList.map((p: Package) => [p.id, p])))
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  function isExpiring(endDate: string) {
    const daysLeft = Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000)
    return daysLeft <= 7 && daysLeft >= 0
  }

  async function renew(sub: Subscription) {
    setError('')
    setMessage('')
    try {
      const end = new Date(sub.end_date)
      end.setDate(end.getDate() + 30)
      await apiPost(`/subscriptions/${sub.id}/renew`, {
        endDate: end.toISOString().split('T')[0],
        remainingSessions: 24,
        remainingPtSessions: sub.remaining_pt_sessions ?? null,
      })
      setMessage('Renewal processed')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Renewal failed')
    }
  }

  async function cancelSub() {
    if (!cancelTarget) return
    setError('')
    setMessage('')
    try {
      await apiDelete(`/subscriptions/${cancelTarget.id}`)
      setMessage('Subscription cancelled')
      setCancelTarget(null)
      const subs = await apiGet<Subscription[]>('/subscriptions')
      setSubscriptions(subs)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cancel failed')
    }
  }

  if (loading) return <div className="page-loading">Loading...</div>

  return (
    <div className="page-container">
      <div className="page-header"><h2>Renewals</h2></div>
      {error && <p className="form-error">{error}</p>}
      {message && <p style={{ color: '#2e7d32', fontSize: 14 }}>{message}</p>}
      <table className="data-table">
        <thead><tr><th>Member</th><th>Package</th><th>End Date</th><th>Status</th><th>Action</th></tr></thead>
        <tbody>
          {subscriptions.filter((s) => s.status === 'active' || s.status === 'pending').map((s) => {
            const member = members.get(s.member_id)
            const pkg = pkgs.get(s.package_id)
            const expiring = s.status === 'active' && isExpiring(s.end_date)
            return (
              <tr key={s.id}>
                <td>{member?.full_name || 'Unknown'}</td>
                <td>{pkg?.name || 'Unknown'}</td>
                <td style={expiring ? { color: '#d32f2f', fontWeight: 600 } : undefined}>
                  {new Date(s.end_date).toLocaleDateString()}{expiring ? ' ⚠' : ''}
                </td>
                <td><span className={`badge badge-${s.status}`}>{s.status}</span></td>
                <td>
                  {s.status === 'active' && expiring && <button className="btn-sm btn-primary" onClick={() => renew(s)}>Renew</button>}
                  {s.status !== 'cancelled' && <button className="btn-sm btn-sm-danger" style={{ marginLeft: s.status === 'active' && expiring ? 6 : 0 }} onClick={() => setCancelTarget(s)}>Cancel</button>}
                </td>
              </tr>
            )
          })}
          {subscriptions.filter((s) => s.status === 'active' || s.status === 'pending').length === 0 && (
            <tr><td colSpan={5} className="table-empty">No active subscriptions</td></tr>
          )}
        </tbody>
      </table>

      {cancelTarget && (
        <div className="modal-overlay" onClick={() => setCancelTarget(null)}>
          <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
            <h3>Cancel Subscription</h3>
            <p>Cancel {members.get(cancelTarget.member_id)?.full_name || 'this member'}'s subscription? PT assignment will also be deactivated.</p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setCancelTarget(null)}>Keep</button>
              <button className="btn-danger" onClick={cancelSub}>Yes, Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
