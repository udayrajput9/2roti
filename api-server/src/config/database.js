const knex = require('knex');
const path = require('path');


// Resilient .env path resolution
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
require('dotenv').config();

let db;

if (process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.SUPABASE_DB_URL) {
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.SUPABASE_DB_URL;
  console.log('🔌 Connecting to Supabase / PostgreSQL Database...');
  db = knex({
    client: 'pg',
    connection: {
      connectionString,
      ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
      connectionTimeoutMillis: 8000,   // fail in 8s if DB unreachable
      statement_timeout: 30000         // kill queries running > 30s
    },
    pool: {
      min: 0,
      max: process.env.VERCEL ? 1 : 10,
      idleTimeoutMillis: 30000,
      acquireTimeoutMillis: 10000
    }
  });
} else {
  if (process.env.VERCEL) {
    console.error('❌ CRITICAL ERROR: No DATABASE_URL provided on Vercel! Serverless function cannot start without a Postgres database.');
    throw new Error('DATABASE_URL environment variable is missing on Vercel.');
  }

  const dbPath = path.resolve(__dirname, '../../data/2roti.sqlite');
  const fs = require('fs');
  const dataDir = path.dirname(dbPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  console.log('⚠️ Running locally with SQLite fallback because DATABASE_URL is not set.');
  db = knex({
    client: 'sqlite3',
    connection: {
      filename: dbPath,
    },
    useNullAsDefault: true,
    pool: {
      afterCreate: (conn, cb) => {
        conn.run('PRAGMA foreign_keys = ON', cb);
      }
    }
  });
}

module.exports = db;
