import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/auth-context'
import { loginApi } from '../api/auth'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      const data = await loginApi(phone, password)
      login(data.token, data.user)
      navigate(`/${data.user.role}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    }
  }

  return (
    <div className="page-center">
      <form className="login-form" onSubmit={handleSubmit}>
        <h1>Gym Manager</h1>
        <p className="subtitle">Sign in to your account</p>
        {error && <p className="form-error">{error}</p>}
        <input
          placeholder="Phone number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit">Sign In</button>
        <p className="form-footer">
          Don't have an account? <Link to="/register">Create one</Link>
        </p>
      </form>
    </div>
  )
}
