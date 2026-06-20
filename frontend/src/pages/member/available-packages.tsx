import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiGet } from '../../api/client'
import { fmtVND } from '../../utils/format'

interface Package {
  id: string; name: string; duration_days: number;
  price: number; category: string; description: string | null; status: string;
  pt_session_count?: number | null;
}

export default function AvailablePackagesPage() {
  const navigate = useNavigate()
  const [packages, setPackages] = useState<Package[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiGet<Package[]>('/packages').then((data) => {
      setPackages(data.filter((p) => p.status !== 'inactive'))
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="page-loading">Loading...</div>

  const renderCard = (p: Package) => (
    <div key={p.id} className="stat-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%', gap: 8 }}>
      <div>
        <span className="stat-label" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {p.category === 'pt' ? 'PT Package' : p.category === 'combo' ? 'Combo Package' : 'Gym Entry'}
        </span>
        <span className="stat-value" style={{ fontSize: 18, marginTop: 4, display: 'block', fontWeight: 700 }}>{p.name}</span>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
          {p.category === 'pt' ? `${p.pt_session_count} PT sessions` : p.category === 'combo' ? `${p.duration_days} days + ${p.pt_session_count} PT` : `${p.duration_days} days`}
        </div>
        {p.description && <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 8, lineHeight: '1.4' }}>{p.description}</p>}
      </div>
      <div style={{ marginTop: 12 }}>
        <span style={{ fontWeight: 700, fontSize: 18, color: 'var(--accent)', display: 'block', marginBottom: 8 }}>
          {fmtVND(p.price)}
        </span>
        <button
          className="btn-primary"
          style={{ width: '100%' }}
          onClick={() => navigate('/member/register-package')}
        >
          Register Now
        </button>
      </div>
    </div>
  )

  return (
    <div className="page-container">
      <div className="page-header"><h2>Available Packages</h2></div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginTop: 16 }}>
        <div>
          <h3 style={{ marginBottom: 12, fontSize: 15, borderBottom: '1px solid var(--stroke)', paddingBottom: 6, color: 'var(--text-strong)' }}>1. Gym Entry (Membership)</h3>
          <div className="stats-grid">
            {packages.filter(p => p.category === 'membership').map(renderCard)}
            {packages.filter(p => p.category === 'membership').length === 0 && (
              <p className="text-muted" style={{ gridColumn: '1/-1' }}>No memberships available</p>
            )}
          </div>
        </div>

        <div>
          <h3 style={{ marginBottom: 12, fontSize: 15, borderBottom: '1px solid var(--stroke)', paddingBottom: 6, color: 'var(--text-strong)' }}>2. Personal Training (PT)</h3>
          <div className="stats-grid">
            {packages.filter(p => p.category === 'pt').map(renderCard)}
            {packages.filter(p => p.category === 'pt').length === 0 && (
              <p className="text-muted" style={{ gridColumn: '1/-1' }}>No PT packages available</p>
            )}
          </div>
        </div>

        <div>
          <h3 style={{ marginBottom: 12, fontSize: 15, borderBottom: '1px solid var(--stroke)', paddingBottom: 6, color: 'var(--text-strong)' }}>3. Combo Packages (Gym Entry + PT)</h3>
          <div className="stats-grid">
            {packages.filter(p => p.category === 'combo').map(renderCard)}
            {packages.filter(p => p.category === 'combo').length === 0 && (
              <p className="text-muted" style={{ gridColumn: '1/-1' }}>No combo packages available</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
