import { useState } from 'react'
import { apiGet } from '../../api/client'
import { fmtVND } from '../../utils/format'

interface RevenueDay {
  day: string
  total: number
}

interface RevenueReport {
  total: number
  breakdown: RevenueDay[]
}

interface TrafficDay {
  day: string
  total: number
}

interface EquipmentStatus {
  status: string
  total: number
}

interface StaffPerformance {
  id: string
  staff_name: string
  period_start: string
  period_end: string
  checkins_processed: number
  subscriptions_registered: number
  total_sales: number
}


// Timezone-safe date range generator
function getDatesRange(startStr: string, endStr: string) {
  const dates: string[] = []
  if (!startStr || !endStr) return dates
  const [sy, sm, sd] = startStr.split('-').map(Number)
  const [ey, em, ed] = endStr.split('-').map(Number)
  const current = new Date(Date.UTC(sy, sm - 1, sd))
  const end = new Date(Date.UTC(ey, em - 1, ed))
  while (current <= end) {
    dates.push(current.toISOString().split('T')[0])
    current.setUTCDate(current.getUTCDate() + 1)
  }
  return dates
}

export default function ReportsPage() {
  const [type, setType] = useState('revenue')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [revenueData, setRevenueData] = useState<RevenueReport | null>(null)
  const [trafficData, setTrafficData] = useState<TrafficDay[] | null>(null)
  const [equipmentData, setEquipmentData] = useState<EquipmentStatus[] | null>(null)
  const [performanceData, setPerformanceData] = useState<StaffPerformance[] | null>(null)

  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  async function handleQuery(e: React.FormEvent) {
    e.preventDefault()
    if (type !== 'equipment' && (!from || !to)) {
      setError('Please select both Start Date and End Date')
      return
    }
    setError('')
    setLoading(true)
    
    // Clear previous states
    setRevenueData(null)
    setTrafficData(null)
    setEquipmentData(null)
    setPerformanceData(null)
    setHoveredIdx(null)

    try {
      if (type === 'revenue') {
        const res = await apiGet<RevenueReport>(`/reports/revenue?from=${from}&to=${to}`)
        setRevenueData(res)
      } else if (type === 'traffic') {
        const res = await apiGet<TrafficDay[]>(`/reports/traffic?from=${from}&to=${to}`)
        setTrafficData(res)
      } else if (type === 'equipment') {
        const res = await apiGet<EquipmentStatus[]>('/reports/equipment')
        setEquipmentData(res)
      } else if (type === 'performance') {
        const res = await apiGet<StaffPerformance[]>(`/reports/staff-performance?from=${from}&to=${to}`)
        setPerformanceData(res)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch report data')
    } finally {
      setLoading(false)
    }
  }

  // Generate data series padded with zeros for chart rendering
  const daysRange = getDatesRange(from, to)
  
  const paddedRevenue = daysRange.map(d => {
    const match = revenueData?.breakdown?.find(b => b.day === d)
    return { day: d, total: match ? match.total : 0 }
  })

  const paddedTraffic = daysRange.map(d => {
    const match = trafficData?.find(t => t.day.split('T')[0] === d)
    return { day: d, total: match ? match.total : 0 }
  })

  // Calculate summaries for Revenue
  const revSum = paddedRevenue.reduce((sum, d) => sum + d.total, 0)
  const revAvg = paddedRevenue.length > 0 ? revSum / paddedRevenue.length : 0
  const revMax = paddedRevenue.length > 0 ? Math.max(...paddedRevenue.map(d => d.total)) : 0
  const revMaxDay = paddedRevenue.find(d => d.total === revMax)?.day || 'N/A'

  // Calculate summaries for Traffic
  const trafSum = paddedTraffic.reduce((sum, d) => sum + d.total, 0)
  const trafAvg = paddedTraffic.length > 0 ? trafSum / paddedTraffic.length : 0
  const trafMax = paddedTraffic.length > 0 ? Math.max(...paddedTraffic.map(d => d.total)) : 0
  const trafMaxDay = paddedTraffic.find(d => d.total === trafMax)?.day || 'N/A'

  return (
    <div className="page-container" style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div className="page-header">
        <h2>Business Intelligence & Reports</h2>
      </div>

      <div className="card" style={{ padding: 20, marginBottom: 24 }}>
        <form onSubmit={handleQuery} style={{ display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Report Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--stroke)', background: 'var(--panel)', color: 'var(--text-strong)' }}>
              <option value="revenue">Financial Revenue</option>
              <option value="traffic">Member Traffic (Check-ins)</option>
              <option value="equipment">Equipment Status Overview</option>
              <option value="performance">Staff Performance Metrics</option>
            </select>
          </div>
          
          {type !== 'equipment' && (
            <>
              <div style={{ minWidth: 160 }}>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Start Date</label>
                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} required style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--stroke)', background: 'var(--panel)', color: 'var(--text-strong)' }} />
              </div>
              <div style={{ minWidth: 160 }}>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>End Date</label>
                <input type="date" value={to} onChange={(e) => setTo(e.target.value)} required style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--stroke)', background: 'var(--panel)', color: 'var(--text-strong)' }} />
              </div>
            </>
          )}

          <button type="submit" className="btn-primary" style={{ padding: '11px 24px', height: 42 }}>
            Generate Report
          </button>
        </form>
        {error && <p className="form-error" style={{ marginTop: 12 }}>{error}</p>}
      </div>

      {loading && <div className="page-loading">Generating report metrics...</div>}

      {/* ── REVENUE REPORT VISUALIZATION ── */}
      {type === 'revenue' && revenueData && !loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            <div className="stat-card" style={{ borderLeft: '4px solid #10b981', background: '#fff', borderRadius: 12, padding: 20, boxShadow: 'var(--shadow-soft)' }}>
              <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}>Total Revenue</div>
              <div style={{ fontSize: 24, fontWeight: 700, marginTop: 8, color: '#10b981' }}>{fmtVND(revSum)}</div>
            </div>
            <div className="stat-card" style={{ borderLeft: '4px solid #3b82f6', background: '#fff', borderRadius: 12, padding: 20, boxShadow: 'var(--shadow-soft)' }}>
              <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}>Daily Average</div>
              <div style={{ fontSize: 24, fontWeight: 700, marginTop: 8, color: 'var(--text-strong)' }}>{fmtVND(revAvg)}</div>
            </div>
            <div className="stat-card" style={{ borderLeft: '4px solid #f59e0b', background: '#fff', borderRadius: 12, padding: 20, boxShadow: 'var(--shadow-soft)' }}>
              <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}>Peak Revenue Day</div>
              <div style={{ fontSize: 24, fontWeight: 700, marginTop: 8, color: 'var(--text-strong)' }}>{fmtVND(revMax)}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Peak Date: {revMaxDay !== 'N/A' ? new Date(revMaxDay).toLocaleDateString() : 'N/A'}</div>
            </div>
            <div className="stat-card" style={{ borderLeft: '4px solid #8b5cf6', background: '#fff', borderRadius: 12, padding: 20, boxShadow: 'var(--shadow-soft)' }}>
              <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}>Total Range Duration</div>
              <div style={{ fontSize: 24, fontWeight: 700, marginTop: 8, color: 'var(--text-strong)' }}>{paddedRevenue.length} days</div>
            </div>
          </div>

          {/* Interactive SVG Chart */}
          <div className="card" style={{ padding: 24, position: 'relative' }}>
            <h3 style={{ marginBottom: 18 }}>Revenue Breakdown Over Time</h3>
            {paddedRevenue.length === 0 ? (
              <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyItems: 'center', color: 'var(--muted)' }}>No dates in range</div>
            ) : (
              <div style={{ position: 'relative', width: '100%' }}>
                {/* SVG Area Chart */}
                {(() => {
                  const width = 1000
                  const height = 300
                  const paddingTop = 20
                  const paddingBottom = 40
                  const paddingLeft = 70
                  const paddingRight = 30
                  
                  const chartWidth = width - paddingLeft - paddingRight
                  const chartHeight = height - paddingTop - paddingBottom

                  const yMax = revMax > 0 ? revMax * 1.15 : 1000000

                  const points = paddedRevenue.map((d, i) => {
                    const x = paddingLeft + (paddedRevenue.length > 1 ? (i / (paddedRevenue.length - 1)) * chartWidth : 0)
                    const y = paddingTop + chartHeight - (d.total / yMax) * chartHeight
                    return { x, y, day: d.day, total: d.total }
                  })

                  let lineD = ''
                  let areaD = ''
                  if (points.length > 0) {
                    lineD = `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ')
                    areaD = `${lineD} L ${points[points.length - 1].x} ${paddingTop + chartHeight} L ${points[0].x} ${paddingTop + chartHeight} Z`
                  }

                  // Selection of horizontal grid values
                  const gridTicks = [0, yMax * 0.25, yMax * 0.5, yMax * 0.75, yMax]
                  
                  // Label rendering interval
                  const labelInterval = Math.max(1, Math.ceil(paddedRevenue.length / 8))

                  return (
                    <>
                      <div style={{ width: '100%', overflowX: 'auto' }}>
                        <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="auto" style={{ overflow: 'visible', minWidth: 600 }}>
                          <defs>
                            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                            </linearGradient>
                          </defs>

                          {/* Y-Axis Gridlines & Labels */}
                          {gridTicks.map((val, idx) => {
                            const y = paddingTop + chartHeight - (val / yMax) * chartHeight
                            return (
                              <g key={idx}>
                                <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="var(--stroke)" strokeDasharray="4 4" />
                                <text x={paddingLeft - 10} y={y + 4} textAnchor="end" fontSize={11} fill="var(--muted)">
                                  {fmtVND(val)}
                                </text>
                              </g>
                            )
                          })}

                          {/* X-Axis Labels */}
                          {points.map((p, idx) => {
                            if (idx % labelInterval !== 0 && idx !== points.length - 1) return null
                            return (
                              <g key={idx}>
                                <text x={p.x} y={paddingTop + chartHeight + 20} textAnchor="middle" fontSize={11} fill="var(--muted)">
                                  {new Date(p.day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </text>
                              </g>
                            )
                          })}

                          {/* Chart Area Fill */}
                          {areaD && <path d={areaD} fill="url(#areaGrad)" />}

                          {/* Chart Trend Line */}
                          {lineD && <path d={lineD} fill="none" stroke="#10b981" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />}

                          {/* Highlight line on hover */}
                          {hoveredIdx !== null && points[hoveredIdx] && (
                            <g>
                              <line x1={points[hoveredIdx].x} y1={paddingTop} x2={points[hoveredIdx].x} y2={paddingTop + chartHeight} stroke="#10b981" strokeWidth={1} strokeDasharray="3 3" />
                              <circle cx={points[hoveredIdx].x} cy={points[hoveredIdx].y} r={6} fill="#10b981" stroke="#fff" strokeWidth={2} />
                            </g>
                          )}

                          {/* Hover Overlay Rectangles */}
                          {points.map((p, idx) => {
                            const rectWidth = chartWidth / paddedRevenue.length
                            const rectX = p.x - rectWidth / 2
                            return (
                              <rect
                                key={idx}
                                x={rectX}
                                y={paddingTop}
                                width={rectWidth}
                                height={chartHeight}
                                fill="transparent"
                                style={{ cursor: 'pointer' }}
                                onMouseEnter={() => setHoveredIdx(idx)}
                                onMouseLeave={() => setHoveredIdx(null)}
                              />
                            )
                          })}
                        </svg>
                      </div>

                      {/* Tooltip Overlay */}
                      {hoveredIdx !== null && points[hoveredIdx] && (
                        <div style={{
                          position: 'absolute',
                          left: `${(points[hoveredIdx].x / width) * 100}%`,
                          top: `${(points[hoveredIdx].y / height) * 100 - 60}%`,
                          transform: 'translateX(-50%)',
                          background: 'var(--text-strong)',
                          color: '#fff',
                          padding: '8px 12px',
                          borderRadius: 8,
                          fontSize: 12,
                          pointerEvents: 'none',
                          boxShadow: 'var(--shadow-medium)',
                          zIndex: 10,
                          whiteSpace: 'nowrap'
                        }}>
                          <strong style={{ display: 'block', marginBottom: 2 }}>
                            {new Date(points[hoveredIdx].day).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                          </strong>
                          <span style={{ color: '#34d399', fontWeight: 700 }}>
                            {fmtVND(points[hoveredIdx].total)}
                          </span>
                        </div>
                      )}
                    </>
                  )
                })()}
              </div>
            )}
          </div>
          
          {/* Detailed Data Table */}
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ marginBottom: 16 }}>Daily Statement</h3>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Revenue Sum</th>
                </tr>
              </thead>
              <tbody>
                {paddedRevenue.slice().reverse().map((r, i) => (
                  <tr key={i}>
                    <td>{new Date(r.day).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</td>
                    <td style={{ fontWeight: 600, color: r.total > 0 ? '#10b981' : undefined }}>{fmtVND(r.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TRAFFIC REPORT VISUALIZATION ── */}
      {type === 'traffic' && trafficData && !loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            <div className="stat-card" style={{ borderLeft: '4px solid #3b82f6', background: '#fff', borderRadius: 12, padding: 20, boxShadow: 'var(--shadow-soft)' }}>
              <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}>Total Check-Ins</div>
              <div style={{ fontSize: 24, fontWeight: 700, marginTop: 8, color: '#3b82f6' }}>{trafSum} entry passes</div>
            </div>
            <div className="stat-card" style={{ borderLeft: '4px solid #06b6d4', background: '#fff', borderRadius: 12, padding: 20, boxShadow: 'var(--shadow-soft)' }}>
              <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}>Daily Average</div>
              <div style={{ fontSize: 24, fontWeight: 700, marginTop: 8, color: 'var(--text-strong)' }}>{trafAvg.toFixed(1)} check-ins/day</div>
            </div>
            <div className="stat-card" style={{ borderLeft: '4px solid #ec4899', background: '#fff', borderRadius: 12, padding: 20, boxShadow: 'var(--shadow-soft)' }}>
              <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}>Busy Peak Day</div>
              <div style={{ fontSize: 24, fontWeight: 700, marginTop: 8, color: 'var(--text-strong)' }}>{trafMax} entries</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>Peak Date: {trafMaxDay !== 'N/A' ? new Date(trafMaxDay).toLocaleDateString() : 'N/A'}</div>
            </div>
          </div>

          {/* Interactive SVG Bar Chart */}
          <div className="card" style={{ padding: 24, position: 'relative' }}>
            <h3 style={{ marginBottom: 18 }}>Gym Member Traffic over Selected Dates</h3>
            {paddedTraffic.length === 0 ? (
              <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyItems: 'center', color: 'var(--muted)' }}>No dates in range</div>
            ) : (
              <div style={{ position: 'relative', width: '100%' }}>
                {(() => {
                  const width = 1000
                  const height = 300
                  const paddingTop = 20
                  const paddingBottom = 40
                  const paddingLeft = 50
                  const paddingRight = 30
                  
                  const chartWidth = width - paddingLeft - paddingRight
                  const chartHeight = height - paddingTop - paddingBottom

                  const yMax = trafMax > 0 ? Math.ceil(trafMax * 1.2) : 10
                  
                  const barWidth = Math.max(2, (chartWidth / paddedTraffic.length) * 0.7)
                  const step = chartWidth / paddedTraffic.length

                  const points = paddedTraffic.map((d, i) => {
                    const x = paddingLeft + i * step + step / 2
                    const y = paddingTop + chartHeight - (d.total / yMax) * chartHeight
                    return { x, y, day: d.day, total: d.total }
                  })

                  const gridTicks = Array.from({ length: 5 }, (_, i) => Math.round((yMax / 4) * i))
                  const labelInterval = Math.max(1, Math.ceil(paddedTraffic.length / 8))

                  return (
                    <>
                      <div style={{ width: '100%', overflowX: 'auto' }}>
                        <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="auto" style={{ overflow: 'visible', minWidth: 600 }}>
                          {/* Y-Axis Gridlines & Labels */}
                          {gridTicks.map((val, idx) => {
                            const y = paddingTop + chartHeight - (val / yMax) * chartHeight
                            return (
                              <g key={idx}>
                                <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="var(--stroke)" strokeDasharray="4 4" />
                                <text x={paddingLeft - 10} y={y + 4} textAnchor="end" fontSize={11} fill="var(--muted)">
                                  {val}
                                </text>
                              </g>
                            )
                          })}

                          {/* X-Axis Labels */}
                          {points.map((p, idx) => {
                            if (idx % labelInterval !== 0 && idx !== points.length - 1) return null
                            return (
                              <g key={idx}>
                                <text x={p.x} y={paddingTop + chartHeight + 20} textAnchor="middle" fontSize={11} fill="var(--muted)">
                                  {new Date(p.day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </text>
                              </g>
                            )
                          })}

                          {/* Bars rendering */}
                          {points.map((p, idx) => {
                            const isHovered = hoveredIdx === idx
                            const barHeight = paddingTop + chartHeight - p.y
                            return (
                              <rect
                                key={idx}
                                x={p.x - barWidth / 2}
                                y={p.y}
                                width={barWidth}
                                height={Math.max(1, barHeight)}
                                fill={isHovered ? '#2563eb' : '#3b82f6'}
                                rx={Math.min(4, barWidth / 2)}
                                style={{ transition: 'fill 0.1s' }}
                              />
                            )
                          })}

                          {/* Hover Zones */}
                          {points.map((p, idx) => {
                            const rectWidth = step
                            const rectX = p.x - rectWidth / 2
                            return (
                              <rect
                                key={idx}
                                x={rectX}
                                y={paddingTop}
                                width={rectWidth}
                                height={chartHeight}
                                fill="transparent"
                                style={{ cursor: 'pointer' }}
                                onMouseEnter={() => setHoveredIdx(idx)}
                                onMouseLeave={() => setHoveredIdx(null)}
                              />
                            )
                          })}
                        </svg>
                      </div>

                      {/* Tooltip */}
                      {hoveredIdx !== null && points[hoveredIdx] && (
                        <div style={{
                          position: 'absolute',
                          left: `${(points[hoveredIdx].x / width) * 100}%`,
                          top: `${(points[hoveredIdx].y / height) * 100 - 60}%`,
                          transform: 'translateX(-50%)',
                          background: 'var(--text-strong)',
                          color: '#fff',
                          padding: '8px 12px',
                          borderRadius: 8,
                          fontSize: 12,
                          pointerEvents: 'none',
                          boxShadow: 'var(--shadow-medium)',
                          zIndex: 10,
                          whiteSpace: 'nowrap'
                        }}>
                          <strong style={{ display: 'block', marginBottom: 2 }}>
                            {new Date(points[hoveredIdx].day).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                          </strong>
                          <span style={{ color: '#60a5fa', fontWeight: 700 }}>
                            {points[hoveredIdx].total} Check-ins
                          </span>
                        </div>
                      )}
                    </>
                  )
                })()}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── EQUIPMENT STATUS REPORT ── */}
      {type === 'equipment' && equipmentData && !loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            {equipmentData.map((e, idx) => {
              const borderColors: Record<string, string> = {
                active: '#10b981',
                maintenance: '#f59e0b',
                broken: '#ef4444'
              }
              const displayLabel: Record<string, string> = {
                active: 'Operational (Active)',
                maintenance: 'Under Maintenance',
                broken: 'Out of Order (Broken)'
              }
              return (
                <div key={idx} className="stat-card" style={{ borderLeft: `4px solid ${borderColors[e.status] || 'var(--muted)'}`, background: '#fff', borderRadius: 12, padding: 20, boxShadow: 'var(--shadow-soft)' }}>
                  <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600, textTransform: 'capitalize' }}>
                    {displayLabel[e.status] || e.status}
                  </div>
                  <div style={{ fontSize: 32, fontWeight: 700, marginTop: 8, color: 'var(--text-strong)' }}>{e.total} units</div>
                </div>
              )
            })}
          </div>

          <div className="card" style={{ padding: 24 }}>
            <h3>Visual Share</h3>
            {(() => {
              const totalUnits = equipmentData.reduce((sum, e) => sum + e.total, 0)
              if (totalUnits === 0) return <p className="text-muted">No equipment data found.</p>
              return (
                <div style={{ marginTop: 20 }}>
                  <div style={{ height: 28, width: '100%', display: 'flex', borderRadius: 14, overflow: 'hidden', background: 'var(--stroke)' }}>
                    {equipmentData.map((e, idx) => {
                      const colors: Record<string, string> = { active: '#10b981', maintenance: '#f59e0b', broken: '#ef4444' }
                      const percent = (e.total / totalUnits) * 100
                      if (percent === 0) return null
                      return (
                        <div
                          key={idx}
                          style={{
                            width: `${percent}%`,
                            background: colors[e.status] || 'var(--muted)',
                            height: '100%',
                            transition: 'width 0.3s'
                          }}
                          title={`${e.status}: ${e.total} (${percent.toFixed(1)}%)`}
                        />
                      )
                    })}
                  </div>
                  <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap', fontSize: 13 }}>
                    {equipmentData.map((e, idx) => {
                      const colors: Record<string, string> = { active: '#10b981', maintenance: '#f59e0b', broken: '#ef4444' }
                      return (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', background: colors[e.status] || 'var(--muted)' }} />
                          <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{e.status}</span>
                          <span className="text-muted">({((e.total / totalUnits) * 100).toFixed(1)}%)</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })()}
          </div>
        </div>
      )}

      {/* ── STAFF PERFORMANCE REPORT ── */}
      {type === 'performance' && performanceData && !loading && (
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ marginBottom: 16 }}>Operational Performance Review</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Staff Member</th>
                <th>Evaluation Period</th>
                <th>Check-ins Processed</th>
                <th>Packages Registered</th>
                <th>Total Sales Volume</th>
              </tr>
            </thead>
            <tbody>
              {performanceData.map((p, idx) => (
                <tr key={idx}>
                  <td style={{ fontWeight: 600 }}>{p.staff_name}</td>
                  <td>{new Date(p.period_start).toLocaleDateString()} - {new Date(p.period_end).toLocaleDateString()}</td>
                  <td>{p.checkins_processed} check-ins</td>
                  <td>{p.subscriptions_registered} registrations</td>
                  <td style={{ fontWeight: 600, color: 'var(--accent)' }}>{fmtVND(p.total_sales)}</td>
                </tr>
              ))}
              {performanceData.length === 0 && (
                <tr>
                  <td colSpan={5} className="table-empty">No performance data found for the selected dates.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

