const knex = require('knex');
const path = require('path');
require('dotenv').config();

const dbPath = path.resolve(__dirname, '../../data/2roti.sqlite');

// Ensure data folder exists
const fs = require('fs');
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = knex({
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

module.exports = db;
