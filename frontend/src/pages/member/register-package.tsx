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
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) return
    apiGet<Member>(`/members?userId=${user.id}`).then((m) => {
      if (m) setMember(m)
    }).catch(() => {})
    apiGet<Package[]>('/packages').then((data) => setPackages(data.filter((p) => p.status !== 'inactive'))).catch(() => {})
    apiGet<PtProfile[]>('/pt/profiles').then(setPtList).catch(() => {})
  }, [user])

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (!member || !packageId || !startDate) {
      setError('Select a package and start date')
      return
    }
    const pkg = packages.find((p) => p.id === packageId)
    if (!pkg) return
    if (pkg.category === 'pt' && !ptId) {
      setError('Select a PT for this PT package')
      return
    }
    setError('')
    try {
      const endDate = new Date(startDate)
      endDate.setDate(endDate.getDate() + pkg.duration_days)
      const sub = await apiPost<{ id: string }>('/subscriptions', {
        memberId: member.id,
        packageId,
        startDate,
        endDate: endDate.toISOString().split('T')[0],
        remainingSessions: pkg.session_count || null,
        remainingPtSessions: pkg.pt_session_count || null,
      })
      if (pkg.category === 'pt' && ptId) {
        await apiPost('/pt/assignments', { ptId, memberId: member.id })
      }
      navigate(`/member/payment/${sub.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    }
  }

  const selectedPkg = packages.find((p) => p.id === packageId)
  const endDateStr = startDate && selectedPkg
    ? new Date(new Date(startDate).getTime() + selectedPkg.duration_days * 86400000).toLocaleDateString()
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
            {packages.map((p) => {
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
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{p.name}</div>
                    {p.category === 'pt' && <span className="badge" style={{ fontSize: 10 }}>PT</span>}
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent)', marginTop: 4 }}>
                    {formatCurrency(p.price)}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                    {p.session_count ? `${p.session_count} sessions` : `${p.duration_days} days`}
                    {p.pt_session_count ? ` + ${p.pt_session_count} PT` : ''}
                  </div>
                </div>
              )
            })}
          </div>

          {selectedPkg?.category === 'pt' && (
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

        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 600, fontSize: 15, marginBottom: 14 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: '50%', background: 'var(--accent)', color: 'var(--button-text)', fontSize: 13, fontWeight: 700 }}>2</span>
            Set Start Date
          </div>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
            style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid var(--stroke)', background: 'var(--panel)', color: 'var(--text-strong)', fontSize: 14, maxWidth: 280 }}
          />
        </div>

        {error && <p style={{ color: '#d32f2f', fontSize: 14 }}>{error}</p>}

        {selectedPkg && startDate && (
          <div className="card" style={{ padding: 20, background: 'var(--chip)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ fontWeight: 600 }}>{selectedPkg.name} — {formatCurrency(selectedPkg.price)}</div>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
                  {selectedPkg.session_count ? 'Session-based' : 'Time-based'}
                  {selectedPkg.session_count ? ` (${selectedPkg.session_count} sessions` : ''}
                  {selectedPkg.pt_session_count ? `, ${selectedPkg.pt_session_count} PT` : ''}
                  {selectedPkg.session_count ? ')' : ''} &middot; Starts {new Date(startDate).toLocaleDateString()} &middot; Ends {endDateStr}
                </div>
              </div>
              <button type="submit" className="btn-primary" style={{ padding: '12px 28px', fontSize: 15 }}>
                Proceed to Payment
              </button>
            </div>
          </div>
        )}

        {(!selectedPkg || !startDate) && (
          <button type="submit" className="btn-primary" style={{ padding: '12px 28px', fontSize: 15, alignSelf: 'flex-start' }}>
            Register
          </button>
        )}
      </form>
    </div>
  )
}
