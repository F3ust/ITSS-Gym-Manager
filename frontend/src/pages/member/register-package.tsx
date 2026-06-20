import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/auth-context'
import { apiGet, apiPost } from '../../api/client'

interface Member { id: string; user_id: string }
interface Package { id: string; name: string; duration_days: number; price: number; category: string; session_count?: number | null; pt_session_count?: number | null; status: string }
interface PtProfile { id: string; full_name: string; bio?: string | null }

function formatCurrency(v: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v)
}

export default function RegisterPackagePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [member, setMember] = useState<Member | null>(null)
  const [packages, setPackages] = useState<Package[]>([])
  const [packageId, setPackageId] = useState('')
  const [ptId, setPtId] = useState('')
  const [ptList, setPtList] = useState<PtProfile[]>([])
  const [startDate, setStartDate] = useState('')
  const [existingSubs, setExistingSubs] = useState<any[]>([])
  const [dateOverlapError, setDateOverlapError] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) return
    apiGet<Member>(`/members?userId=${user.id}`).then((m) => {
      if (m) {
        setMember(m)
        apiGet<any[]>('/subscriptions?memberId=' + m.id).then((subs) => {
          setExistingSubs(subs)
        }).catch(() => {})
      }
    }).catch(() => {})
    apiGet<Package[]>('/packages').then((data) => setPackages(data.filter((p) => p.status !== 'inactive'))).catch(() => {})
    apiGet<PtProfile[]>('/pt/profiles').then(setPtList).catch(() => {})
  }, [user])

  // Auto-suggest start date when member or package is selected
  useEffect(() => {
    if (!member || !packageId || !packages.length) return
    const pkg = packages.find(p => p.id === packageId)
    if (!pkg) return

    if (pkg.category === 'pt') {
      setStartDate(new Date().toISOString().split('T')[0])
      return
    }

    const gymSubs = existingSubs.filter(s => {
      if (s.status === 'cancelled') return false
      const sPkg = packages.find(p => p.id === s.package_id)
      return sPkg?.category === 'membership' || sPkg?.category === 'combo'
    })

    if (gymSubs.length > 0) {
      let maxEnd = new Date(gymSubs[0].end_date)
      for (const s of gymSubs) {
        const d = new Date(s.end_date)
        if (d > maxEnd) {
          maxEnd = d
        }
      }
      const nextDay = new Date(maxEnd.getTime() + 86400000)
      setStartDate(nextDay.toISOString().split('T')[0])
    } else {
      setStartDate(new Date().toISOString().split('T')[0])
    }
  }, [member, packageId, existingSubs, packages])

  // Overlap validation on client side
  useEffect(() => {
    if (!startDate || !member || !packageId || !packages.length) {
      setDateOverlapError('')
      return
    }
    const pkg = packages.find(p => p.id === packageId)
    if (!pkg || pkg.category === 'pt') {
      setDateOverlapError('')
      return
    }

    const startD = new Date(startDate)
    const endD = new Date(startD.getTime() + (pkg.duration_days ?? 30) * 86400000)
    const newStartStr = startDate
    const newEndStr = endD.toISOString().split('T')[0]

    const hasOverlap = existingSubs.some(s => {
      if (s.status !== 'active' && s.status !== 'pending') return false
      const sPkg = packages.find(p => p.id === s.package_id)
      if (sPkg?.category !== 'membership' && sPkg?.category !== 'combo') return false

      return s.start_date <= newEndStr && newStartStr <= s.end_date
    })

    if (hasOverlap) {
      setDateOverlapError('Warning: Selected dates overlap with your existing membership!')
    } else {
      setDateOverlapError('')
    }
  }, [startDate, member, packageId, existingSubs, packages])

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (!member || !packageId || !startDate) {
      setError('Select a package and start date')
      return
    }
    if (dateOverlapError) {
      setError('Cannot register: selected dates overlap with an existing membership.')
      return
    }
    const pkg = packages.find((p) => p.id === packageId)
    if (!pkg) return
    if ((pkg.category === 'pt' || pkg.category === 'combo') && !ptId) {
      setError('Select a PT for this package')
      return
    }
    setError('')
    try {
      const endDate = new Date(startDate)
      endDate.setDate(endDate.getDate() + (pkg.category === 'pt' ? 30000 : pkg.duration_days))
      const sub = await apiPost<{ id: string }>('/subscriptions', {
        memberId: member.id,
        packageId,
        startDate,
        endDate: pkg.category === 'pt' ? '2099-12-31' : endDate.toISOString().split('T')[0],
        remainingSessions: null,
        remainingPtSessions: pkg.pt_session_count || null,
      })
      if ((pkg.category === 'pt' || pkg.category === 'combo') && ptId) {
        await apiPost('/pt/assignments', { ptId, memberId: member.id })
      }
      navigate(`/member/payment/${sub.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    }
  }

  const selectedPkg = packages.find((p) => p.id === packageId)
  const endDateStr = startDate && selectedPkg
    ? (selectedPkg.category === 'pt' ? 'Unlimited' : new Date(new Date(startDate).getTime() + selectedPkg.duration_days * 86400000).toLocaleDateString())
    : null

  return (
    <div className="page-container">
      <div className="page-header"><h2>Register Package</h2></div>

      <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 600, fontSize: 15, marginBottom: 14 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: '50%', background: 'var(--accent)', color: 'var(--button-text)', fontSize: 13, fontWeight: 700 }}>1</span>
            Choose Package
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-strong)' }}>1. Gym Entry (Membership)</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
              {packages.filter(p => p.category === 'membership').map((p) => {
                const active = packageId === p.id
                return (
                  <div
                    key={p.id}
                    onClick={() => { setPackageId(p.id); setPtId('') }}
                    style={{
                      border: `2px solid ${active ? 'var(--accent)' : 'var(--stroke)'}`,
                      borderRadius: 12,
                      padding: 14,
                      background: active ? 'var(--chip)' : 'var(--bg)',
                      cursor: 'pointer',
                      transition: 'border-color 0.15s, background 0.15s',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      minHeight: 100
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-strong)' }}>{p.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Duration: {p.duration_days} days</div>
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent)', marginTop: 8 }}>
                      {formatCurrency(p.price)}
                    </div>
                  </div>
                )
              })}
            </div>

            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-strong)', marginTop: 8 }}>2. Personal Training (PT)</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
              {packages.filter(p => p.category === 'pt').map((p) => {
                const active = packageId === p.id
                return (
                  <div
                    key={p.id}
                    onClick={() => { setPackageId(p.id); setPtId('') }}
                    style={{
                      border: `2px solid ${active ? 'var(--accent)' : 'var(--stroke)'}`,
                      borderRadius: 12,
                      padding: 14,
                      background: active ? 'var(--chip)' : 'var(--bg)',
                      cursor: 'pointer',
                      transition: 'border-color 0.15s, background 0.15s',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      minHeight: 100
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-strong)' }}>{p.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Sessions: {p.pt_session_count} PT sessions</div>
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent)', marginTop: 8 }}>
                      {formatCurrency(p.price)}
                    </div>
                  </div>
                )
              })}
            </div>

            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-strong)', marginTop: 8 }}>3. Combo Packages</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
              {packages.filter(p => p.category === 'combo').map((p) => {
                const active = packageId === p.id
                return (
                  <div
                    key={p.id}
                    onClick={() => { setPackageId(p.id); setPtId('') }}
                    style={{
                      border: `2px solid ${active ? 'var(--accent)' : 'var(--stroke)'}`,
                      borderRadius: 12,
                      padding: 14,
                      background: active ? 'var(--chip)' : 'var(--bg)',
                      cursor: 'pointer',
                      transition: 'border-color 0.15s, background 0.15s',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      minHeight: 100
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-strong)' }}>{p.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Details: {p.duration_days} days + {p.pt_session_count} PT sessions</div>
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent)', marginTop: 8 }}>
                      {formatCurrency(p.price)}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {(selectedPkg?.category === 'pt' || selectedPkg?.category === 'combo') && (
            <div style={{ marginTop: 14 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>
                Personal Trainer *
              </label>
              <select
                value={ptId}
                onChange={(e) => setPtId(e.target.value)}
                required
                style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--stroke)', background: 'var(--panel)', color: 'var(--text-strong)', fontSize: 14, maxWidth: 320, width: '100%' }}
              >
                <option value="">-- Select PT --</option>
                {ptList.map((pt) => (
                  <option key={pt.id} value={pt.id}>{pt.full_name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {selectedPkg?.category !== 'pt' && (
          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 600, fontSize: 15, marginBottom: 14 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: '50%', background: 'var(--accent)', color: 'var(--button-text)', fontSize: 13, fontWeight: 700 }}>2</span>
              Set Start Date
            </div>
            {existingSubs.filter(s => {
              const sPkg = packages.find(p => p.id === s.package_id)
              return (sPkg?.category === 'membership' || sPkg?.category === 'combo') && (s.status === 'active' || s.status === 'pending')
            }).length > 0 && (
              <div style={{ marginBottom: 12, padding: '10px 14px', background: '#f5f5f5', borderRadius: 10, fontSize: 13, maxWidth: 500 }}>
                <strong>Your active memberships:</strong>
                {existingSubs.filter(s => {
                  const sPkg = packages.find(p => p.id === s.package_id)
                  return (sPkg?.category === 'membership' || sPkg?.category === 'combo') && (s.status === 'active' || s.status === 'pending')
                }).map(s => (
                  <div key={s.id}>• {packages.find(p => p.id === s.package_id)?.name}: {new Date(s.start_date).toLocaleDateString()} - {new Date(s.end_date).toLocaleDateString()} ({s.status})</div>
                ))}
              </div>
            )}
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
              style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid var(--stroke)', background: 'var(--panel)', color: 'var(--text-strong)', fontSize: 14, maxWidth: 280 }}
            />
            {dateOverlapError && <p style={{ color: '#d32f2f', fontSize: 13, marginTop: 6, fontWeight: 600 }}>{dateOverlapError}</p>}
          </div>
        )}

        {error && <p style={{ color: '#d32f2f', fontSize: 14 }}>{error}</p>}

        {selectedPkg && startDate && (
          <div className="card" style={{ padding: 20, background: 'var(--chip)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ fontWeight: 600 }}>{selectedPkg.name} — {formatCurrency(selectedPkg.price)}</div>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
                  Category: {selectedPkg.category === 'pt' ? 'PT' : selectedPkg.category === 'combo' ? 'Combo' : 'Gym Entry'} &middot; Start: {new Date(startDate).toLocaleDateString()} &middot; End: {endDateStr}
                </div>
              </div>
              <button type="submit" className="btn-primary" style={{ padding: '12px 28px', fontSize: 15 }} disabled={!!dateOverlapError}>
                Proceed to Payment
              </button>
            </div>
          </div>
        )}

        {(!selectedPkg || !startDate) && (
          <button type="submit" className="btn-primary" style={{ padding: '12px 28px', fontSize: 15, alignSelf: 'flex-start' }} disabled={!!dateOverlapError}>
            Register
          </button>
        )}
      </form>
    </div>
  )
}
