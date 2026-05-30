import { query } from '../db/query'

export async function logAudit(userId: string | null, action: string, details?: Record<string, unknown>) {
  try {
    await query(
      'INSERT INTO audit_logs (user_id, action, details) VALUES ($1, $2, $3)',
      [userId, action, details ? JSON.stringify(details) : null]
    )
  } catch (err) {
    console.error('Audit log failed:', err)
  }
}
