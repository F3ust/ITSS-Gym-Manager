import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/auth-context'
import { registerApi } from '../api/auth'

export default function CreateAccountPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', phone: '', password: '', dob: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }))

  function validateDob(dob: string): string | null {
    if (!dob) return 'Date of birth is required'
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dob)) return 'Date of birth must be in dd/MM/yyyy format'
    const [d, m, y] = dob.split('/').map(Number)
    if (m < 1 || m > 12 || d < 1 || d > 31) return 'Invalid date'
    const dobDate = new Date(y, m - 1, d)
    const today = new Date()
    let age = today.getFullYear() - dobDate.getFullYear()
    const mDiff = today.getMonth() - dobDate.getMonth()
    if (mDiff < 0 || (mDiff === 0 && today.getDate() < dobDate.getDate())) age--
    if (age < 16) return 'You must be at least 16 years old to register'
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const dobErr = validateDob(form.dob)
    if (dobErr) { setError(dobErr); return }
    setSubmitting(true)
    try {
      const data = await registerApi(form)
      login(data.token, data.user)
      navigate(`/${data.user.role}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
      setSubmitting(false)
    }
  }

  return (
    <div className="page-center">
      <form className="login-form" onSubmit={handleSubmit}>
        <h1>Create Account</h1>
        <p className="subtitle">Join the gym today</p>
        {error && <p className="form-error">{error}</p>}
        <div className="form-group">
          <label htmlFor="reg-name">Full Name</label>
          <input
            id="reg-name"
            placeholder="Enter your full name"
            value={form.name}
            onChange={update('name')}
            required
            disabled={submitting}
          />
        </div>
        <div className="form-group">
          <label htmlFor="reg-phone">Phone Number</label>
          <input
            id="reg-phone"
            placeholder="e.g. 0912345678"
            value={form.phone}
            onChange={update('phone')}
            required
            disabled={submitting}
          />
        </div>
        <div className="form-group">
          <label htmlFor="reg-password">Password</label>
          <input
            id="reg-password"
            type="password"
            placeholder="Min 8 chars, letters + numbers"
            value={form.password}
            onChange={update('password')}
            required
            disabled={submitting}
          />
        </div>
        <div className="form-group">
          <label htmlFor="reg-dob">Date of Birth</label>
          <input
            id="reg-dob"
            placeholder="dd/MM/yyyy (e.g. 15/08/1998)"
            value={form.dob}
            onChange={update('dob')}
            required
            disabled={submitting}
          />
        </div>
        <button type="submit" style={{ marginTop: 8 }} disabled={submitting}>
          {submitting ? 'Registering...' : 'Register'}
        </button>
        <p className="form-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </form>
    </div>
  )
}
