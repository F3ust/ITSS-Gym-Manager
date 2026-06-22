import { useState, useCallback } from 'react'
import { apiGet, apiPost } from '../../api/client'

interface Member { id: string; full_name: string; phone: string; member_type: string }
interface PtAssignment { id: string; pt_id: string; member_id: string; status: string }

export default function CheckInPage() {
  const [query, setQuery] = useState('')
  const [members, setMembers] = useState<Member[]>([])
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [ptDialog, setPtDialog] = useState<{ memberId: string } | null>(null)
  const [checkingMemberId, setCheckingMemberId] = useState<string | null>(null)

  const search = useCallback(async () => {
    if (!query.trim()) return
    setError('')
    setMessage('')
    try {
      const data = await apiGet<Member[]>(`/members?query=${encodeURIComponent(query)}`)
      setMembers(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
    }
  }, [query])

  async function checkPt(memberId: string) {
    if (checkingMemberId) return
    setCheckingMemberId(memberId)
    setError('')
    setMessage('')
    try {
      const assigns = await apiGet<PtAssignment[]>('/pt/assignments')
      if (assigns.some((a) => a.member_id === memberId && a.status !== 'inactive')) {
        setPtDialog({ memberId })
        setCheckingMemberId(null)
        return
      }
    } catch (err) {
      console.error('Failed to check PT assignments:', err)
    }
    await doCheckIn(memberId, false)
  }

  async function doCheckIn(memberId: string, withPt: boolean) {
    setError('')
    setMessage('')
    setPtDialog(null)
    setCheckingMemberId(memberId)
    try {
      await apiPost('/check-ins', { memberId, method: 'id_search', withPt })
      setMessage(withPt ? 'Check-in successful (PT session used)' : 'Check-in successful')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Check-in failed')
    } finally {
      setCheckingMemberId(null)
    }
  }

  return (
    <div className="page-container">
      <div className="page-header"><h2>Check-In</h2></div>
      <div className="search-bar">
        <input placeholder="Search member by name or phone..." value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && search()} />
        <button className="btn-primary" onClick={search}>Search</button>
      </div>
      {error && <p className="form-error">{error}</p>}
      {message && <p style={{ color: '#2e7d32', fontSize: 14 }}>{message}</p>}
      {members.length > 0 && (
        <table className="data-table">
          <thead><tr><th>Name</th><th>Phone</th><th>Type</th><th></th></tr></thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id}>
                <td>{m.full_name}</td>
                <td>{m.phone}</td>
                <td><span className="badge">{m.member_type}</span></td>
                <td>
                  <button 
                    className="btn-primary btn-sm" 
                    onClick={() => checkPt(m.id)}
                    disabled={checkingMemberId !== null}
                  >
                    {checkingMemberId === m.id ? 'Checking...' : 'Check In'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {ptDialog && (
        <div className="overlay" onClick={() => setPtDialog(null)}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: 8 }}>PT Session</h3>
            <p style={{ fontSize: 14, marginBottom: 16 }}>This member has a PT assigned. Train with PT?</p>
            <div className="dialog-actions">
              <button className="btn-primary" onClick={() => doCheckIn(ptDialog.memberId, true)}>Yes (with PT)</button>
              <button className="btn-secondary" onClick={() => doCheckIn(ptDialog.memberId, false)}>No (without PT)</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 1000; }
        .dialog { background: #fff; border-radius: 8px; padding: 24px; min-width: 320px; box-shadow: 0 4px 20px rgba(0,0,0,0.15); }
        .dialog-actions { display: flex; gap: 10px; margin-top: 12px; }
        .btn-secondary { padding: 8px 16px; border: 1px solid #ccc; border-radius: 4px; background: #fff; cursor: pointer; font-size: 14px; }
      `}</style>
    </div>
  )
}
