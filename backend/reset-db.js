require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;
const sslMode = String(process.env.PGSSLMODE || process.env.DATABASE_SSL || '').toLowerCase();
const rejectUnauthorized = process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false';

const config = {
  connectionString,
};

if (sslMode === 'true' || sslMode === 'require' || sslMode === 'verify-full' || sslMode === 'verify-ca') {
  config.ssl = { rejectUnauthorized };
}

const pool = new Pool(config);

async function main() {
  console.log('Connecting to database...');
  const client = await pool.connect();
  try {
    console.log('Resetting schema (dropping all tables)...');
    await client.query('BEGIN');
    
    // Drop all tables in public schema
    await client.query(`
      DO $$ DECLARE
          r RECORD;
      BEGIN
          FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
              EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
          END LOOP;
      END $$;
    `);
    
    console.log('Executing schema.sql...');
    const schemaSqlPath = path.join(__dirname, 'src', 'db', 'schema.sql');
    const schemaSql = fs.readFileSync(schemaSqlPath, 'utf8');
    
    await client.query(schemaSql);
    await client.query('COMMIT');
    console.log('Database schema reset successfully!');
  } catch (err) {
    console.error('Error resetting database:', err);
    await client.query('ROLLBACK').catch(() => {});
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
