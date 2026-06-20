import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiGet } from '../../api/client'
import { pushNotification } from '../../hooks/use-notifications'

interface Package { price: number; status: string }
interface Staff { id: string }
interface Equipment { id: string; name: string; status: string; code: string }
interface Member { id: string; status: string }
interface CheckIn { id: string; check_in_at: string }
interface AuditLog { id: string; created_at: string; username: string | null; action: string }

export default function OwnerDashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState({ packages: 0, staff: 0, equipment: 0, members: 0, checkins: 0 })
  const [brokenEquipment, setBrokenEquipment] = useState<Equipment[]>([])
  const [recentLogs, setRecentLogs] = useState<AuditLog[]>([])
  const [trafficStats, setTrafficStats] = useState<{ day: string; count: number }[]>([])
  const [revenue, setRevenue] = useState(0)
  const [revenueStats, setRevenueStats] = useState<{ day: string; total: number }[]>([])
  const [activeTab, setActiveTab] = useState<'traffic' | 'revenue'>('traffic')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    const sevenDaysAgoDate = new Date()
    sevenDaysAgoDate.setDate(sevenDaysAgoDate.getDate() - 6)
    const sevenDaysAgo = sevenDaysAgoDate.toISOString().split('T')[0]

    setLoading(true)
    Promise.all([
      apiGet<Package[]>('/packages'),
      apiGet<Staff[]>('/staff'),
      apiGet<Equipment[]>('/equipment'),
      apiGet<Member[]>('/members'),
      apiGet<CheckIn[]>('/check-ins'),
      apiGet<AuditLog[]>('/roles/audit-logs').catch(() => []),
      apiGet<{ total: number; breakdown: { day: string; total: number }[] }>(`/reports/revenue?from=${sevenDaysAgo}&to=${today}`).catch(() => ({ total: 0, breakdown: [] })),
    ]).then(([pkg, stf, eqp, mbr, ci, logs, rev]) => {
      const s = {
        packages: pkg.filter((p) => p.status !== 'inactive').length,
        staff: stf.length,
        equipment: eqp.length,
        members: mbr.filter((m) => m.status !== 'inactive').length,
        checkins: ci.length,
      }
      setStats(s)
      setRevenue(rev.total)
      
      const broken = eqp.filter(e => e.status === 'broken' || e.status === 'maintenance')
      setBrokenEquipment(broken.slice(0, 4))

      setRecentLogs(logs.slice(0, 4))

      const checkinByDay: Record<string, number> = {}
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date()
        d.setDate(d.getDate() - i)
        return d.toISOString().split('T')[0]
      }).reverse()

      last7Days.forEach(day => {
        checkinByDay[day] = 0
      })

      ci.forEach(c => {
        const day = c.check_in_at.split('T')[0]
        if (day in checkinByDay) {
          checkinByDay[day]++
        }
      })

      const chartData = last7Days.map(day => ({
        day: new Date(day).toLocaleDateString('en-US', { weekday: 'short' }),
        count: checkinByDay[day]
      }))
      setTrafficStats(chartData)

      const revenueByDay: Record<string, number> = {}
      last7Days.forEach(day => {
        revenueByDay[day] = 0
      })

      if (rev && rev.breakdown) {
        rev.breakdown.forEach(r => {
          const day = r.day.split('T')[0]
          if (day in revenueByDay) {
            revenueByDay[day] = r.total
          }
        })
      }

      const revChartData = last7Days.map(day => ({
        day: new Date(day).toLocaleDateString('en-US', { weekday: 'short' }),
        total: revenueByDay[day]
      }))
      setRevenueStats(revChartData)

      if (s.checkins > 0) pushNotification('📋', `${s.checkins} check-ins recorded today`)
      if (s.members > 0) pushNotification('👥', `${s.members} active members in the system`)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="page-container">
      <div className="page-header"><div className="skeleton-header" style={{ width: 220 }} /></div>
      <div className="stats-grid">
        <div className="skeleton-card" style={{ height: 110 }} />
        <div className="skeleton-card" style={{ height: 110 }} />
        <div className="skeleton-card" style={{ height: 110 }} />
        <div className="skeleton-card" style={{ height: 110 }} />
        <div className="skeleton-card" style={{ height: 110 }} />
        <div className="skeleton-card" style={{ height: 110 }} />
      </div>
      <div className="bento-grid bento-grid-2-1" style={{ marginTop: 24 }}>
        <div className="skeleton-card" style={{ height: 280 }} />
        <div className="skeleton-card" style={{ height: 280 }} />
      </div>
    </div>
  )

  const maxTraffic = Math.max(1, ...trafficStats.map(t => t.count))
  const maxRevenue = Math.max(1, ...revenueStats.map(r => r.total))

  return (
    <div className="page-container">
      <div className="page-header"><h2>Owner Dashboard</h2></div>
      
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        {[
          { label: 'Weekly Revenue', value: `${revenue.toLocaleString('vi-VN')} VNĐ`, color: '#ea580c' },
          { label: 'Active Packages', value: stats.packages, color: '#3b82f6' },
          { label: 'Staff Members', value: stats.staff, color: '#10b981' },
          { label: 'Equipment Items', value: stats.equipment, color: '#8b5cf6' },
          { label: 'Active Members', value: stats.members, color: '#06b6d4' },
          { label: 'Today Check-Ins', value: stats.checkins, color: 'var(--accent)' },
        ].map((s) => (
          <div key={s.label} className="stat-card" style={{ borderLeft: `4px solid ${s.color}` }}>
            <span className="stat-value" style={{ fontSize: typeof s.value === 'string' && s.value.length > 10 ? '1.25rem' : '1.75rem' }}>{s.value}</span>
            <span className="stat-label">{s.label}</span>
          </div>
        ))}
      </div>

      <div className="bento-grid bento-grid-2-1">
        
        {/* Weekly Analytics Chart */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ fontSize: 16 }}>Gym Analytics</h3>
            <div style={{ display: 'flex', background: 'var(--chip)', padding: 4, borderRadius: 8, gap: 4 }}>
              <button 
                style={{ padding: '4px 12px', fontSize: 12, border: 'none', background: activeTab === 'traffic' ? 'var(--accent)' : 'transparent', color: activeTab === 'traffic' ? '#fff' : 'var(--muted)', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}
                onClick={() => setActiveTab('traffic')}
              >
                📋 Traffic
              </button>
              <button 
                style={{ padding: '4px 12px', fontSize: 12, border: 'none', background: activeTab === 'revenue' ? 'var(--accent)' : 'transparent', color: activeTab === 'revenue' ? '#fff' : 'var(--muted)', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}
                onClick={() => setActiveTab('revenue')}
              >
                💵 Revenue
              </button>
            </div>
          </div>

          {activeTab === 'traffic' ? (
            <>
              <div style={{ display: 'flex', alignItems: 'flex-end', height: 180, gap: 16, padding: '0 8px 16px', borderBottom: '1px solid var(--stroke)' }}>
                {trafficStats.map((t, i) => {
                  const heightPct = Math.max(10, Math.round((t.count / maxTraffic) * 100))
                  return (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: t.count > 0 ? 'var(--accent)' : 'var(--muted)' }}>{t.count}</span>
                      <div style={{ width: '100%', height: `${heightPct * 1.2}px`, background: t.count > 0 ? 'var(--accent)' : 'var(--stroke)', borderRadius: '6px 6px 0 0', minHeight: 8, transition: 'height 0.4s ease' }} />
                      <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, marginTop: 4 }}>{t.day}</span>
                    </div>
                  )
                })}
              </div>
              <div className="text-muted" style={{ fontSize: 12, marginTop: 12, textAlign: 'center' }}>
                Check-ins traffic over the last 7 calendar days
              </div>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'flex-end', height: 180, gap: 16, padding: '0 8px 16px', borderBottom: '1px solid var(--stroke)' }}>
                {revenueStats.map((r, i) => {
                  const heightPct = Math.max(10, Math.round((r.total / maxRevenue) * 100))
                  return (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: r.total > 0 ? '#10b981' : 'var(--muted)' }}>
                        {r.total > 0 ? `${(r.total / 1000).toLocaleString('vi-VN')}k` : '0'}
                      </span>
                      <div style={{ width: '100%', height: `${heightPct * 1.2}px`, background: r.total > 0 ? '#10b981' : 'var(--stroke)', borderRadius: '6px 6px 0 0', minHeight: 8, transition: 'height 0.4s ease' }} />
                      <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, marginTop: 4 }}>{r.day}</span>
                    </div>
                  )
                })}
              </div>
              <div className="text-muted" style={{ fontSize: 12, marginTop: 12, textAlign: 'center' }}>
                Daily revenue generation (in k VNĐ) over the last 7 days
              </div>
            </>
          )}
        </div>

        {/* Cảnh báo thiết bị lỗi & Nhật ký audit logs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* Equipment Maintenance Alerts */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)' }}>Equipment Warnings</h3>
              <span className="badge" style={{ background: brokenEquipment.length > 0 ? 'var(--error-light)' : 'var(--success-light)', color: brokenEquipment.length > 0 ? 'var(--error)' : 'var(--success)' }}>
                {brokenEquipment.length} warnings
              </span>
            </div>
            {brokenEquipment.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {brokenEquipment.map(e => (
                  <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'var(--bg)', borderRadius: 10, border: '1px solid var(--stroke)' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{e.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>Code: {e.code}</div>
                    </div>
                    <span className="badge" style={{ background: e.status === 'broken' ? '#fee2e2' : '#ffedd5', color: e.status === 'broken' ? '#ef4444' : '#ea580c', textTransform: 'capitalize', fontSize: 11 }}>
                      {e.status}
                    </span>
                  </div>
                ))}
                <button className="btn-sm" style={{ width: '100%', marginTop: 6 }} onClick={() => navigate('/owner/equipment')}>
                  Manage Equipment
                </button>
              </div>
            ) : (
              <p className="text-muted" style={{ fontStyle: 'italic', fontSize: 13, padding: '12px 0', textAlign: 'center' }}>
                ✓ All equipment items are operational.
              </p>
            )}
          </div>

          {/* Recent Audit Logs */}
          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: 12 }}>Recent Audit Log</h3>
            {recentLogs.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {recentLogs.map(l => (
                  <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, paddingBottom: 8, borderBottom: '1px solid var(--stroke)' }}>
                    <div style={{ maxWidth: '75%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <span style={{ fontWeight: 600 }}>{l.username || 'System'}</span>
                      <span style={{ color: 'var(--muted)', marginLeft: 6 }}>{l.action}</span>
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>{new Date(l.created_at).toLocaleDateString()}</span>
                  </div>
                ))}
                <button className="btn-sm" style={{ width: '100%', marginTop: 6 }} onClick={() => navigate('/owner/settings')}>
                  View Settings Logs
                </button>
              </div>
            ) : (
              <p className="text-muted" style={{ fontStyle: 'italic', fontSize: 13, padding: '12px 0', textAlign: 'center' }}>
                No system logs recorded.
              </p>
            )}
          </div>

        </div>

      </div>
    </div>
  )
}
