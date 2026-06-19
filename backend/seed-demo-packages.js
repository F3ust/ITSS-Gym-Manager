const { Pool } = require('pg')
require('dotenv').config()

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:Lolbrowtf123%40@db.fmskdmmtrdewuyjssoxu.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
})

const packages = [
  // 1. Gym Entry (membership)
  {
    name: '1-Month Basic Membership',
    duration_days: 30,
    price: 300000,
    category: 'membership',
    pt_session_count: null,
    description: 'Unlimited gym access for 30 days. Standard access to all workout zones.'
  },
  {
    name: '3-Month Standard Membership',
    duration_days: 90,
    price: 800000,
    category: 'membership',
    pt_session_count: null,
    description: 'Unlimited gym access for 90 days. Save more compared to the monthly plan.'
  },
  {
    name: '6-Month Premium Membership',
    duration_days: 180,
    price: 1400000,
    category: 'membership',
    pt_session_count: null,
    description: 'Unlimited gym access for 180 days. Ideal for committed fitness enthusiasts.'
  },

  // 2. Personal Training (pt)
  {
    name: '10-Session Personal Training',
    duration_days: 30, // Default duration required by DB, but check-in ignores expiration
    price: 1500000,
    category: 'pt',
    pt_session_count: 10,
    description: '10 1-on-1 coaching sessions with a professional personal trainer. No expiration date.'
  },
  {
    name: '20-Session Personal Training',
    duration_days: 30,
    price: 2800000,
    category: 'pt',
    pt_session_count: 20,
    description: '20 1-on-1 coaching sessions with a professional trainer. Target specific body composition goals.'
  },
  {
    name: '50-Session Personal Training',
    duration_days: 30,
    price: 6000000,
    category: 'pt',
    pt_session_count: 50,
    description: '50 1-on-1 coaching sessions. Total body transformation plan with a customized workout and diet roadmap.'
  },

  // 3. Combo Packages (combo)
  {
    name: 'Bronze Combo Pack',
    duration_days: 30,
    price: 1000000,
    category: 'combo',
    pt_session_count: 5,
    description: '30 days of unlimited gym access combined with 5 personal training sessions.'
  },
  {
    name: 'Silver Combo Pack',
    duration_days: 90,
    price: 2700000,
    category: 'combo',
    pt_session_count: 15,
    description: '90 days of unlimited gym access combined with 15 personal training sessions.'
  },
  {
    name: 'Gold Combo Pack',
    duration_days: 180,
    price: 5000000,
    category: 'combo',
    pt_session_count: 30,
    description: 'VIP Plan: 180 days of unlimited gym access combined with 30 personal training sessions.'
  }
]

async function main() {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    
    console.log('Clearing old transaction logs and data...')
    await client.query('DELETE FROM invoices')
    await client.query('DELETE FROM payments')
    await client.query('DELETE FROM check_ins')
    await client.query('DELETE FROM pt_assignments')
    await client.query('DELETE FROM pt_schedules')
    await client.query('DELETE FROM subscriptions')
    await client.query('DELETE FROM packages')
    console.log('Cleanup complete.')

    console.log('Inserting realistic English demo packages...')
    for (const p of packages) {
      await client.query(
        'INSERT INTO packages (name, duration_days, price, category, session_count, pt_session_count, description) VALUES ($1,$2,$3,$4,$5,$6,$7)',
        [p.name, p.duration_days, p.price, p.category, null, p.pt_session_count, p.description]
      )
      console.log(`- Seeded: ${p.name} (${p.category})`)
    }

    await client.query('COMMIT')
    console.log('SUCCESS: Database successfully seeded with English packages!')
  } catch (err) {
    console.error('ERROR during seeding:', err.message)
    await client.query('ROLLBACK').catch(() => {})
  } finally {
    client.release()
    await pool.end()
  }
}

main()
