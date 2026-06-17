import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { apiGet, apiPost } from '../../api/client'

interface Subscription {
  id: string; member_id: string; package_id: string
  start_date: string; end_date: string
  remaining_sessions: number | null; status: string
}
interface Package { id: string; name: string; price: number; duration_days: number; session_count: number | null; category: string }
interface Member { id: string; full_name: string; phone: string }

function formatCurrency(v: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v)
}

export default function MemberPaymentPage() {
  const { subscriptionId } = useParams()
  const navigate = useNavigate()
  const [sub, setSub] = useState<Subscription | null>(null)
  const [pkg, setPkg] = useState<Package | null>(null)
  const [member, setMember] = useState<Member | null>(null)
  const [method, setMethod] = useState<'transfer' | 'card'>('transfer')
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
      setMessage(`Payment of ${formatCurrency(pkg.price)} via ${method === 'transfer' ? 'Bank Transfer' : 'Credit Card'} successful`)
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed')
    } finally {
      setProcessing(false)
    }
  }

  if (loading) return <div className="page-loading">Loading...</div>
  if (error && !sub) return (
    <div className="page-container">
      <div className="card"><p className="form-error">{error}</p></div>
    </div>
  )

  return (
    <div className="page-container">
      <div className="page-header"><h2>Payment</h2></div>

      <div className="card" style={{ padding: 24 }}>
        {done ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <p style={{ color: '#15803d', fontSize: 16, fontWeight: 600, marginBottom: 16 }}>{message}</p>
            <button className="btn-primary" onClick={() => navigate('/member/my-package')}>
              View My Package
            </button>
          </div>
        ) : (
          <form onSubmit={handlePay} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Order Summary */}
            <div style={{ background: 'var(--bg)', border: '1px solid var(--stroke)', borderRadius: 12, padding: 16 }}>
              <h3 style={{ fontSize: 15, margin: '0 0 12px', fontWeight: 600 }}>Order Summary</h3>
              {member && (
                <div style={{ fontSize: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--muted)' }}>Member</span>
                    <span style={{ fontWeight: 500 }}>{member.full_name}</span>
                  </div>
                  {pkg && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--muted)' }}>Package</span>
                      <span style={{ fontWeight: 500 }}>{pkg.name}</span>
                    </div>
                  )}
                  {sub && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--muted)' }}>Period</span>
                      <span style={{ fontWeight: 500 }}>{new Date(sub.start_date).toLocaleDateString('en-GB')} &rarr; {new Date(sub.end_date).toLocaleDateString('en-GB')}</span>
                    </div>
                  )}
                  <div style={{ borderTop: '1px solid var(--stroke)', marginTop: 6, paddingTop: 10, display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 600 }}>Total</span>
                    {pkg && <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent)' }}>{formatCurrency(pkg.price)}</span>}
                  </div>
                </div>
              )}
            </div>

            {/* Payment Method */}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--muted)', marginBottom: 8 }}>
                Payment Method *
              </label>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setMethod('transfer')}
                  style={{
                    flex: 1, padding: '14px 16px', borderRadius: 12, cursor: 'pointer',
                    border: `2px solid ${method === 'transfer' ? 'var(--accent)' : 'var(--stroke)'}`,
                    background: method === 'transfer' ? 'var(--accent-light)' : 'var(--bg)',
                    color: 'var(--text-strong)', fontSize: 14, fontWeight: method === 'transfer' ? 600 : 400,
                    transition: 'all 0.15s',
                  }}
                >
                  🏦 Bank Transfer
                </button>
                <button
                  type="button"
                  onClick={() => setMethod('card')}
                  style={{
                    flex: 1, padding: '14px 16px', borderRadius: 12, cursor: 'pointer',
                    border: `2px solid ${method === 'card' ? 'var(--accent)' : 'var(--stroke)'}`,
                    background: method === 'card' ? 'var(--accent-light)' : 'var(--bg)',
                    color: 'var(--text-strong)', fontSize: 14, fontWeight: method === 'card' ? 600 : 400,
                    transition: 'all 0.15s',
                  }}
                >
                  💳 Credit Card
                </button>
              </div>
            </div>

            {/* Bank Transfer Info */}
            {method === 'transfer' && (
              <div style={{ textAlign: 'center', padding: 20, background: 'var(--bg)', borderRadius: 12, border: '1px solid var(--stroke)' }}>
                <img src="/payment-qr.png" alt="Bank Transfer QR" style={{ width: 200, height: 200, objectFit: 'contain' }} />
                <p style={{ marginTop: 10, fontSize: 13, color: 'var(--muted)' }}>
                  Transfer the exact amount to:<br />
                  <strong style={{ color: 'var(--text-strong)' }}>Beneficiary: Rick Astley</strong><br />
                  <strong style={{ color: 'var(--text-strong)' }}>Bank: Vietcombank</strong><br />
                  <strong style={{ color: 'var(--text-strong)' }}>Account: 123456789</strong>
                </p>
              </div>
            )}

            {/* Card Info */}
            {method === 'card' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16, background: 'var(--bg)', borderRadius: 12, border: '1px solid var(--stroke)' }}>
                <input placeholder="Card Number" style={inputStyle} />
                <div style={{ display: 'flex', gap: 10 }}>
                  <input placeholder="MM/YY" style={{ ...inputStyle, flex: 1 }} />
                  <input placeholder="CVC" style={{ ...inputStyle, flex: 1 }} />
                </div>
                <input placeholder="Cardholder Name" style={inputStyle} />
              </div>
            )}

            {error && <p style={{ color: '#ef4444', fontSize: 14 }}>{error}</p>}

            <button
              type="submit"
              className="btn-primary"
              disabled={processing}
              style={{ padding: '14px 28px', fontSize: 15, opacity: processing ? 0.7 : 1 }}
            >
              {processing ? 'Processing...' : `Pay ${pkg ? formatCurrency(pkg.price) : ''}`}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  padding: '12px 14px',
  borderRadius: 10,
  border: '1px solid var(--stroke)',
  background: 'var(--panel)',
  color: 'var(--text-strong)',
  fontSize: 14,
  width: '100%',
}
