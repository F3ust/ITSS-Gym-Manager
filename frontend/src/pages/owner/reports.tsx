import { useState } from 'react'
import { apiGet } from '../../api/client'

export default function ReportsPage() {
  const [type, setType] = useState('revenue')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [data, setData] = useState<unknown[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleQuery(e: React.FormEvent) {
    e.preventDefault()
    if (!from || !to) { setError('Select date range'); return }
    setError('')
    setLoading(true)
    try {
      const paths: Record<string, string> = {
        revenue: '/reports/revenue',
        traffic: '/check-ins',
        equipment: '/equipment',
        performance: '/staff/performance',
      }
      const path = paths[type]
      if (type === 'performance') {
        const res = await apiGet(`${path}?from=${from}&to=${to}`)
        setData(Array.isArray(res) ? res : [res])
      } else {
        const res = await apiGet(path)
        setData(Array.isArray(res) ? res : [res])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Query failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-container">
      <div className="page-header"><h2>Reports</h2></div>
      <div className="card">
        <form className="report-form" onSubmit={handleQuery}>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="revenue">Revenue</option>
            <option value="traffic">Member Traffic</option>
            <option value="equipment">Equipment Status</option>
            <option value="performance">Staff Performance</option>
          </select>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          <button type="submit" className="btn-primary">Query</button>
        </form>
        {error && <p className="form-error">{error}</p>}
      </div>
      {loading && <div className="page-loading">Loading...</div>}
      {data && !loading && (
        <div className="card">
          <pre className="report-data">{JSON.stringify(data, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}
