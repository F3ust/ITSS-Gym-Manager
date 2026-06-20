import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi, test, expect } from 'vitest'
import LoginPage from './login'
import { AuthProvider } from '../contexts/auth-context'
import * as authApi from '../api/auth'

// Mock the loginApi function
vi.mock('../api/auth', () => ({
  loginApi: vi.fn(),
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

function renderLoginPage() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    </MemoryRouter>
  )
}

test('renders login form inputs and button', () => {
  renderLoginPage()
  expect(screen.getByLabelText('Phone Number')).toBeInTheDocument()
  expect(screen.getByLabelText('Password')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
})

test('allows typing in phone and password fields', () => {
  renderLoginPage()
  const phoneInput = screen.getByLabelText('Phone Number') as HTMLInputElement
  const passwordInput = screen.getByLabelText('Password') as HTMLInputElement

  fireEvent.change(phoneInput, { target: { value: '1234567890' } })
  fireEvent.change(passwordInput, { target: { value: 'password123' } })

  expect(phoneInput.value).toBe('1234567890')
  expect(passwordInput.value).toBe('password123')
})

test('calls loginApi and navigates on successful submit', async () => {
  const mockUser = { id: '1', name: 'Test Owner', role: 'owner' }
  vi.mocked(authApi.loginApi).mockResolvedValueOnce({
    token: 'mock-token',
    user: mockUser,
  })

  renderLoginPage()
  const phoneInput = screen.getByLabelText('Phone Number')
  const passwordInput = screen.getByLabelText('Password')
  const submitButton = screen.getByRole('button', { name: /sign in/i })

  fireEvent.change(phoneInput, { target: { value: '1111111111' } })
  fireEvent.change(passwordInput, { target: { value: 'owner67890' } })
  fireEvent.click(submitButton)

  await waitFor(() => {
    expect(authApi.loginApi).toHaveBeenCalledWith('1111111111', 'owner67890')
    expect(mockNavigate).toHaveBeenCalledWith('/owner')
  })
})

test('displays error message on login failure', async () => {
  vi.mocked(authApi.loginApi).mockRejectedValueOnce(new Error('Invalid phone or password'))

  renderLoginPage()
  const phoneInput = screen.getByLabelText('Phone Number')
  const passwordInput = screen.getByLabelText('Password')
  const submitButton = screen.getByRole('button', { name: /sign in/i })

  fireEvent.change(phoneInput, { target: { value: '1111111111' } })
  fireEvent.change(passwordInput, { target: { value: 'wrongpass' } })
  fireEvent.click(submitButton)

  await waitFor(() => {
    expect(screen.getByText('Invalid phone or password')).toBeInTheDocument()
  })
})
