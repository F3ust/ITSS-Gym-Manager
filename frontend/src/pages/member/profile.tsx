import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/auth-context'
import { apiGet, apiPatch } from '../../api/client'

interface MemberProfile {
  id: string; full_name: string; phone: string; email: string | null;
  dob: string; job: string; member_type: string; status: string
}



export default function ProfilePage() {
  const { user, updateUser } = useAuth()
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
      updateUser(updated.full_name)
      setEditing(false)
      setMsg({ text: 'Profile updated successfully', type: 'success' })
    } catch { setMsg({ text: 'Failed to save profile', type: 'error' }) }
    setSaving(false)
  }

  function setVal<K extends keyof MemberProfile>(k: K, v: MemberProfile[K]) {
    setForm(p => ({ ...p, [k]: v }))
  }

  // Calculate profile completion percentage
  const getCompletionPercent = () => {
    if (!profile) return 0
    let points = 0
    let total = 5
    if (profile.full_name) points++
    if (profile.email) points++
    if (profile.phone) points++
    if (profile.dob) points++
    if (profile.job) points++
    return Math.round((points / total) * 100)
  }

  if (loading) return (
    <div className="page-container" style={{ maxWidth: 800, margin: '0 auto' }}>
      <div className="pr-skeleton">
        <div className="pr-skeleton-avatar" />
        <div className="pr-skeleton-line" style={{ width: '60%', margin: '0 auto' }} />
        <div className="pr-skeleton-line" style={{ width: '40%', margin: '0 auto' }} />
      </div>
    </div>
  )
  if (!profile) return <div className="page-container"><p>Profile not found. Register as a member first.</p></div>

  const completionPercent = getCompletionPercent()

  return (
    <div className="page-container" style={{ maxWidth: 1000, margin: '0 auto', width: '100%', padding: '0 16px' }}>
      
      {/* Design Read: Member profile page for fitness club members, with a clean consumer-dashboard language, leaning toward a structured layout with overlapping header, progress tracker, and grid-aligned account details. */}
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        
        {/* Page Header (Clean typography & badges instead of cover/avatar) */}
        <div className="pr-page-header">
          <div className="pr-header-content">
            <div className="pr-welcome-tag">Profile Workspace</div>
            <h1 className="pr-welcome-title">{profile.full_name}</h1>
            <div className="pr-header-badges">
              <span className={`pr-status pr-status-${profile.status.toLowerCase()}`}>{profile.status}</span>
              <span className="pr-type">{profile.member_type}</span>
            </div>
          </div>
          {!editing && (
            <button className="btn-primary pr-edit-btn" onClick={startEdit}>
              Edit Profile
            </button>
          )}
        </div>

        {/* Success / Error Message Alert */}
        {msg && (
          <div className={`pr-alert pr-alert-${msg.type}`}>
            <span className="pr-alert-icon">{msg.type === 'success' ? '✓' : '!'}</span>
            <span style={{ fontWeight: 500 }}>{msg.text}</span>
          </div>
        )}

        {/* 2-Column Content Layout */}
        <div className="pr-content-grid">
          
          {/* Left Column: Account Details Form / View */}
          <div className="card" style={{ padding: '28px 32px' }}>
            <h3 className="pr-card-title">{editing ? 'Edit Account Info' : 'Account Details'}</h3>
            
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
                <label className="pr-label">Email Address</label>
                {editing ? (
                  <input
                    className="pr-input" type="email" value={form.email || ''}
                    onChange={e => setVal('email', e.target.value)}
                    placeholder="e.g. user@example.com"
                  />
                ) : (
                  <span className="pr-value" style={{ color: profile.email ? 'var(--text-strong)' : 'var(--muted)' }}>
                    {profile.email || 'Not specified'}
                  </span>
                )}
              </div>
              <div className="pr-field">
                <label className="pr-label">Phone Number</label>
                {editing ? (
                  <div>
                    <input
                      className="pr-input" type="tel" value={form.phone || ''}
                      onChange={e => setVal('phone', e.target.value)}
                    />
                    <div className="pr-note">Changing your phone number affects credentials.</div>
                  </div>
                ) : (
                  <span className="pr-value">{profile.phone}</span>
                )}
              </div>
              <div className="pr-field">
                <label className="pr-label">Birth Date</label>
                {editing ? (
                  <input
                    className="pr-input" type="date" value={form.dob ? form.dob.slice(0, 10) : ''}
                    onChange={e => setVal('dob', e.target.value)}
                  />
                ) : (
                  <span className="pr-value">
                    {profile.dob ? new Date(profile.dob).toLocaleDateString('en-US', { dateStyle: 'long' }) : 'Not specified'}
                  </span>
                )}
              </div>
              <div className="pr-field" style={{ gridColumn: editing ? 'span 2' : 'span 1' }}>
                <label className="pr-label">Occupation / Job</label>
                {editing ? (
                  <input
                    className="pr-input" type="text" value={form.job || ''}
                    onChange={e => setVal('job', e.target.value)}
                    placeholder="e.g. Software Engineer"
                  />
                ) : (
                  <span className="pr-value" style={{ color: profile.job ? 'var(--text-strong)' : 'var(--muted)' }}>
                    {profile.job || 'Not specified'}
                  </span>
                )}
              </div>
              {!editing && (
                <div className="pr-field">
                  <label className="pr-label">Membership Tier</label>
                  <span className="pr-value" style={{ textTransform: 'capitalize', fontWeight: 600 }}>{profile.member_type}</span>
                </div>
              )}
            </div>

            {editing && (
              <div className="pr-actions" style={{ display: 'flex', gap: 12, marginTop: 28, borderTop: '1px solid var(--stroke)', paddingTop: 20 }}>
                <button className="btn-primary" onClick={saveEdit} disabled={saving} style={{ padding: '10px 24px' }}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button className="btn-secondary" onClick={cancelEdit} disabled={saving} style={{ padding: '10px 24px', background: 'transparent', border: '1px solid var(--stroke)' }}>
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* Right Column: Widgets */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            
            {/* Profile Completion Indicator */}
            <div className="card" style={{ padding: '24px 28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-strong)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Profile Completion</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent)' }}>{completionPercent}%</span>
              </div>
              <div style={{ height: 8, width: '100%', background: 'var(--stroke)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width: `${completionPercent}%`, height: '100%', background: 'var(--accent)', borderRadius: 4, transition: 'width 0.5s ease-out' }} />
              </div>
              {completionPercent < 100 ? (
                <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 12, lineHeight: 1.5 }}>
                  Add your email, birth date, and job to reach 100% and unlock personalized fitness recommendations.
                </p>
              ) : (
                <p style={{ fontSize: 12, color: '#059669', marginTop: 12, lineHeight: 1.5, fontWeight: 500 }}>
                  ✓ Your profile is fully complete!
                </p>
              )}
            </div>

            {/* Quick Membership Status Card */}
            <div className="card" style={{ padding: '24px 28px' }}>
              <h4 style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', margin: '0 0 16px' }}>Membership Status</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--stroke)', paddingBottom: 10 }}>
                  <span style={{ fontSize: 13, color: 'var(--muted)' }}>Account Status</span>
                  <span className={`pr-status pr-status-${profile.status.toLowerCase()}`} style={{ margin: 0 }}>{profile.status}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--stroke)', paddingBottom: 10 }}>
                  <span style={{ fontSize: 13, color: 'var(--muted)' }}>Member Tier</span>
                  <span style={{ fontSize: 13, fontWeight: 600, textTransform: 'capitalize' }}>{profile.member_type}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: 'var(--muted)' }}>Verification</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#059669' }}>Verified Member</span>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>

      <style>{`
        .pr-page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          border-bottom: 1px solid var(--stroke);
          padding-bottom: 24px;
          margin-bottom: 8px;
        }
        .pr-header-content {
          display: flex;
          flex-direction: column;
        }
        .pr-welcome-tag {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--accent);
          margin-bottom: 6px;
        }
        .pr-welcome-title {
          font-size: 32px;
          font-weight: 700;
          margin: 0 0 12px;
          letter-spacing: -0.02em;
          color: var(--text-strong);
        }
        .pr-header-badges {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .pr-status {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 9999px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .pr-status-active {
          background: #d1fae5;
          color: #065f46;
        }
        .pr-status-inactive {
          background: #fee2e2;
          color: #991b1b;
        }
        .pr-type {
          font-size: 11px;
          color: var(--muted);
          font-weight: 700;
          background: var(--chip);
          padding: 4px 12px;
          border-radius: 9999px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .pr-edit-btn {
          margin-bottom: 8px;
          font-weight: 600;
          font-size: 13px;
          padding: 10px 20px;
          border-radius: 10px;
        }
        .pr-alert {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 20px;
          border-radius: 12px;
          font-size: 14px;
        }
        .pr-alert-success {
          background: #ecfdf5;
          color: #047857;
          border: 1px solid #a7f3d0;
        }
        .pr-alert-error {
          background: #fef2f2;
          color: #b91c1c;
          border: 1px solid #fca5a5;
        }
        .pr-alert-icon {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 700;
          flex-shrink: 0;
        }
        .pr-alert-success .pr-alert-icon {
          background: #34d399;
          color: #fff;
        }
        .pr-alert-error .pr-alert-icon {
          background: #f87171;
          color: #fff;
        }
        .pr-content-grid {
          display: grid;
          grid-template-columns: 1.8fr 1fr;
          gap: 24px;
          align-items: start;
        }
        .pr-card-title {
          font-size: 16px;
          margin: 0 0 24px;
          padding-bottom: 14px;
          border-bottom: 1px solid var(--stroke);
          color: var(--text-strong);
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .pr-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px 24px;
        }
        .pr-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .pr-label {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--muted);
        }
        .pr-value {
          font-size: 15px;
          color: var(--text-strong);
          padding: 8px 12px;
          background: var(--bg);
          border-radius: 8px;
          border: 1px solid transparent;
          font-weight: 500;
        }
        .pr-input {
          padding: 10px 14px;
          border: 1px solid var(--stroke);
          border-radius: 8px;
          font-size: 14px;
          width: 100%;
          background: var(--panel);
          color: var(--text-strong);
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .pr-input:focus {
          outline: none;
          border-color: var(--accent);
          box-shadow: 0 0 0 3px var(--accent-light);
        }
        .pr-note {
          margin-top: 6px;
          padding: 8px 12px;
          background: #fffbeb;
          border: 1px solid #fef3c7;
          border-radius: 8px;
          font-size: 11px;
          color: #b45309;
          line-height: 1.4;
        }
        .pr-skeleton {
          padding: 40px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
          background: var(--panel);
          border-radius: 16px;
          border: 1px solid var(--stroke);
        }
        .pr-skeleton-avatar {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: linear-gradient(90deg, var(--chip) 25%, var(--stroke) 50%, var(--chip) 75%);
          background-size: 200% 100%;
          animation: prShimmer 1.5s infinite;
        }
        .pr-skeleton-line {
          height: 16px;
          border-radius: 8px;
          background: linear-gradient(90deg, var(--chip) 25%, var(--stroke) 50%, var(--chip) 75%);
          background-size: 200% 100%;
          animation: prShimmer 1.5s infinite;
        }
        @keyframes prShimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @media (max-width: 768px) {
          .pr-content-grid {
            grid-template-columns: 1fr;
          }
          .pr-head-body {
            flex-direction: column;
            align-items: center;
            text-align: center;
            padding: 24px;
          }
          .pr-head-left {
            flex-direction: column;
            align-items: center;
            gap: 16px;
            margin-top: -60px;
          }
          .pr-head-info {
            padding-bottom: 0;
          }
          .pr-head-meta {
            justify-content: center;
          }
          .pr-edit-btn {
            width: 100%;
            margin-top: 12px;
          }
          .pr-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  )
}
