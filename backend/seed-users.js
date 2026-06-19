require('dotenv').config()
const { randomBytes, scryptSync } = require('crypto')
const { Pool } = require('pg')

const connectionString = process.env.DATABASE_URL
const sslMode = String(process.env.PGSSLMODE || process.env.DATABASE_SSL || '').toLowerCase()
const rejectUnauthorized = process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false'

const config = {
  connectionString,
}
if (sslMode === 'true' || sslMode === 'require' || sslMode === 'verify-full' || sslMode === 'verify-ca') {
  config.ssl = { rejectUnauthorized }
}

const pool = new Pool(config)

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

const accounts = [
  { username: '1111111111', password: 'owner67890', role: 'Owner',  name: 'Chủ sở hữu 2',    table: null },
  { username: '2222222222', password: 'staff67890', role: 'Staff',  name: 'Nhân viên 2',     table: 'staff', profileCol: 'full_name' },
  { username: '3333333333', password: 'pt67890123', role: 'PT',     name: 'HLV cá nhân 2',   table: 'pt_profiles', profileCol: 'full_name' },
  { username: '4444444444', password: 'member5678', role: 'Member', name: 'Hội viên mới',    table: 'members', profileCol: 'full_name' },
]

async function main() {
  const client = await pool.connect()
  try {
    for (const acc of accounts) {
      const existing = await client.query('SELECT id FROM users WHERE username = $1', [acc.username])
      if (existing.rows[0]) { console.log(`SKIP ${acc.username} - already exists`); continue }

      await client.query('BEGIN')
      const userRes = await client.query('INSERT INTO users (username, password_hash) VALUES ($1,$2) RETURNING id', [acc.username, hashPassword(acc.password)])
      const userId = userRes.rows[0].id
      const roleRes = await client.query('SELECT id FROM roles WHERE name = $1', [acc.role])
      if (!roleRes.rows[0]) { console.log(`SKIP ${acc.username} - role ${acc.role} not found`); await client.query('ROLLBACK'); continue }
      await client.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1,$2)', [userId, roleRes.rows[0].id])

      if (acc.role === 'Owner') {
        // no profile table needed
      } else if (acc.role === 'Staff') {
        await client.query('INSERT INTO staff (user_id, full_name, role_title) VALUES ($1,$2,$3)', [userId, acc.name, 'Nhân viên'])
      } else if (acc.role === 'PT') {
        await client.query('INSERT INTO pt_profiles (user_id, full_name) VALUES ($1,$2)', [userId, acc.name])
      } else if (acc.role === 'Member') {
        await client.query(`INSERT INTO members (user_id, full_name, phone, dob, job, member_type, status) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [userId, acc.name, acc.username, '2000-01-01', 'Nhân viên văn phòng', 'regular', 'active'])
      }
      await client.query('COMMIT')
      console.log(`CREATED ${acc.username} (${acc.role}) - ${acc.name}`)
    }
  } catch (err) {
    console.error('ERROR:', err.message)
    await client.query('ROLLBACK').catch(() => {})
  } finally {
    client.release()
    await pool.end()
  }
}

main()
