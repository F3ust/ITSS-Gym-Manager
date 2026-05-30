require('dotenv/config')
const { Client } = require('pg')
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})
async function run() {
  await client.connect()
  await client.query("ALTER TABLE packages ADD COLUMN IF NOT EXISTS pt_session_count INTEGER")
  console.log('Migration: column pt_session_count added/exists')
  await client.end()
}
run().catch(e => { console.error(e.message); process.exit(1) })
