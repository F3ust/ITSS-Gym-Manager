import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/auth-context'
import { apiGet, apiPost } from '../../api/client'

interface Member { id: string; user_id: string }
interface FeedbackResponse { id: string; response: string; created_at: string }
interface Feedback { id: string; category: string; rating: number | null; content: string; status: string; created_at: string; responses?: FeedbackResponse[] }

const CATEGORIES = ['Staff', 'Equipment', 'Package']
const STATUS_LABELS: Record<string, string> = {
  new: 'New',
  processing: 'Processing',
  completed: 'Resolved',
}

function StarSelector({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          type="button"
          key={n}
          onClick={() => onChange(n === value ? 0 : n)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 22,
            padding: '2px 2px',
            color: n <= value ? '#F97316' : 'var(--stroke)',
            transition: 'color 0.15s, transform 0.15s',
            transform: n <= value ? 'scale(1.05)' : 'scale(1)',
          }}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
        >
          ★
        </button>
      ))}
    </div>
  )
}

export default function SendFeedbackPage() {
  const { user } = useAuth()
  const [member, setMember] = useState<Member | null>(null)
  const [feedback, setFeedback] = useState<Feedback[]>([])
  const [form, setForm] = useState({ category: 'Staff', rating: 0, content: '' })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!user) return
    apiGet<Member>(`/members?userId=${user.id}`).then((m) => {
      if (m) {
        setMember(m)
        apiGet<Feedback[]>(`/feedback?memberId=${m.id}`).then(setFeedback).catch(() => {})
      }
    }).catch(() => {})
  }, [user])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!member) return
    setError('')
    setMessage('')
    setSubmitting(true)
    try {
      await apiPost('/feedback', {
        memberId: member.id,
        category: form.category,
        rating: form.rating || undefined,
        content: form.content,
      })
      setForm({ category: 'Staff', rating: 0, content: '' })
      setMessage('Feedback submitted successfully')
      const data = await apiGet<Feedback[]>(`/feedback?memberId=${member.id}`)
      setFeedback(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page-container">
      <div className="page-header"><h2>Send Feedback</h2></div>

      {/* Submit Form */}
      <div className="card" style={{ padding: 24 }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Category */}
          <div>
            <label style={labelStyle}>Category *</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {CATEGORIES.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setForm((f) => ({ ...f, category: c }))}
                  style={{
                    padding: '8px 18px',
                    borderRadius: 20,
                    border: `2px solid ${form.category === c ? '#F97316' : 'var(--stroke)'}`,
                    background: form.category === c ? '#FFF7ED' : 'transparent',
                    color: form.category === c ? '#C2410C' : 'var(--text-strong)',
                    fontWeight: form.category === c ? 600 : 400,
                    fontSize: 14,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {c === 'Staff' ? '🧑‍🏫 Staff' : c === 'Equipment' ? '🏋️ Equipment' : '📦 Package'}
                </button>
              ))}
            </div>
          </div>

          {/* Rating */}
          <div>
            <label style={labelStyle}>Rating <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(optional)</span></label>
            <StarSelector value={form.rating} onChange={(v) => setForm((f) => ({ ...f, rating: v }))} />
          </div>

          {/* Content */}
          <div>
            <label style={labelStyle}>Your Feedback *</label>
            <textarea
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              placeholder="Tell us about your experience..."
              rows={4}
              required
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: 12,
                border: '1px solid var(--stroke)',
                background: 'var(--panel)',
                color: 'var(--text-strong)',
                fontSize: 14,
                fontFamily: 'inherit',
                resize: 'vertical',
              }}
            />
          </div>

          {error && <p style={{ color: '#d32f2f', fontSize: 14, margin: 0 }}>{error}</p>}
          {message && (
            <p style={{ color: '#2e7d32', fontSize: 14, margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 16 }}>✓</span> {message}
            </p>
          )}

          <button
            type="submit"
            className="btn-primary"
            disabled={submitting}
            style={{ alignSelf: 'flex-start', opacity: submitting ? 0.7 : 1, padding: '12px 28px', fontSize: 15 }}
          >
            {submitting ? 'Submitting...' : 'Submit Feedback'}
          </button>
        </form>
      </div>

      {/* Feedback History */}
      <div>
        <h3 style={{ fontSize: 16, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
          Your Feedback History
          <span style={{
            fontSize: 12,
            background: 'var(--chip)',
            color: 'var(--muted)',
            padding: '2px 10px',
            borderRadius: 12,
            fontWeight: 400,
          }}>
            {feedback.length}
          </span>
        </h3>

        {feedback.length === 0 ? (
          <div className="card" style={{ padding: 32, textAlign: 'center' }}>
            <p style={{ fontSize: 14, color: 'var(--muted)' }}>
              No feedback yet. Submit your first feedback above!
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {feedback.map((f) => (
              <div
                key={f.id}
                className="card"
                style={{
                  padding: '16px 18px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: 14,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span className="badge" style={{ fontSize: 11 }}>{f.category}</span>
                    <span className={`badge badge-${f.status}`} style={{ fontSize: 11 }}>
                      {STATUS_LABELS[f.status] || f.status}
                    </span>
                    {f.rating != null && (
                      <span style={{ fontSize: 13, color: '#F97316' }}>
                        {'★'.repeat(f.rating)}{'☆'.repeat(5 - f.rating)}
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: 14, margin: '4px 0 0', lineHeight: 1.5, color: 'var(--text-strong)' }}>
                    {f.content}
                  </p>
                  {f.responses && f.responses.length > 0 && (
                    <div style={{ marginTop: 10, paddingLeft: 12, borderLeft: '3px solid #F97316' }}>
                      {f.responses.map((r) => (
                        <div key={r.id} style={{ marginBottom: 6 }}>
                          <p style={{ fontSize: 13, margin: 0, color: 'var(--text-strong)', lineHeight: 1.5 }}>{r.response}</p>
                          <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                            Staff · {new Date(r.created_at).toLocaleDateString('en-GB')}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <span style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap', marginTop: 2 }}>
                  {new Date(f.created_at).toLocaleDateString('en-GB')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 600,
  color: 'var(--muted)',
  marginBottom: 6,
}
