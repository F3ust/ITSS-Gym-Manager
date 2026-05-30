import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/auth-context'
import { apiGet } from '../../api/client'

interface Member { id: string; user_id: string }
interface Subscription { id: string; member_id: string; package_id: string; start_date: string; end_date: string; remaining_sessions: number | null; remaining_pt_sessions: number | null; status: string }
interface Package { id: string; name: string; duration_days: number; price: number; category: string; session_count: number | null; pt_session_count: number | null }

export default function MyPackagePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [activeSub, setActiveSub] = useState<Subscription | null>(null)
  const [pendingSub, setPendingSub] = useState<Subscription | null>(null)
  const [activePkg, setActivePkg] = useState<Package | null>(null)
  const [pendingPkg, setPendingPkg] = useState<Package | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    apiGet<Member>(`/members?userId=${user.id}`).then((member) => {
      if (!member) return
      apiGet<Subscription[]>('/subscriptions').then((subs) => {
        const today = new Date().toISOString().split('T')[0]
        const memberSubs = subs.filter((s) => s.member_id === member.id)
        const active = memberSubs.find((s) => s.status === 'active' && s.end_date >= today)
        const pending = memberSubs.find((s) => s.status === 'pending')
        if (active) {
          setActiveSub(active)
          apiGet<Package[]>('/packages').then((pkgs) => {
            setActivePkg(pkgs.find((p) => p.id === active.package_id) || null)
          })
        }
        if (pending) {
          setPendingSub(pending)
          apiGet<Package[]>('/packages').then((pkgs) => {
            setPendingPkg(pkgs.find((p) => p.id === pending.package_id) || null)
          })
        }
      })
    }).catch(() => {}).finally(() => setLoading(false))
  }, [user])

  if (loading) return <div className="page-loading">Loading...</div>
  if (!activeSub && !pendingSub) return <div className="page-container"><p className="text-muted">No active package subscription.</p></div>

  return (
    <div className="page-container">
      <div className="page-header"><h2>My Package</h2></div>

      {activeSub && activePkg && (
        <>
          <h3 style={{ marginBottom: 12 }}>Current Package</h3>
          <div className="detail-card" style={{ marginBottom: 24 }}>
            <div className="detail-row"><span className="detail-label">Package</span><span className="detail-value" style={{ fontSize: 18, fontWeight: 700 }}>{activePkg.name}</span></div>
            <div className="detail-row"><span className="detail-label">Sessions</span><span className="detail-value">{activeSub.remaining_sessions !== null ? `${activeSub.remaining_sessions} / ${activePkg.session_count || activeSub.remaining_sessions}` : 'Unlimited'}</span></div>
            {activeSub.remaining_pt_sessions !== null && (
              <div className="detail-row"><span className="detail-label">PT Sessions</span><span className="detail-value">{activeSub.remaining_pt_sessions} / {activePkg.pt_session_count || activeSub.remaining_pt_sessions}</span></div>
            )}
            <div className="detail-row"><span className="detail-label">End Date</span><span className="detail-value">{new Date(activeSub.end_date).toLocaleDateString()}</span></div>
            <div className="detail-row">
              <span className="detail-label">Days Left</span>
              <span className="detail-value" style={{ color: Math.ceil((new Date(activeSub.end_date).getTime() - Date.now()) / 86400000) <= 7 ? '#d32f2f' : undefined, fontWeight: 600 }}>
                {Math.ceil((new Date(activeSub.end_date).getTime() - Date.now()) / 86400000)}
              </span>
            </div>
            {(() => {
              const daysLeft = Math.ceil((new Date(activeSub.end_date).getTime() - Date.now()) / 86400000)
              const sessionsLow = activeSub.remaining_sessions !== null && activeSub.remaining_sessions <= 5
              const ptSessionsLow = activeSub.remaining_pt_sessions !== null && activeSub.remaining_pt_sessions <= 5
              return (daysLeft <= 7 || sessionsLow || ptSessionsLow) && (
                <div className="detail-row" style={{ borderBottom: 'none', paddingTop: 4 }}>
                  <button className="btn-primary" style={{ width: '100%', padding: '10px' }} onClick={() => navigate('/member/register-package')}>
                    Renew Now
                  </button>
                </div>
              )
            })()}
          </div>
        </>
      )}

      {pendingSub && pendingPkg && (
        <>
          <h3 style={{ marginBottom: 12, color: '#f57c00' }}>Next Up (Pending)</h3>
          <div className="detail-card">
            <div className="detail-row"><span className="detail-label">Package</span><span className="detail-value" style={{ fontSize: 18, fontWeight: 700 }}>{pendingPkg.name}</span></div>
            <div className="detail-row"><span className="detail-label">Sessions</span><span className="detail-value">{pendingSub.remaining_sessions !== null ? pendingSub.remaining_sessions : 'Unlimited'}</span></div>
            {pendingSub.remaining_pt_sessions !== null && (
              <div className="detail-row"><span className="detail-label">PT Sessions</span><span className="detail-value">{pendingSub.remaining_pt_sessions}</span></div>
            )}
            <div className="detail-row"><span className="detail-label">End Date</span><span className="detail-value">{new Date(pendingSub.end_date).toLocaleDateString()}</span></div>
            <div className="detail-row"><span className="detail-label">Start Date</span><span className="detail-value">{new Date(pendingSub.start_date).toLocaleDateString()}</span></div>
          </div>
        </>
      )}

      <style>{`
        .detail-card { background: #fff; border-radius: 8px; padding: 16px 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.12); }
        .detail-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #f0f0f0; }
        .detail-row:last-child { border-bottom: none; }
        .detail-label { font-size: 14px; color: #666; }
        .detail-value { font-size: 15px; color: #333; text-align: right; }
      `}</style>
    </div>
  )
}
