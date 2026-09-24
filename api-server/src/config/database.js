const knex = require('knex');
const path = require('path');
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
      // Scalability: Connection-level timeout to prevent hanging under load
      connectionTimeoutMillis: 5000,  // fail in 5s if DB unreachable
      statement_timeout: 30000         // kill queries running > 30s
    },
    pool: {
      min: 0,
      // Vercel serverless: max 1 (each function instance is isolated)
      // Local/dedicated server: max 10 handles ~500 concurrent users with queue
      max: process.env.VERCEL ? 1 : 10,
      idleTimeoutMillis: 10000,
      // Fail fast if pool exhausted under load — prevents request pile-up
      acquireTimeoutMillis: 8000
    }
  });
} else {
  const dbPath = path.resolve(__dirname, '../../data/2roti.sqlite');
  const fs = require('fs');
  const dataDir = path.dirname(dbPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

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
