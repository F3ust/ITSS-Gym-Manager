import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiGet } from '../../api/client'

interface Package {
  id: string; name: string; duration_days: number;
  price: number; category: string; description: string | null; status: string
}

function formatCurrency(v: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v)
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

  return (
    <div className="page-container">
      <div className="page-header"><h2>Available Packages</h2></div>
      <div className="stats-grid">
        {packages.map((p) => (
          <div key={p.id} className="stat-card" style={{ gap: 8 }}>
            <span className="stat-label" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>{p.category}</span>
            <span className="stat-value" style={{ fontSize: 22 }}>{p.name}</span>
            <span>{p.duration_days} days</span>
            <span style={{ fontWeight: 700, fontSize: 18 }}>
              {formatCurrency(p.price)}
            </span>
            {p.description && <span style={{ fontSize: 13, color: 'var(--muted)' }}>{p.description}</span>}
            <button
              className="btn-primary"
              style={{ marginTop: 4, width: '100%' }}
              onClick={() => navigate('/member/register-package')}
            >
              Register
            </button>
          </div>
        ))}
        {packages.length === 0 && <p className="text-muted">No packages available</p>}
      </div>
    </div>
  )
}
