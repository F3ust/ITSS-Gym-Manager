import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiGet } from '../../api/client'
import { useAuth } from '../../contexts/auth-context'

interface CheckIn { id: string; check_in_at: string; method: string }
interface Member { id: string; user_id: string; full_name: string; phone: string; dob: string; job: string; member_type: string; status: string }
interface Subscription { id: string; member_id: string; package_id: string; start_date: string; end_date: string; remaining_sessions: number | null; remaining_pt_sessions: number | null; status: string }
interface Package { id: string; name: string; duration_days: number; price: number; category: string }

const MOTIVATIONAL_QUOTES = [
  { text: "The only bad workout is the one that didn't happen.", author: "Unknown" },
  { text: "What hurts today makes you stronger tomorrow.", author: "Unknown" },
  { text: "Success starts with self-discipline.", author: "Dwayne Johnson" },
  { text: "No pain, no gain. Shut up and train.", author: "Arnold Schwarzenegger" },
  { text: "Your body can stand almost anything. It's your mind that you have to convince.", author: "Unknown" },
  { text: "Energy flows where attention goes. Focus on your fitness goals today!", author: "Tony Robbins" },
  { text: "Make yourself stronger than your excuses.", author: "Unknown" }
]

export default function MemberDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [member, setMember] = useState<Member | null>(null)
  const [checkins, setCheckins] = useState<CheckIn[]>([])
  const [memberSchedules, setMemberSchedules] = useState<any[]>([])
  const [memberWorkouts, setMemberWorkouts] = useState<any[]>([])
  const [activeGymSub, setActiveGymSub] = useState<Subscription | null>(null)
  const [activeGymPkg, setActiveGymPkg] = useState<Package | null>(null)
  const [totalPtSessions, setTotalPtSessions] = useState<number | null>(null)
  const [activePtName, setActivePtName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    setLoading(true)
    apiGet<Member>(`/members?userId=${user.id}`)
      .then((m) => {
        if (!m) {
          setLoading(false)
          return
        }
        setMember(m)
        Promise.all([
          apiGet<CheckIn[]>(`/check-ins?memberId=${m.id}`),
          apiGet<Subscription[]>('/subscriptions?memberId=' + m.id),
          apiGet<Package[]>('/packages'),
          apiGet<any[]>('/pt/assignments'),
          apiGet<any[]>('/pt/profiles'),
          apiGet<any[]>('/pt/schedules').catch(() => []),
          apiGet<any[]>(`/pt/workouts?memberId=${m.id}`).catch(() => [])
        ]).then(([ci, subs, pkgs, assignments, ptProfiles, schedules, workouts]) => {
          setCheckins(ci.slice(0, 5))
          setMemberWorkouts(workouts.slice(0, 5))

          const nowTime = new Date()
          const mySchedules = schedules.filter(s => s.member_id === m.id && new Date(s.start_at) > nowTime)
          setMemberSchedules(mySchedules.slice(0, 5))

          const today = new Date().toISOString().split('T')[0]
          const gymEntrySubs = subs.filter((s) => {
            const pkg = pkgs.find((p) => p.id === s.package_id)
            return (pkg?.category === 'membership' || pkg?.category === 'combo') && s.status !== 'cancelled'
          })
          const activeSub = gymEntrySubs.find(s => s.status === 'active' && s.start_date <= today && s.end_date >= today)
          setActiveGymSub(activeSub || null)
          if (activeSub) {
            const pkg = pkgs.find(p => p.id === activeSub.package_id)
            setActiveGymPkg(pkg || null)
          }

          let ptSum = 0
          let hasPt = false
          subs.forEach((s) => {
            if (s.status === 'active' && s.remaining_pt_sessions !== null) {
              hasPt = true
              ptSum += s.remaining_pt_sessions
            }
          })
          setTotalPtSessions(hasPt ? ptSum : null)

          const activeAssign = assignments.find(a => a.member_id === m.id && a.status === 'active')
          if (activeAssign) {
            const pt = ptProfiles.find(p => p.id === activeAssign.pt_id)
            if (pt) {
              setActivePtName(pt.full_name)
            }
          }
        }).catch(() => {})
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user])

  if (loading) return <div className="page-loading">Loading...</div>
  if (!member) return <div className="page-container"><p>Profile not found. Register as a member first.</p></div>

  const daysRemaining = activeGymSub ? Math.max(0, Math.ceil((new Date(activeGymSub.end_date).getTime() - Date.now()) / 86400000)) : 0
  const totalDuration = activeGymPkg ? activeGymPkg.duration_days : 30
  const progressPercent = activeGymSub ? Math.min(100, Math.round(((totalDuration - daysRemaining) / totalDuration) * 100)) : 0
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(member.phone)}`

  // Get daily quote based on the day of the month
  const dailyQuote = MOTIVATIONAL_QUOTES[new Date().getDate() % MOTIVATIONAL_QUOTES.length]

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Member Dashboard</h2>
      </div>

      <div className="bento-grid bento-grid-2-1">
        
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* Virtual Membership Card */}
          <div className="virtual-card">
            <div className="virtual-card-header">
              <div>
                <div className="virtual-card-chip" />
                <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255, 255, 255, 0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 16 }}>
                  Virtual Membership Card
                </div>
              </div>
              <div>
                <div className="virtual-card-holder">{member.full_name}</div>
                <div className="virtual-card-number">{member.phone}</div>
              </div>
            </div>
            
            <div className="virtual-card-qr-container">
              <div className="virtual-card-qr">
                <img src={qrCodeUrl} alt="Membership QR Code" />
              </div>
              <span className="virtual-card-scan-label">Scan to Check-In</span>
            </div>
          </div>

          {/* Upcoming PT Sessions */}
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 16, marginBottom: 16 }}>Upcoming PT Sessions</h3>
            {memberSchedules.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {memberSchedules.map(s => (
                  <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: 'var(--bg)', borderRadius: 10, border: '1px solid var(--stroke)' }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>
                        {new Date(s.start_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </div>
                      <div style={{ marginTop: 4, fontWeight: 700, color: 'var(--accent)', fontSize: 13 }}>
                        {s.start_at?.slice(11, 16)} - {s.end_at?.slice(11, 16)}
                      </div>
                    </div>
                    {s.workout_type && (
                      <span className="badge" style={{ background: '#f0fdf4', color: '#16a34a', fontSize: 11, fontWeight: 700 }}>
                        {s.workout_type}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted" style={{ fontStyle: 'italic', fontSize: 13, textAlign: 'center', padding: '12px 0' }}>
                No upcoming personal training sessions scheduled.
              </p>
            )}
          </div>

          {/* Recent Workout Logs */}
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 16, marginBottom: 16 }}>My Training Logs</h3>
            {memberWorkouts.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {memberWorkouts.map(w => (
                  <div key={w.id} style={{ padding: '12px 14px', background: 'var(--bg)', borderRadius: 10, border: '1px solid var(--stroke)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>
                        {w.workout_date ? new Date(w.workout_date).toLocaleDateString() : '-'}
                      </span>
                      {w.intensity && <span className="badge" style={{ fontSize: 10 }}>{w.intensity}</span>}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-strong)', marginTop: 4 }}>
                      Duration: <span style={{ fontWeight: 600, color: 'var(--accent)' }}>{w.duration_min} min</span>
                    </div>
                    {w.notes && (
                      <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6, lineHeight: 1.4, fontStyle: 'italic' }}>
                        Notes: "{w.notes}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted" style={{ fontStyle: 'italic', fontSize: 13, textAlign: 'center', padding: '12px 0' }}>
                No workouts logged yet.
              </p>
            )}
          </div>

          {/* Recent Check-Ins Table */}
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 16, marginBottom: 16 }}>Recent Check-Ins</h3>
            {checkins.length > 0 ? (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date & Time</th>
                    <th>Method</th>
                  </tr>
                </thead>
                <tbody>
                  {checkins.map((c) => (
                    <tr key={c.id}>
                      <td>{new Date(c.check_in_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                      <td>
                        <span className="badge" style={{ background: 'var(--chip)', color: 'var(--text-strong)', padding: '4px 10px', fontSize: 11 }}>
                          {c.method}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-muted" style={{ padding: 24, textAlign: 'center', fontStyle: 'italic', fontSize: 13 }}>
                No recent check-ins found. Scan your card at the reception to check-in.
              </p>
            )}
          </div>

        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* Daily Motivation Quote Widget */}
          <div className="card" style={{ padding: 20, background: 'linear-gradient(to right, var(--accent-light), #fff)', borderLeft: '4px solid var(--accent)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
              Motivation of the day
            </div>
            <p style={{ fontSize: 13, fontWeight: 500, fontStyle: 'italic', color: 'var(--text-strong)', lineHeight: 1.4 }}>
              "{dailyQuote.text}"
            </p>
            {dailyQuote.author !== "Unknown" && (
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6, textAlign: 'right', fontWeight: 600 }}>
                — {dailyQuote.author}
              </div>
            )}
          </div>

          {/* Gym Entry Card */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span className="badge badge-active" style={{ fontSize: 11 }}>Gym Access</span>
              {daysRemaining <= 7 && daysRemaining > 0 && (
                <span className="badge" style={{ background: 'var(--error-light)', color: 'var(--error)', fontSize: 11, fontWeight: 700 }}>
                  Expiring Soon
                </span>
              )}
            </div>
            {activeGymSub && activeGymPkg ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <h4 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{activeGymPkg.name}</h4>
                  <p className="text-muted" style={{ fontSize: 13, marginTop: 4 }}>
                    Expires on {new Date(activeGymSub.end_date).toLocaleDateString()}
                  </p>
                </div>
                
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                    <span className="text-muted">Usage Progress</span>
                    <span style={{ color: 'var(--accent)' }}>{daysRemaining} Days Left</span>
                  </div>
                  <div style={{ height: 6, width: '100%', background: 'var(--stroke)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${progressPercent}%`, height: '100%', background: 'var(--accent)', borderRadius: 3, transition: 'width 0.4s ease' }} />
                  </div>
                </div>

                {daysRemaining <= 7 && (
                  <button className="btn-primary" style={{ width: '100%', padding: '10px 14px', fontSize: 13 }} onClick={() => navigate('/member/register-package')}>
                    Renew Membership
                  </button>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '12px 0', textAlign: 'center' }}>
                <p className="text-muted" style={{ fontSize: 13 }}>You don't have an active gym membership.</p>
                <button className="btn-primary" style={{ width: '100%', fontSize: 13 }} onClick={() => navigate('/member/register-package')}>
                  Browse Packages
                </button>
              </div>
            )}
          </div>

          {/* PT Sessions Card */}
          {totalPtSessions !== null && (
            <div className="card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span className="badge" style={{ background: '#e0f2fe', color: '#0369a1', fontSize: 11, fontWeight: 700 }}>
                  Personal Training
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <div className="text-muted" style={{ fontSize: 13 }}>Remaining Sessions</div>
                  <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--accent)', marginTop: 4 }}>
                    {totalPtSessions} <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--text-strong)' }}>sessions</span>
                  </div>
                </div>
                
                <div style={{ borderTop: '1px solid var(--stroke)', paddingTop: 12 }}>
                  <div className="text-muted" style={{ fontSize: 12 }}>Assigned Trainer</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-strong)', marginTop: 2 }}>
                    {activePtName || 'Not assigned yet'}
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  )
}
