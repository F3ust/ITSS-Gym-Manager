import { useState, useEffect } from 'react'
import { apiGet } from '../../api/client'
import { useAuth } from '../../contexts/auth-context'

interface Assignment { id: string; pt_id: string; member_id: string; status: string }
interface Member { id: string; full_name: string; phone: string; member_type: string }

export default function AssignedMembersPage() {
  const { user } = useAuth()
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [members, setMembers] = useState<Map<string, Member>>(new Map())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    setLoading(true)
    apiGet<{ id: string }>('/pt/profile?userId=' + user.id)
      .then(async (profile) => {
        if (profile?.id) {
          const [asgn, mems] = await Promise.all([
            apiGet<Assignment[]>('/pt/assignments?ptId=' + profile.id),
            apiGet<Member[]>('/members'),
          ])
          setAssignments(asgn.filter((a) => a.status !== 'inactive'))
          setMembers(new Map(mems.map((m: Member) => [m.id, m])))
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user])

  if (loading) return <div className="page-loading">Loading...</div>

  return (
    <div className="page-container">
      <div className="page-header"><h2>Assigned Members</h2></div>
      <table className="data-table">
        <thead><tr><th>Name</th><th>Phone</th><th>Type</th><th>Status</th></tr></thead>
        <tbody>
          {assignments.map((a) => {
            const m = members.get(a.member_id)
            return (
              <tr key={a.id}>
                <td>{m?.full_name || 'Unknown'}</td>
                <td>{m?.phone || '-'}</td>
                <td><span className="badge">{m?.member_type || '-'}</span></td>
                <td><span className={`badge badge-${a.status}`}>{a.status}</span></td>
              </tr>
            )
          })}
          {assignments.length === 0 && <tr><td colSpan={4} className="table-empty">No assigned members</td></tr>}
        </tbody>
      </table>
    </div>
  )
}
