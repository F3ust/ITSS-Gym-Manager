import { useState, useEffect, useCallback } from 'react'
import { apiGet, apiPatch, apiDelete } from '../api/client'

const STORAGE_KEY = 'gym_notifications'
const POLL_MS = 30000

export interface AppNotification {
  id: string
  icon: string
  message: string
  timestamp: string
  read: boolean
}

function loadLocal(): AppNotification[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') }
  catch { return [] }
}

function saveLocal(ns: AppNotification[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ns))
}

function mapDbRow(row: any): AppNotification {
  return { id: row.id, icon: row.icon, message: row.message, timestamp: row.created_at, read: row.read }
}

export function pushNotification(icon: string, message: string) {
  const all = loadLocal()
  const exists = all.some(n => n.message === message)
  if (exists) return
  all.unshift({ id: crypto.randomUUID(), icon, message, timestamp: new Date().toISOString(), read: false })
  saveLocal(all)
  window.dispatchEvent(new Event('storage'))
}

export function useNotifications(memberId?: string) {
  const [items, setItems] = useState<AppNotification[]>(() => memberId ? [] : loadLocal())

  const fetchRemote = useCallback(async () => {
    if (!memberId) return
    try {
      const data = await apiGet<any[]>(`/notifications?memberId=${memberId}`)
      setItems((data || []).map(mapDbRow))
    } catch { /* ignore */ }
  }, [memberId])

  useEffect(() => {
    if (memberId) {
      fetchRemote()
      const interval = setInterval(fetchRemote, POLL_MS)
      return () => clearInterval(interval)
    }
  }, [memberId, fetchRemote])

  useEffect(() => {
    if (!memberId) {
      const handler = () => setItems(loadLocal())
      window.addEventListener('storage', handler)
      setItems(loadLocal())
      return () => window.removeEventListener('storage', handler)
    }
  }, [memberId])

  async function markRead(id: string) {
    if (memberId) {
      try { await apiPatch(`/notifications/${id}/read`, {}) } catch { /* ignore */ }
      setItems(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    } else {
      const all = loadLocal()
      const n = all.find(n => n.id === id)
      if (n) { n.read = true; saveLocal(all); setItems([...all]) }
    }
  }

  async function clearAll() {
    if (memberId) {
      try { await apiDelete(`/notifications?memberId=${memberId}`) } catch { /* ignore */ }
      setItems([])
    } else {
      saveLocal([])
      setItems([])
    }
  }

  const unreadCount = () => items.filter(n => !n.read).length

  return { items, markRead, clearAll, unreadCount, refresh: fetchRemote }
}
