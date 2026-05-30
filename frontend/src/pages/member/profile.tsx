import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/auth-context'
import { apiGet, apiPatch } from '../../api/client'

interface MemberProfile {
  id: string; full_name: string; phone: string; email: string | null;
  dob: string; job: string; member_type: string; status: string
}

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

export default function ProfilePage() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<MemberProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<Partial<MemberProfile>>({})
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    if (!user) return
    apiGet<MemberProfile>(`/members?userId=${user.id}`).then((data) => {
      if (data) { setProfile(data); setForm({ ...data }) }
    }).catch(() => {}).finally(() => setLoading(false))
  }, [user])

  function startEdit() { setMsg(null); setEditing(true); setForm({ ...profile! }) }
  function cancelEdit() { setMsg(null); setEditing(false); setForm({ ...profile! }) }

  async function saveEdit() {
    setSaving(true); setMsg(null)
    try {
      const updated = await apiPatch<MemberProfile>('/members/' + profile!.id, {
        fullName: form.full_name,
        email: form.email || null,
        phone: form.phone,
        dob: form.dob,
        job: form.job,
      })
      setProfile(updated)
      setEditing(false)
      setMsg({ text: 'Profile updated successfully', type: 'success' })
    } catch { setMsg({ text: 'Failed to save profile', type: 'error' }) }
    setSaving(false)
  }

  function setVal<K extends keyof MemberProfile>(k: K, v: MemberProfile[K]) {
    setForm(p => ({ ...p, [k]: v }))
  }

  if (loading) return (
    <div className="page-container">
      <div className="pr-skeleton">
        <div className="pr-skeleton-avatar" />
        <div className="pr-skeleton-line" style={{ width: '60%' }} />
        <div className="pr-skeleton-line" style={{ width: '40%' }} />
      </div>
    </div>
  )
  if (!profile) return <div className="page-container"><p>Profile not found. Register as a member first.</p></div>

  return (
    <div className="page-container">
      <div className="pr-wrapper">
        <div className="pr-cover" />

        <div className="pr-head">
          <div className="pr-avatar">{getInitials(profile.full_name)}</div>
          <div className="pr-head-info">
            <h2 className="pr-name">{profile.full_name}</h2>
            <div className="pr-head-meta">
              <span className={`pr-status pr-status-${profile.status}`}>{profile.status}</span>
              <span className="pr-type">{profile.member_type}</span>
            </div>
          </div>
          {!editing && (
            <button className="btn btn-primary pr-edit-btn" onClick={startEdit}>Edit Profile</button>
          )}
        </div>

        {msg && (
          <div className={`pr-alert pr-alert-${msg.type}`}>
            <span className="pr-alert-icon">{msg.type === 'success' ? '✓' : '!'}</span>
            {msg.text}
          </div>
        )}

        <div className="pr-card">
          <h3 className="pr-card-title">{editing ? 'Edit Information' : 'Personal Information'}</h3>
          <div className="pr-grid">
            <div className="pr-field">
              <label className="pr-label">Full Name</label>
              {editing ? (
                <input
                  className="pr-input" type="text" value={form.full_name || ''}
                  onChange={e => setVal('full_name', e.target.value)}
                />
              ) : (
                <span className="pr-value">{profile.full_name}</span>
              )}
            </div>
            <div className="pr-field">
              <label className="pr-label">Email</label>
              {editing ? (
                <input
                  className="pr-input" type="email" value={form.email || ''}
                  onChange={e => setVal('email', e.target.value)}
                />
              ) : (
                <span className="pr-value">{profile.email || '-'}</span>
              )}
            </div>
            <div className="pr-field">
              <label className="pr-label">Phone</label>
              {editing ? (
                <div>
                  <input
                    className="pr-input" type="tel" value={form.phone || ''}
                    onChange={e => setVal('phone', e.target.value)}
                  />
                  <div className="pr-note">Changing phone number will affect your login</div>
                </div>
              ) : (
                <span className="pr-value">{profile.phone}</span>
              )}
            </div>
            <div className="pr-field">
              <label className="pr-label">Date of Birth</label>
              {editing ? (
                <input
                  className="pr-input" type="date" value={form.dob ? form.dob.slice(0, 10) : ''}
                  onChange={e => setVal('dob', e.target.value)}
                />
              ) : (
                <span className="pr-value">{profile.dob ? profile.dob.slice(0, 10) : '-'}</span>
              )}
            </div>
            <div className="pr-field">
              <label className="pr-label">Job</label>
              {editing ? (
                <input
                  className="pr-input" type="text" value={form.job || ''}
                  onChange={e => setVal('job', e.target.value)}
                />
              ) : (
                <span className="pr-value">{profile.job || '-'}</span>
              )}
            </div>
            <div className="pr-field">
              <label className="pr-label">Member Type</label>
              <span className="pr-value">{profile.member_type}</span>
            </div>
          </div>
        </div>

        {editing && (
          <div className="pr-actions">
            <button className="btn btn-primary" onClick={saveEdit} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button className="btn btn-secondary" onClick={cancelEdit} disabled={saving}>
              Cancel
            </button>
          </div>
        )}
      </div>

      <style>{`
        .pr-wrapper { max-width: 720px; }
        .pr-cover {
          height: 100px; background: linear-gradient(135deg, var(--accent), #e07a5f);
          border-radius: 14px 14px 0 0; margin-bottom: -50px;
        }
        .pr-head {
          display: flex; align-items: center; gap: 20px;
          padding: 0 24px; position: relative; z-index: 1;
        }
        .pr-avatar {
          width: 88px; height: 88px; border-radius: 50%;
          background: var(--accent); color: var(--button-text);
          display: flex; align-items: center; justify-content: center;
          font-size: 28px; font-weight: 700; font-family: 'Fraunces', serif;
          border: 4px solid var(--bg); flex-shrink: 0;
        }
        .pr-head-info { flex: 1; padding-bottom: 4px; }
        .pr-name { font-family: 'Fraunces', serif; font-size: 24px; font-weight: 600; margin: 0 0 4px; }
        .pr-head-meta { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
        .pr-status {
          display: inline-block; padding: 3px 12px; border-radius: 20px;
          font-size: 12px; font-weight: 600; text-transform: capitalize;
        }
        .pr-status-active { background: #e8f5e9; color: #2e7d32; }
        .pr-status-inactive { background: #fef3e2; color: #b76e2e; }
        .pr-type {
          font-size: 13px; color: var(--muted);
          background: var(--chip); padding: 3px 12px; border-radius: 20px;
        }
        .pr-edit-btn { align-self: center; margin-bottom: 4px; }
        .pr-alert {
          display: flex; align-items: center; gap: 10px;
          margin: 20px 24px 0; padding: 12px 16px; border-radius: 12px;
          font-size: 14px;
        }
        .pr-alert-success { background: #e8f5e9; color: #2e7d32; border: 1px solid #c8e6c9; }
        .pr-alert-error { background: #fef3e2; color: #b76e2e; border: 1px solid #ffe0b2; }
        .pr-alert-icon {
          width: 24px; height: 24px; border-radius: 50%; display: flex;
          align-items: center; justify-content: center; font-size: 13px; font-weight: 700;
          flex-shrink: 0;
        }
        .pr-alert-success .pr-alert-icon { background: #c8e6c9; color: #2e7d32; }
        .pr-alert-error .pr-alert-icon { background: #ffe0b2; color: #b76e2e; }
        .pr-card {
          margin: 20px 24px 0; background: var(--panel); border: 1px solid var(--stroke);
          border-radius: 14px; padding: 28px; box-shadow: var(--shadow-soft);
        }
        .pr-card-title {
          font-family: 'Fraunces', serif; font-size: 18px; margin: 0 0 24px;
          padding-bottom: 16px; border-bottom: 1px solid var(--stroke);
        }
        .pr-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px 32px; }
        .pr-field { display: flex; flex-direction: column; gap: 6px; }
        .pr-label {
          font-size: 12px; font-weight: 600; text-transform: uppercase;
          letter-spacing: 0.08em; color: var(--muted);
        }
        .pr-value {
          font-size: 15px; color: var(--text-strong); padding: 4px 0;
          font-family: 'Fraunces', serif;
        }
        .pr-input {
          padding: 10px 14px; border: 1px solid var(--stroke);
          border-radius: 10px; font-size: 14px; width: 100%;
          background: var(--bg); color: var(--text-strong);
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .pr-input:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px rgba(193,84,47,0.12); }
        .pr-note {
          margin-top: 6px; padding: 8px 12px; background: var(--chip);
          border-radius: 8px; font-size: 12px; color: var(--muted); line-height: 1.4;
        }
        .pr-actions {
          display: flex; gap: 12px; padding: 0 24px; margin-top: 4px;
        }
        .pr-skeleton {
          padding: 32px 24px; display: flex; flex-direction: column;
          align-items: center; gap: 20px;
        }
        .pr-skeleton-avatar {
          width: 88px; height: 88px; border-radius: 50%;
          background: linear-gradient(90deg, var(--chip) 25%, var(--stroke) 50%, var(--chip) 75%);
          background-size: 200% 100%; animation: prShimmer 1.5s infinite;
        }
        .pr-skeleton-line {
          height: 16px; border-radius: 8px;
          background: linear-gradient(90deg, var(--chip) 25%, var(--stroke) 50%, var(--chip) 75%);
          background-size: 200% 100%; animation: prShimmer 1.5s infinite;
        }
        @keyframes prShimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        @media (max-width: 640px) {
          .pr-grid { grid-template-columns: 1fr; }
          .pr-head { flex-wrap: wrap; }
          .pr-edit-btn { width: 100%; margin-top: 4px; }
          .pr-card { padding: 20px; margin-left: 16px; margin-right: 16px; }
          .pr-alert { margin-left: 16px; margin-right: 16px; }
          .pr-actions { padding: 0 16px; }
        }
      `}</style>
    </div>
  )
}
