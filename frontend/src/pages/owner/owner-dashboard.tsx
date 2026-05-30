import { useState, useEffect } from 'react'
import { apiGet } from '../../api/client'
import { pushNotification } from '../../hooks/use-notifications'

interface Package { price: number; status: string }
interface Staff { id: string }
interface Equipment { id: string }
interface Member { id: string; status: string }
interface CheckIn { id: string }

export default function OwnerDashboard() {
  const [stats, setStats] = useState({ packages: 0, staff: 0, equipment: 0, members: 0, checkins: 0 })

  useEffect(() => {
    Promise.all([
      apiGet<Package[]>('/packages'),
      apiGet<Staff[]>('/staff'),
      apiGet<Equipment[]>('/equipment'),
      apiGet<Member[]>('/members'),
      apiGet<CheckIn[]>('/check-ins'),
    ]).then(([pkg, stf, eqp, mbr, ci]) => {
      const s = {
        packages: pkg.filter((p) => p.status !== 'inactive').length,
        staff: stf.length,
        equipment: eqp.length,
        members: mbr.filter((m) => m.status !== 'inactive').length,
        checkins: ci.length,
      }
      setStats(s)
      if (s.checkins > 0) pushNotification('📋', `${s.checkins} check-ins recorded`)
      if (s.members > 0) pushNotification('👥', `${s.members} active members in the system`)
    }).catch(() => {})
  }, [])

  return (
    <div className="page-container">
      <div className="page-header"><h2>Owner Dashboard</h2></div>
      <div className="stats-grid">
        {[
          { label: 'Active Packages', value: stats.packages },
          { label: 'Staff', value: stats.staff },
          { label: 'Equipment Items', value: stats.equipment },
          { label: 'Active Members', value: stats.members },
          { label: 'Today Check-Ins', value: stats.checkins },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <span className="stat-value">{s.value}</span>
            <span className="stat-label">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
