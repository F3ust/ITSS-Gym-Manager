import { useEffect, useState } from 'react'
import { useNotifications } from '../../hooks/use-notifications'
import { useAuth } from '../../contexts/auth-context'
import { apiGet } from '../../api/client'

export default function NotificationsPage() {
  const { user } = useAuth()
  const [memberId, setMemberId] = useState<string>()

  useEffect(() => {
    if (user?.role === 'member') {
      apiGet<{ id: string }>(`/members?userId=${user.id}`).then(m => setMemberId(m.id)).catch(() => {})
    }
  }, [user])

  const { items, markRead, clearAll } = useNotifications(memberId)

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Notifications</h2>
        {items.length > 0 && <button className="btn btn-secondary" onClick={clearAll}>Clear All</button>}
      </div>
      {items.length === 0 ? (
        <div className="card"><p className="text-muted">No notifications.</p></div>
      ) : (
        <div className="notif-list">
          {items.map(n => (
            <div key={n.id} className={`notif-item ${n.read ? 'notif-read' : 'notif-unread'}`} onClick={() => markRead(n.id)}>
              <span className="notif-icon">{n.icon}</span>
              <div className="notif-body">
                <p className="notif-msg">{n.message}</p>
                <span className="notif-time">{new Date(n.timestamp).toLocaleString()}</span>
              </div>
              {!n.read && <span className="notif-dot" />}
            </div>
          ))}
        </div>
      )}
      <style>{`
        .notif-list { display: flex; flex-direction: column; gap: 6px; }
        .notif-item { display: flex; align-items: center; gap: 12px; padding: 12px 14px; background: #fff; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); cursor: pointer; transition: background 0.15s; }
        .notif-item:hover { background: #fafafa; }
        .notif-unread { border-left: 3px solid #4A90D9; }
        .notif-read { opacity: 0.65; }
        .notif-icon { font-size: 20px; flex-shrink: 0; }
        .notif-body { flex: 1; min-width: 0; }
        .notif-msg { margin: 0; font-size: 14px; color: #333; }
        .notif-time { font-size: 11px; color: #999; }
        .notif-dot { width: 8px; height: 8px; border-radius: 50%; background: #4A90D9; flex-shrink: 0; }
      `}</style>
    </div>
  )
}
