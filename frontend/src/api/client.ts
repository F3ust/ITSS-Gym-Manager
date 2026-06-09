const API = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'

function getToken(): string | null {
  try {
    const raw = localStorage.getItem('auth')
    if (!raw) return null
    const auth = JSON.parse(raw)
    return auth?.token || null
  } catch {
    return null
  }
}

function getRole(): string | null {
  try {
    const raw = localStorage.getItem('auth')
    if (!raw) return null
    const auth = JSON.parse(raw)
    return auth?.user?.role || null
  } catch {
    return null
  }
}

function getHeaders(): HeadersInit {
  const headers: Record<string, string> = {}
  const token = getToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  const role = getRole()
  if (role) {
    headers['x-role'] = role
  }
  return headers
}

export async function apiGet<T = unknown>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: getHeaders(),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.message || `GET ${path} failed`)
  }
  return res.json()
}

export async function apiPost<T = unknown>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getHeaders() },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.message || `POST ${path} failed`)
  }
  return res.json()
}

export async function apiPatch<T = unknown>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...getHeaders() },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    const err = new Error(data.message || `PATCH ${path} failed`)
    ;(err as Error & { details?: unknown }).details = data.details
    throw err
  }
  return res.json()
}

export async function apiPut<T = unknown>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getHeaders() },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.message || `PUT ${path} failed`)
  }
  return res.json()
}

export async function apiDelete(path: string): Promise<void> {
  const res = await fetch(`${API}${path}`, {
    method: 'DELETE',
    headers: getHeaders(),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.message || `DELETE ${path} failed`)
  }
}
