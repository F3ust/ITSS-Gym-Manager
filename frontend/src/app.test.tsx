import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from './contexts/auth-context'
import App from './App'

function renderApp(initialRoute = '/') {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>,
  )
}

test('redirects to login by default', () => {
  renderApp()
  expect(screen.getByText('Sign in to your account')).toBeInTheDocument()
})

test('shows login page at /login', () => {
  renderApp('/login')
  expect(screen.getByText('Sign in to your account')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
})

test('shows register page at /register', () => {
  renderApp('/register')
  expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument()
})

test('shows 404 page for unknown route', () => {
  renderApp('/unknown-route')
  expect(screen.getByText('404')).toBeInTheDocument()
})
