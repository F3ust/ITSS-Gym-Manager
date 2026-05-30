import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

type Role = 'owner' | 'staff' | 'pt' | 'member'

interface AuthState {
  user: { id: string; name: string; role: Role } | null
  token: string | null
}

interface AuthContextType extends AuthState {
  login: (token: string, user: { id: string; name: string; role: string }) => void
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

function loadAuth(): AuthState {
  try {
    const raw = localStorage.getItem('auth')
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return { user: null, token: null }
}

function saveAuth(state: AuthState) {
  if (state.token) {
    localStorage.setItem('auth', JSON.stringify(state))
  } else {
    localStorage.removeItem('auth')
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>(loadAuth)

  const login = useCallback((token: string, user: { id: string; name: string; role: string }) => {
    const state = { token, user: user as { id: string; name: string; role: Role } }
    saveAuth(state)
    setAuth(state)
  }, [])

  const logout = useCallback(() => {
    saveAuth({ user: null, token: null })
    setAuth({ user: null, token: null })
  }, [])

  return (
    <AuthContext.Provider value={{ ...auth, login, logout, isAuthenticated: !!auth.token }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
