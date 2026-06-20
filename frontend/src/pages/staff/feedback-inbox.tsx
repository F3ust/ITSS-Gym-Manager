import { useState, useEffect } from 'react'
import { apiGet, apiPatch, apiPost } from '../../api/client'

interface Feedback {
  id: string
  member_id: string
  category: string
  rating: number | null
  content: string
  status: string
  created_at: string
  responses?: { id: string; response: string; created_at: string }[]
}

export default function FeedbackInboxPage() {
  const [items, setItems] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('')
  const [respondId, setRespondId] = useState<string | null>(null)
  const [respondText, setRespondText] = useState('')
  const [sending, setSending] = useState(false)
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    try {
      setLoading(true)
      const path = filter ? `/feedback?status=${filter}` : '/feedback'
      const data = await apiGet<Feedback[]>(path)
      setItems(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  async function updateStatus(id: string, status: string) {
    setError('')
    try {
      await apiPatch(`/feedback/${id}/status`, { status })
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update')
    }
  }

  function openRespond(id: string) {
    setRespondId(id)
    setRespondText('')
    setError('')
  }

  async function submitResponse(e: React.FormEvent) {
    e.preventDefault()
    if (!respondId || !respondText.trim()) return
    setSending(true)
    setError('')
    try {
      await apiPost(`/feedback/${respondId}/response`, { response: respondText.trim() })
      setRespondId(null)
      setRespondText('')
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send response')
    } finally {
      setSending(false)
    }
  }

  if (loading) return <div className="page-loading">Loading...</div>

  const statusOrder = ['new', 'processing', 'resolved', 'completed']

  return (
    <div className="page-container">
      <div className="page-header"><h2>Feedback Inbox</h2></div>
      {error && <p className="form-error">{error}</p>}
      <div className="tabs" style={{ marginBottom: 16 }}>
        <button className={`tab ${!filter ? 'tab-active' : ''}`} onClick={() => { setFilter(''); load() }}>All</button>
        {statusOrder.map((s) => (
          <button key={s} className={`tab ${filter === s ? 'tab-active' : ''}`} onClick={() => { setFilter(s); load() }}>{s}</button>
        ))}
      </div>
      <table className="data-table">
        <thead><tr><th>Category</th><th>Content</th><th>Rating</th><th>Status</th><th>Date</th><th></th></tr></thead>
        <tbody>
          {items.map((f) => (
            <tr key={f.id} onClick={() => setSelectedFeedback(f)} style={{ cursor: 'pointer' }}>
              <td><span className="badge">{f.category}</span></td>
              <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.content}</td>
              <td>{f.rating != null ? '★'.repeat(f.rating) + '☆'.repeat(5 - f.rating) : '-'}</td>
              <td><span className={`badge badge-${f.status}`}>{f.status}</span></td>
              <td>{new Date(f.created_at).toLocaleDateString()}</td>
              <td className="table-actions" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {f.status === 'new' && (
                  <button className="btn-sm" onClick={(e) => { e.stopPropagation(); updateStatus(f.id, 'processing') }}>
                    Process
                  </button>
                )}
                {(f.status === 'new' || f.status === 'processing') && (
                  <button className="btn-sm btn-primary" onClick={(e) => { e.stopPropagation(); openRespond(f.id) }}>
                    Respond
                  </button>
                )}
              </td>
            </tr>
          ))}
          {items.length === 0 && <tr><td colSpan={6} className="table-empty">No feedback</td></tr>}
        </tbody>
      </table>

      {/* Details Dialog */}
      {selectedFeedback && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }} onClick={() => setSelectedFeedback(null)}>
          <div className="card" style={{ padding: 24, width: 500, maxWidth: '90vw' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span className="badge" style={{ fontSize: 12 }}>{selectedFeedback.category}</span>
              <span className={`badge badge-${selectedFeedback.status}`}>{selectedFeedback.status}</span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Created Date</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-strong)', marginTop: 4 }}>
                  {new Date(selectedFeedback.created_at).toLocaleString()}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Rating</div>
                <div style={{ fontSize: 16, color: 'var(--accent)', marginTop: 4, fontWeight: 700 }}>
                  {selectedFeedback.rating != null ? '★'.repeat(selectedFeedback.rating) + '☆'.repeat(5 - selectedFeedback.rating) : 'No Rating'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Feedback Content</div>
                <p style={{ fontSize: 14, color: 'var(--text-strong)', marginTop: 6, lineHeight: 1.5, background: 'var(--bg)', padding: 12, borderRadius: 8, border: '1px solid var(--stroke)', whiteSpace: 'pre-wrap' }}>
                  {selectedFeedback.content}
                </p>
              </div>

              {selectedFeedback.responses && selectedFeedback.responses.length > 0 && (
                <div style={{ borderTop: '1px solid var(--stroke)', paddingTop: 16, marginTop: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 8 }}>Staff Responses</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {selectedFeedback.responses.map((resp, rIdx) => (
                      <div key={resp.id || rIdx} style={{ padding: 12, background: 'var(--accent-light)', border: '1px solid var(--accent)', borderRadius: 10 }}>
                        <p style={{ fontSize: 13, color: 'var(--text-strong)', lineHeight: 1.4 }}>{resp.response}</p>
                        <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 6, textAlign: 'right' }}>
                          Responded at: {new Date(resp.created_at).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 24 }}>
              {selectedFeedback.status === 'new' && (
                <button className="btn-sm" onClick={(e) => { e.stopPropagation(); updateStatus(selectedFeedback.id, 'processing'); setSelectedFeedback(prev => prev ? { ...prev, status: 'processing' } : null) }}>
                  Process
                </button>
              )}
              {(selectedFeedback.status === 'new' || selectedFeedback.status === 'processing') && (
                <button className="btn-sm btn-primary" onClick={(e) => { e.stopPropagation(); openRespond(selectedFeedback.id); setSelectedFeedback(null) }}>
                  Respond
                </button>
              )}
              <button type="button" className="btn-secondary" onClick={() => setSelectedFeedback(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Respond Dialog */}
      {respondId && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }} onClick={() => setRespondId(null)}>
          <div className="card" style={{ padding: 24, width: 420, maxWidth: '90vw' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px' }}>Respond to Feedback</h3>
            <form onSubmit={submitResponse} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <textarea
                value={respondText}
                onChange={(e) => setRespondText(e.target.value)}
                placeholder="Type your response..."
                rows={4}
                required
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 8,
                  border: '1px solid var(--stroke)', background: 'var(--panel)',
                  color: 'var(--text-strong)', fontSize: 14, fontFamily: 'inherit',
                  resize: 'vertical',
                }}
              />
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" className="btn-secondary" onClick={() => setRespondId(null)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={sending || !respondText.trim()}>
                  {sending ? 'Sending...' : 'Send Response'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
