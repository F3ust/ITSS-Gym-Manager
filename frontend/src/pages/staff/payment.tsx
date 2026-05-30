import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { apiGet, apiPost } from '../../api/client'

interface Subscription {
  id: string
  member_id: string
  package_id: string
  start_date: string
  end_date: string
  remaining_sessions: number | null
  status: string
}

interface Package {
  id: string
  name: string
  price: number
  duration_days: number
  session_count: number | null
  category: string
}

interface Member {
  id: string
  full_name: string
  phone: string
}

export default function PaymentPage() {
  const { subscriptionId } = useParams()
  const navigate = useNavigate()
  const [sub, setSub] = useState<Subscription | null>(null)
  const [pkg, setPkg] = useState<Package | null>(null)
  const [member, setMember] = useState<Member | null>(null)
  const [method, setMethod] = useState('cash')
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!subscriptionId) return
    apiGet<Subscription>(`/subscriptions/${subscriptionId}`)
      .then(async (s) => {
        setSub(s)
        const [p, m] = await Promise.all([
          apiGet<Package>(`/packages/${s.package_id}`),
          apiGet<Member>(`/members/${s.member_id}`),
        ])
        setPkg(p)
        setMember(m)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false))
  }, [subscriptionId])

  async function handlePay(e: React.FormEvent) {
    e.preventDefault()
    if (!sub || !pkg) return
    setProcessing(true)
    setError('')
    try {
      await apiPost('/payments', { subscriptionId: sub.id, amount: pkg.price, method, endDate: sub.end_date, remainingSessions: null })
      setMessage(`Payment of ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(pkg.price)} via ${method} completed`)
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed')
    } finally {
      setProcessing(false)
    }
  }

  if (loading) return <div className="page-loading">Loading...</div>
  if (error && !sub) return <div className="page-container"><div className="card"><p className="form-error">{error}</p><button className="btn-primary" onClick={() => navigate('/staff/package-registration')}>Back</button></div></div>

  return (
    <div className="page-container">
      <div className="page-header"><h2>Process Payment</h2></div>
      <div className="card">
        {done ? (
          <>
            <p style={{ color: '#2e7d32', fontSize: 15, fontWeight: 600, marginBottom: 12 }}>{message}</p>
            <button className="btn-primary" onClick={() => navigate('/staff/package-registration')}>New Registration</button>
          </>
        ) : (
          <form onSubmit={handlePay} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {member && (
              <div style={{ fontSize: 14, background: '#f5f5f5', padding: 12, borderRadius: 6 }}>
                <p><strong>Member:</strong> {member.full_name} ({member.phone})</p>
                {pkg && <p><strong>Package:</strong> {pkg.name}</p>}
                {sub && <p><strong>Period:</strong> {sub.start_date} → {sub.end_date}</p>}
                {pkg && (
                  <p style={{ fontSize: 18, fontWeight: 700, marginTop: 8 }}>
                    Amount: {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(pkg.price)}
                  </p>
                )}
              </div>
            )}
            <select value={method} onChange={(e) => setMethod(e.target.value)} required>
              <option value="cash">Cash</option>
              <option value="transfer">Bank Transfer</option>
              <option value="card">Credit Card</option>
            </select>
            {method === 'transfer' && (
              <div style={{ textAlign: 'center', padding: 12, background: '#f9f9f9', borderRadius: 6 }}>
                <img src="/payment-qr.png" alt="Bank Transfer QR" style={{ width: 200, height: 200, objectFit: 'contain' }} />
                <p style={{ marginTop: 8, fontSize: 13, color: '#555' }}>Beneficiary: <strong>Rick Astley</strong></p>
              </div>
            )}
            {error && <p className="form-error">{error}</p>}
            <button type="submit" className="btn-primary" disabled={processing}>
              {processing ? 'Processing...' : `Pay ${pkg ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(pkg.price) : ''}`}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
