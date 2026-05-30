import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiGet, apiPost } from '../../api/client'

interface Member { id: string; full_name: string; phone: string }
interface Package { id: string; name: string; duration_days: number; price: number; category: string; session_count?: number | null; pt_session_count?: number | null; status: string }
interface PtProfile { id: string; full_name: string; bio?: string | null }

function formatCurrency(v: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v)
}

export default function PackageRegistrationPage() {
  const navigate = useNavigate()
  const [members, setMembers] = useState<Member[]>([])
  const [packages, setPackages] = useState<Package[]>([])
  const [memberQuery, setMemberQuery] = useState('')
  const [memberId, setMemberId] = useState('')
  const [packageId, setPackageId] = useState('')
  const [ptId, setPtId] = useState('')
  const [ptList, setPtList] = useState<PtProfile[]>([])
  const [startDate, setStartDate] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    apiGet<Package[]>('/packages').then((data) => setPackages(data.filter((p) => p.status !== 'inactive'))).catch(() => {})
    apiGet<PtProfile[]>('/pt/profiles').then(setPtList).catch(() => {})
  }, [])

  async function searchMembers() {
    if (!memberQuery.trim()) return
    try {
      const data = await apiGet<Member[]>(`/members?query=${encodeURIComponent(memberQuery)}`)
      setMembers(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (!memberId || !packageId || !startDate) {
      setError('Select member, package, and start date')
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
        memberId,
        packageId,
        startDate,
        endDate: endDate.toISOString().split('T')[0],
        remainingSessions: pkg.session_count || null,
        remainingPtSessions: pkg.pt_session_count || null,
      })
      if (pkg.category === 'pt' && ptId) {
        await apiPost('/pt/assignments', { ptId, memberId })
      }
      navigate(`/staff/payment/${sub.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    }
  }

  const selectedPkg = packages.find((p) => p.id === packageId)
  const selectedMember = members.find((m) => m.id === memberId)
  const endDateStr = startDate && selectedPkg
    ? new Date(new Date(startDate).getTime() + selectedPkg.duration_days * 86400000).toLocaleDateString()
    : null

  return (
    <div className="page-container">
      <div className="page-header"><h2>Package Registration</h2></div>

      <form onSubmit={handleRegister} style={styles.form}>
        {/* Step 1: Member */}
        <div className="card" style={styles.section}>
          <div style={styles.sectionHead}><span style={styles.step}>1</span> Select Member</div>
          <div className="search-bar">
            <input
              placeholder="Search by name or phone..."
              value={memberQuery}
              onChange={(e) => setMemberQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchMembers()}
            />
            <button type="button" className="btn-primary" onClick={searchMembers}>Search</button>
          </div>
          {members.length > 0 && (
            <div style={{ marginTop: 12, border: '1px solid var(--stroke)', borderRadius: 10, overflow: 'hidden' }}>
              {members.map((m) => (
                <div
                  key={m.id}
                  style={{
                    ...styles.memberRow,
                    background: memberId === m.id ? 'var(--chip)' : 'transparent',
                    borderBottom: '1px solid var(--stroke)',
                  }}
                  onClick={() => { setMemberId(m.id); setMembers([]) }}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>{m.full_name}</div>
                    <div style={{ fontSize: 13, color: 'var(--muted)' }}>{m.phone}</div>
                  </div>
                  {memberId === m.id && <span style={{ color: 'var(--accent)', fontWeight: 700 }}>Selected</span>}
                </div>
              ))}
            </div>
          )}
          {memberId && !members.length && (
            <p style={{ marginTop: 8, fontSize: 13, color: 'var(--accent)' }}>
              Member: {selectedMember?.full_name} ({selectedMember?.phone})
            </p>
          )}
        </div>

        {/* Step 2: Package */}
        <div className="card" style={styles.section}>
          <div style={styles.sectionHead}><span style={styles.step}>2</span> Choose Package</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
            {packages.map((p) => {
              const active = packageId === p.id
              return (
                <div
                  key={p.id}
                  onClick={() => { setPackageId(p.id); setPtId('') }}
                  style={{
                    ...styles.pkgCard,
                    borderColor: active ? 'var(--accent)' : 'var(--stroke)',
                    background: active ? 'var(--chip)' : 'var(--bg)',
                    cursor: 'pointer',
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
              <select value={ptId} onChange={(e) => setPtId(e.target.value)} required style={styles.select}>
                <option value="">-- Select PT --</option>
                {ptList.map((pt) => (
                  <option key={pt.id} value={pt.id}>{pt.full_name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Step 3: Schedule */}
        <div className="card" style={styles.section}>
          <div style={styles.sectionHead}><span style={styles.step}>3</span> Set Start Date</div>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required style={styles.dateInput} />
        </div>

        {/* Error */}
        {error && <p className="form-error" style={{ color: '#d32f2f', fontSize: 14 }}>{error}</p>}

        {/* Summary + Submit */}
        {selectedPkg && memberId && startDate && (
          <div className="card" style={{ ...styles.section, background: 'var(--chip)' }}>
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
                Register &amp; Proceed to Payment
              </button>
            </div>
          </div>
        )}

        {(!selectedPkg || !memberId || !startDate) && (
          <button type="submit" className="btn-primary" style={{ padding: '12px 28px', fontSize: 15, alignSelf: 'flex-start' }}>
            Register
          </button>
        )}
      </form>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  section: {
    padding: 20,
  },
  sectionHead: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    fontWeight: 600,
    fontSize: 15,
    marginBottom: 14,
  },
  step: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 26,
    height: 26,
    borderRadius: '50%',
    background: 'var(--accent)',
    color: 'var(--button-text)',
    fontSize: 13,
    fontWeight: 700,
  },
  memberRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 14px',
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  pkgCard: {
    border: '2px solid',
    borderRadius: 12,
    padding: 14,
    transition: 'border-color 0.15s, background 0.15s',
  },
  select: {
    padding: '10px 12px',
    borderRadius: 10,
    border: '1px solid var(--stroke)',
    background: 'var(--panel)',
    color: 'var(--text-strong)',
    fontSize: 14,
    width: '100%',
    maxWidth: 320,
  },
  dateInput: {
    padding: '10px 14px',
    borderRadius: 10,
    border: '1px solid var(--stroke)',
    background: 'var(--panel)',
    color: 'var(--text-strong)',
    fontSize: 14,
    maxWidth: 280,
  },
}
