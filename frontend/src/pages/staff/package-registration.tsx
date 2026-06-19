import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiGet, apiPost } from '../../api/client'

interface Member { id: string; full_name: string; phone: string }
interface Package { id: string; name: string; duration_days: number; price: number; category: string; session_count?: number | null; pt_session_count?: number | null; status: string }
interface PtProfile { id: string; full_name: string; bio?: string | null }

export default function PackageRegistrationPage() {
  const navigate = useNavigate()
  const [members, setMembers] = useState<Member[]>([])
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [packages, setPackages] = useState<Package[]>([])
  const [memberQuery, setMemberQuery] = useState('')
  const [memberId, setMemberId] = useState('')
  const [packageId, setPackageId] = useState('')
  const [ptId, setPtId] = useState('')
  const [ptList, setPtList] = useState<PtProfile[]>([])
  const [startDate, setStartDate] = useState('')
  const [existingSubs, setExistingSubs] = useState<any[]>([])
  const [dateOverlapError, setDateOverlapError] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    apiGet<Package[]>('/packages').then((data) => setPackages(data.filter((p) => p.status !== 'inactive'))).catch(() => {})
    apiGet<PtProfile[]>('/pt/profiles').then(setPtList).catch(() => {})
  }, [])

  // Auto-suggest start date when member or package is selected
  useEffect(() => {
    if (!memberId || !packageId || !packages.length) return
    const pkg = packages.find(p => p.id === packageId)
    if (!pkg) return

    if (pkg.category === 'pt') {
      setStartDate(new Date().toISOString().split('T')[0])
      return
    }

    const activeOrPendingGymSubs = existingSubs.filter(s => {
      if (s.status !== 'active' && s.status !== 'pending') return false
      const sPkg = packages.find(p => p.id === s.package_id)
      return sPkg?.category === 'membership' || sPkg?.category === 'combo'
    })

    if (activeOrPendingGymSubs.length > 0) {
      let maxEnd = new Date(activeOrPendingGymSubs[0].end_date)
      for (const s of activeOrPendingGymSubs) {
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
  }, [memberId, packageId, existingSubs, packages])

  // Overlap validation on client side
  useEffect(() => {
    if (!startDate || !memberId || !packageId || !packages.length) {
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
      setDateOverlapError('Warning: Selected dates overlap with an existing membership for this member!')
    } else {
      setDateOverlapError('')
    }
  }, [startDate, memberId, packageId, existingSubs, packages])

  async function searchMembers() {
    if (!memberQuery.trim()) return
    try {
      const data = await apiGet<Member[]>(`/members?query=${encodeURIComponent(memberQuery)}`)
      setMembers(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
    }
  }

  function selectMember(m: Member) {
    setMemberId(m.id)
    setSelectedMember(m)
    setMembers([])
    apiGet<any[]>(`/subscriptions?memberId=${m.id}`).then((subs) => {
      setExistingSubs(subs)
    }).catch(() => {})
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (!memberId || !packageId || !startDate) {
      setError('Select member, package, and start date')
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
      endDate.setDate(endDate.getDate() + (pkg.category === 'pt' ? 30000 : pkg.duration_days)) // large end date for PT packages
      const sub = await apiPost<{ id: string }>('/subscriptions', {
        memberId,
        packageId,
        startDate,
        endDate: pkg.category === 'pt' ? '2099-12-31' : endDate.toISOString().split('T')[0],
        remainingSessions: null,
        remainingPtSessions: pkg.pt_session_count || null,
      })
      if ((pkg.category === 'pt' || pkg.category === 'combo') && ptId) {
        await apiPost('/pt/assignments', { ptId, memberId })
      }
      navigate(`/staff/payment/${sub.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    }
  }

  const selectedPkg = packages.find((p) => p.id === packageId)

  return (
    <div className="page-container">
      <div className="page-header"><h2>Package Registration</h2></div>
      <div className="card">
        <div className="search-bar">
          <input placeholder="Search member..." value={memberQuery} onChange={(e) => setMemberQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && searchMembers()} />
          <button className="btn-primary" onClick={searchMembers}>Search</button>
        </div>
        {members.length > 0 && (
          <table className="data-table" style={{ marginTop: 12 }}>
            <thead><tr><th>Name</th><th>Phone</th><th></th></tr></thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id}>
                  <td>{m.full_name}</td>
                  <td>{m.phone}</td>
                  <td><button className={`btn-sm ${memberId === m.id ? 'btn-primary' : ''}`} onClick={() => selectMember(m)}>Select</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
          {memberId && selectedMember && (
            <div>
              <p style={{ fontSize: 13, color: 'var(--muted)' }}>
                Member: <strong>{selectedMember.full_name}</strong> ({selectedMember.phone})
              </p>
              {existingSubs.filter(s => {
                const sPkg = packages.find(p => p.id === s.package_id)
                return (sPkg?.category === 'membership' || sPkg?.category === 'combo') && (s.status === 'active' || s.status === 'pending')
              }).length > 0 && (
                <div style={{ marginTop: 6, padding: '8px 12px', background: '#f5f5f5', borderRadius: 6, fontSize: 12 }}>
                  <strong>Active Gym Membership:</strong>
                  {existingSubs.filter(s => {
                    const sPkg = packages.find(p => p.id === s.package_id)
                    return (sPkg?.category === 'membership' || sPkg?.category === 'combo') && (s.status === 'active' || s.status === 'pending')
                  }).map(s => (
                    <div key={s.id}>• {packages.find(p => p.id === s.package_id)?.name}: {new Date(s.start_date).toLocaleDateString()} - {new Date(s.end_date).toLocaleDateString()} ({s.status})</div>
                  ))}
                </div>
              )}
            </div>
          )}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 8 }}>Choose Package *</label>
            
            <div style={{ fontWeight: 600, fontSize: 14, marginTop: 12, marginBottom: 8, color: 'var(--text-strong)' }}>1. Gym Entry (Membership)</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10, marginBottom: 16 }}>
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
                      background: active ? 'var(--chip)' : 'var(--panel)',
                      cursor: 'pointer',
                      transition: 'border-color 0.15s, background 0.15s',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      minHeight: 100
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-strong)' }}>{p.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Duration: {p.duration_days} days</div>
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent)', marginTop: 8 }}>
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(p.price)}
                    </div>
                  </div>
                )
              })}
            </div>

            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8, color: 'var(--text-strong)' }}>2. Personal Training (PT)</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10, marginBottom: 16 }}>
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
                      background: active ? 'var(--chip)' : 'var(--panel)',
                      cursor: 'pointer',
                      transition: 'border-color 0.15s, background 0.15s',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      minHeight: 100
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-strong)' }}>{p.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Sessions: {p.pt_session_count} PT sessions</div>
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent)', marginTop: 8 }}>
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(p.price)}
                    </div>
                  </div>
                )
              })}
            </div>

            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8, color: 'var(--text-strong)' }}>3. Combo Packages</div>
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
                      background: active ? 'var(--chip)' : 'var(--panel)',
                      cursor: 'pointer',
                      transition: 'border-color 0.15s, background 0.15s',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      minHeight: 100
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-strong)' }}>{p.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Details: {p.duration_days} days + {p.pt_session_count} PT sessions</div>
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent)', marginTop: 8 }}>
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(p.price)}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          
          {(selectedPkg?.category === 'pt' || selectedPkg?.category === 'combo') && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-strong)' }}>Select Personal Trainer (PT) *</label>
              <select value={ptId} onChange={(e) => setPtId(e.target.value)} required style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid var(--stroke)', background: 'var(--panel)', color: 'var(--text-strong)' }}>
                <option value="">-- Select PT --</option>
                {ptList.map((pt) => (
                  <option key={pt.id} value={pt.id}>{pt.full_name}</option>
                ))}
              </select>
            </div>
          )}
          
          {selectedPkg?.category !== 'pt' && (
            <>
              <label style={{ fontSize: 13, fontWeight: 600 }}>Start Date *</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
            </>
          )}
          {dateOverlapError && <p style={{ color: '#d32f2f', fontSize: 12, margin: '4px 0 0 0', fontWeight: 600 }}>{dateOverlapError}</p>}
 
          {selectedPkg && (
            <p style={{ fontSize: 13, color: 'var(--muted)' }}>
              Category: {selectedPkg.category === 'pt' ? 'PT' : selectedPkg.category === 'combo' ? 'Combo' : 'Gym Entry'} | 
              End Date: {selectedPkg.category === 'pt' ? 'Unlimited' : (startDate ? new Date(new Date(startDate).getTime() + selectedPkg.duration_days * 86400000).toLocaleDateString() : '-')}
            </p>
          )}
          {error && <p className="form-error">{error}</p>}
          <button type="submit" className="btn-primary" disabled={!!dateOverlapError}>Register</button>
        </form>
      </div>
    </div>
  )
}
