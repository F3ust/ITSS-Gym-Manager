import { query } from '../db/query'

const INTERVAL_MS = 60 * 60 * 1000
let timer: ReturnType<typeof setInterval> | null = null
let running = false

export function startExpiryChecker() {
  if (timer || process.env.NODE_ENV === 'test') return
  runCheck()
  timer = setInterval(runCheck, INTERVAL_MS)
  console.log('[ExpiryChecker] started — checking every 60 min')
}

export function stopExpiryChecker() {
  if (timer) { clearInterval(timer); timer = null }
}

async function runCheck() {
  if (running) return
  running = true
  try {
    await query(
      `INSERT INTO member_notifications (member_id, icon, message)
       SELECT s.member_id, '⚠️', 'Gói tập của bạn sắp hết hạn vào ngày mai!'
       FROM subscriptions s
       JOIN members m ON m.id = s.member_id
       WHERE s.end_date = CURRENT_DATE + 1
         AND s.status = 'active'
         AND NOT EXISTS (
           SELECT 1 FROM member_notifications mn
           WHERE mn.member_id = s.member_id
             AND mn.message LIKE '%h%E1%BA%A1n%'
             AND mn.created_at > CURRENT_DATE
         )`
    )
  } catch (err) {
    console.error('[ExpiryChecker] error:', String(err))
  } finally {
    running = false
  }
}
