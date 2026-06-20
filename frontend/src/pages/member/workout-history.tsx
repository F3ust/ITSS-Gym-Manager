import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/auth-context'
import { apiGet } from '../../api/client'

interface UsageItem {
  id: string
  occurred_at: string
  type: 'checkin' | 'workout'
  method?: string
  with_pt?: boolean
  remaining_sessions_after?: number | null
  duration_min?: number
  intensity?: string | null
  notes?: string | null
  rating?: number | null
}

export default function WorkoutHistoryPage() {
  const { user } = useAuth()
  const [items, setItems] = useState<UsageItem[]>([])
  const [loading, setLoading] = useState(true)
  const [currentMonth, setCurrentMonth] = useState(() => new Date())
  const [selectedDateStr, setSelectedDateStr] = useState(() => new Date().toISOString().slice(0, 10))

  useEffect(() => {
    if (!user) return
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1).toISOString().slice(0, 10)
    const lastDay = new Date(year, month + 1, 0).toISOString().slice(0, 10)

    setLoading(true)
    apiGet<any>(`/members/usage-history?from=${firstDay}&to=${lastDay}&userId=${user.id}`)
      .then((data) => {
        setItems((data?.items || []) as UsageItem[])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user, currentMonth])

  // Group items by date string (YYYY-MM-DD)
  const dateMap: Record<string, UsageItem[]> = {}
  items.forEach(item => {
    let dateKey = ''
    if (item.occurred_at.includes('T')) {
      const d = new Date(item.occurred_at)
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
      dateKey = d.toISOString().slice(0, 10)
    } else {
      dateKey = item.occurred_at
    }
    if (!dateMap[dateKey]) {
      dateMap[dateKey] = []
    }
    dateMap[dateKey].push(item)
  })

  // Calendar logic
  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()

  const firstDayIndex = new Date(year, month, 1).getDay()
  const totalDays = new Date(year, month + 1, 0).getDate()
  const prevMonthTotalDays = new Date(year, month, 0).getDate()

  const daysGrid: { dayNum: number; dateStr: string; isCurrentMonth: boolean }[] = []

  // Prev month padding
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const day = prevMonthTotalDays - i
    const d = new Date(year, month - 1, day)
    // Adjust timezone offset to get correct ISO date string
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
    const dStr = d.toISOString().slice(0, 10)
    daysGrid.push({ dayNum: day, dateStr: dStr, isCurrentMonth: false })
  }

  // Current month days
  for (let i = 1; i <= totalDays; i++) {
    const d = new Date(year, month, i)
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
    const dStr = d.toISOString().slice(0, 10)
    daysGrid.push({ dayNum: i, dateStr: dStr, isCurrentMonth: true })
  }

  // Next month padding
  const remaining = 42 - daysGrid.length
  for (let i = 1; i <= remaining; i++) {
    const d = new Date(year, month + 1, i)
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
    const dStr = d.toISOString().slice(0, 10)
    daysGrid.push({ dayNum: i, dateStr: dStr, isCurrentMonth: false })
  }

  const handlePrevMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }

  const handleNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }

  const selectedItems = dateMap[selectedDateStr] || []

  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const formattedSelectedDate = new Date(selectedDateStr).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Workout Calendar</h2>
      </div>

      <div className="bento-grid bento-grid-2-1" style={{ gap: 24, marginTop: 12 }}>
        
        {/* Left Column: Monthly Calendar */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700 }}>{monthName}</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-sm" onClick={handlePrevMonth} style={{ padding: '6px 12px' }}>
                ◀ Prev
              </button>
              <button className="btn-sm" onClick={handleNextMonth} style={{ padding: '6px 12px' }}>
                Next ▶
              </button>
            </div>
          </div>

          {/* Weekdays Header */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', fontWeight: 600, fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>
            {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => (
              <div key={day} style={{ padding: '6px 0' }}>{day}</div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 10 }}>
            {daysGrid.map((cell, idx) => {
              const cellItems = dateMap[cell.dateStr] || []
              const hasPTCheckin = cellItems.some(i => i.type === 'checkin' && i.with_pt)
              const hasActivity = cellItems.length > 0
              const isSelected = cell.dateStr === selectedDateStr
              const isToday = cell.dateStr === new Date().toISOString().slice(0, 10)

              let cellBg = 'var(--panel)'
              let cellColor = 'var(--text-strong)'
              let borderStyle = '1px solid var(--stroke)'

              if (hasPTCheckin) {
                cellBg = 'var(--accent-light)'
                cellColor = 'var(--text-strong)'
                borderStyle = '2px solid var(--accent)'
              } else if (hasActivity) {
                cellBg = '#eff6ff'
                cellColor = 'var(--text-strong)'
                borderStyle = '2px solid #3b82f6'
              }

              if (isSelected) {
                borderStyle = '3px solid var(--text-strong)'
              } else if (isToday) {
                borderStyle = '2px dashed var(--accent)'
              }

              return (
                <button
                  key={idx}
                  onClick={() => setSelectedDateStr(cell.dateStr)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    aspectRatio: '1',
                    borderRadius: 12,
                    background: cellBg,
                    color: cellColor,
                    border: borderStyle,
                    cursor: 'pointer',
                    fontSize: 14,
                    fontWeight: cell.isCurrentMonth ? 600 : 400,
                    opacity: cell.isCurrentMonth ? 1 : 0.35,
                    transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                    boxShadow: isSelected ? 'var(--shadow-medium)' : 'none',
                    transition: 'all 0.15s ease',
                    position: 'relative'
                  }}
                >
                  {cell.dayNum}
                </button>
              )
            })}
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: 16, marginTop: 24, padding: '12px 0 0', borderTop: '1px solid var(--stroke)', fontSize: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 14, height: 14, borderRadius: 4, background: 'var(--accent-light)', border: '2px solid var(--accent)' }} />
              <span style={{ fontWeight: 600 }}>Check-In with PT (Trainer Session)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 14, height: 14, borderRadius: 4, background: '#eff6ff', border: '2px solid #3b82f6' }} />
              <span style={{ fontWeight: 600 }}>Self Check-In / Workout Activity</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 14, height: 14, borderRadius: 4, background: 'var(--panel)', border: '1px solid var(--stroke)' }} />
              <span style={{ color: 'var(--muted)' }}>No Activity</span>
            </div>
          </div>
        </div>

        {/* Right Column: Workout Details on Selected Day */}
        <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Daily Activities Details
            </span>
            <h3 style={{ fontSize: 16, marginTop: 4, fontWeight: 700 }}>{formattedSelectedDate}</h3>
          </div>

          {loading ? (
            <div className="text-muted" style={{ padding: '24px 0', textAlign: 'center', fontStyle: 'italic' }}>
              Updating calendar logs...
            </div>
          ) : selectedItems.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {selectedItems.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: 16,
                    background: item.type === 'workout' ? 'var(--accent-light)' : 'var(--bg)',
                    borderRadius: 12,
                    border: item.type === 'workout' ? '1px solid var(--accent)' : '1px solid var(--stroke)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
                      {item.type === 'workout' ? '🏋️‍♂️ PT Workout Session' : '🔑 Gym Check-In'}
                    </span>
                    <span className="badge" style={{ background: item.type === 'workout' ? 'var(--accent)' : 'var(--chip)', color: item.type === 'workout' ? '#fff' : 'var(--text-strong)', fontSize: 11 }}>
                      {item.type === 'workout' ? 'With Trainer' : 'Self Workout'}
                    </span>
                  </div>

                  <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                    Time: <span style={{ fontWeight: 600, color: 'var(--text-strong)' }}>{new Date(item.occurred_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>

                  {item.method && (
                    <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                      Check-in Method: <span style={{ fontWeight: 600, color: 'var(--text-strong)' }}>{item.method}</span>
                    </div>
                  )}

                  {item.duration_min && (
                    <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                      Duration: <span style={{ fontWeight: 600, color: 'var(--text-strong)' }}>{item.duration_min} minutes</span>
                    </div>
                  )}

                  {item.intensity && (
                    <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                      Intensity: <span className="badge" style={{ fontSize: 11 }}>{item.intensity}</span>
                    </div>
                  )}

                  {item.rating != null && (
                    <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                      Rating: <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{'★'.repeat(item.rating) + '☆'.repeat(5 - item.rating)}</span>
                    </div>
                  )}

                  {item.notes && (
                    <div style={{ borderTop: '1px solid var(--stroke)', paddingTop: 8, marginTop: 4 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>Session Notes</div>
                      <p style={{ fontSize: 12, color: 'var(--text-strong)', fontStyle: 'italic', marginTop: 4, lineHeight: 1.4 }}>
                        "{item.notes}"
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0', border: '2px dashed var(--stroke)', borderRadius: 16 }}>
              <span style={{ fontSize: 32, marginBottom: 12 }}>💤</span>
              <p className="text-muted" style={{ fontStyle: 'italic', fontSize: 13, textAlign: 'center', padding: '0 20px' }}>
                No training or check-in activity recorded on this day.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
