import { Pool, type PoolConfig } from 'pg'

const poolUrl = process.env.DATABASE_POOL_URL || ''
const directUrl = process.env.DATABASE_URL || ''
const connectionString = poolUrl || directUrl
const poolMax = Number(process.env.PGPOOL_MAX) || 10
const connectionTimeoutMillis = Number(process.env.PGPOOL_CONNECTION_TIMEOUT) || 10000
const idleTimeoutMillis = Number(process.env.PGPOOL_IDLE_TIMEOUT) || 30000

const config: PoolConfig = connectionString
  ? { connectionString, max: poolMax, connectionTimeoutMillis, idleTimeoutMillis }
  : {
      host: process.env.PGHOST || 'localhost',
      port: Number(process.env.PGPORT || 5432),
      user: process.env.PGUSER || 'postgres',
      password: process.env.PGPASSWORD || 'postgres',
      database: process.env.PGDATABASE || 'gym_manager',
      max: poolMax,
      connectionTimeoutMillis,
      idleTimeoutMillis
    }

const sslMode = String(process.env.PGSSLMODE || process.env.DATABASE_SSL || '').toLowerCase()
if (sslMode === 'true' || sslMode === 'require' || sslMode === 'verify-full' || sslMode === 'verify-ca') {
  const rejectUnauthorized = process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false'
  config.ssl = { rejectUnauthorized }
}

const pool = new Pool(config)

export default pool
