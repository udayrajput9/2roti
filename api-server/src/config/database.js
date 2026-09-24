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
      ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false }
    },
    pool: {
      min: 2,
      max: 10
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
