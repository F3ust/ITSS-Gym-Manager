import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/auth-context'

export default function NotFound() {
  const { user } = useAuth()
  const home = user ? `/${user.role}` : '/login'

  return (
    <div className="page-center">
      <h1>404</h1>
      <p>Page not found.</p>
      <Link to={home}>Go home</Link>
    </div>
  )
}
