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
  const [gymSubs, setGymSubs] = useState<any[]>([])
  const [totalPtSessions, setTotalPtSessions] = useState<number | null>(null)
  const [allPkgs, setAllPkgs] = useState<Package[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    apiGet<Member>(`/members?userId=${user.id}`).then((member) => {
      if (!member) return
      Promise.all([
        apiGet<Subscription[]>('/subscriptions?memberId=' + member.id),
        apiGet<Package[]>('/packages')
      ]).then(([subs, pkgs]) => {
        setAllPkgs(pkgs)
        const memberSubs = subs.filter((s) => s.member_id === member.id)
        
        let ptSum = 0
        let hasPt = false
        memberSubs.forEach((s) => {
          if (s.status === 'active' && s.remaining_pt_sessions !== null) {
            hasPt = true
            ptSum += s.remaining_pt_sessions
          }
        })
        setTotalPtSessions(hasPt ? ptSum : null)

        const gymEntrySubs = memberSubs.filter((s) => {
          const pkg = pkgs.find((p) => p.id === s.package_id)
          return (pkg?.category === 'membership' || pkg?.category === 'combo') && s.status !== 'cancelled'
        })

        // Sort chronologically by start date
        gymEntrySubs.sort((a, b) => a.start_date.localeCompare(b.start_date))
        setGymSubs(gymEntrySubs)
      })
    }).catch(() => {}).finally(() => setLoading(false))
  }, [user])

  if (loading) return <div className="page-loading">Loading...</div>
  if (gymSubs.length === 0 && totalPtSessions === null) {
    return (
      <div className="page-container">
        <p className="text-muted">You have not registered for any packages.</p>
        <button className="btn-primary" style={{ marginTop: 12 }} onClick={() => navigate('/member/register-package')}>Register Package</button>
      </div>
    )
  }

  const today = new Date().toISOString().split('T')[0]
  
  // Find current active gym entry subscription covering today
  const activeGymSub = gymSubs.find(s => s.status === 'active' && s.start_date <= today && s.end_date >= today)
  const activeGymPkg = activeGymSub ? allPkgs.find(p => p.id === activeGymSub.package_id) : null

  // Find upcoming/pending gym entry subscriptions
  const upcomingGymSubs = gymSubs.filter(s => s.id !== activeGymSub?.id)

  return (
    <div className="page-container">
      <div className="page-header"><h2>My Package</h2></div>

      {/* PT Sessions Section */}
      {totalPtSessions !== null && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ marginBottom: 12 }}>Personal Trainer Sessions</h3>
          <div className="detail-card">
            <div className="detail-row"><span className="detail-label">Total Remaining PT Sessions</span><span className="detail-value" style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent)' }}>{totalPtSessions} sessions</span></div>
            <div className="detail-row"><span className="detail-label">Expiration</span><span className="detail-value" style={{ fontWeight: 600 }}>No expiration date</span></div>
          </div>
        </div>
      )}

      {/* Gym Entry Section */}
      <h3 style={{ marginBottom: 12 }}>Gym Entry Membership</h3>
      {activeGymSub && activeGymPkg ? (
        <div style={{ marginBottom: 24 }}>
          <div className="detail-card">
            <div className="detail-row"><span className="detail-label">Package</span><span className="detail-value" style={{ fontSize: 18, fontWeight: 700 }}>{activeGymPkg.name}</span></div>
            <div className="detail-row"><span className="detail-label">Start Date</span><span className="detail-value">{new Date(activeGymSub.start_date).toLocaleDateString()}</span></div>
            <div className="detail-row"><span className="detail-label">End Date</span><span className="detail-value">{new Date(activeGymSub.end_date).toLocaleDateString()}</span></div>
            <div className="detail-row">
              <span className="detail-label">Days Remaining</span>
              <span className="detail-value" style={{ color: Math.ceil((new Date(activeGymSub.end_date).getTime() - Date.now()) / 86400000) <= 7 ? '#d32f2f' : undefined, fontWeight: 600 }}>
                {Math.max(0, Math.ceil((new Date(activeGymSub.end_date).getTime() - Date.now()) / 86400000))} days
              </span>
            </div>
            {(() => {
              const daysLeft = Math.ceil((new Date(activeGymSub.end_date).getTime() - Date.now()) / 86400000)
              return (daysLeft <= 7) && (
                <div className="detail-row" style={{ borderBottom: 'none', paddingTop: 10 }}>
                  <button className="btn-primary" style={{ width: '100%', padding: '10px' }} onClick={() => navigate('/member/register-package')}>
                    Renew Now
                  </button>
                </div>
              )
            })()}
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: 24, padding: 20, background: '#f9f9f9', borderRadius: 8, textAlign: 'center' }}>
          <p className="text-muted" style={{ marginBottom: 12 }}>You do not have an active gym entry membership.</p>
          <button className="btn-primary" onClick={() => navigate('/member/register-package')}>Register Gym Entry</button>
        </div>
      )}

      {/* Upcoming / Queued Gym Entry Packages */}
      {upcomingGymSubs.length > 0 && (
        <div>
          <h3 style={{ marginBottom: 12, color: '#f57c00' }}>Pending / Upcoming Packages</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {upcomingGymSubs.map(s => {
              const pkg = allPkgs.find(p => p.id === s.package_id)
              return (
                <div className="detail-card" key={s.id}>
                  <div className="detail-row"><span className="detail-label">Package</span><span className="detail-value" style={{ fontWeight: 600 }}>{pkg?.name || 'Pending Package'}</span></div>
                  <div className="detail-row"><span className="detail-label">Start Date</span><span className="detail-value">{new Date(s.start_date).toLocaleDateString()}</span></div>
                  <div className="detail-row"><span className="detail-label">End Date</span><span className="detail-value">{new Date(s.end_date).toLocaleDateString()}</span></div>
                  <div className="detail-row"><span className="detail-label">Status</span><span className="detail-value"><span className={`badge badge-${s.status}`}>{s.status}</span></span></div>
                </div>
              )
            })}
          </div>
        </div>
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
