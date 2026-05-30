import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/auth-context'

type Role = 'owner' | 'staff' | 'pt' | 'member'

interface Props {
  requiredRole: Role
  children: React.ReactNode
}

export function RouteGuard({ requiredRole, children }: Props) {
  const { isAuthenticated, user } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (user?.role !== requiredRole) {
    return <Navigate to={`/${user?.role}`} replace />
  }

  return <>{children}</>
}
