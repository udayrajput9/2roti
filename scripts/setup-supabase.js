require('dotenv').config();
const db = require('../api-server/src/config/database');
const { initSchema } = require('../api-server/src/models/schema');

async function main() {
  console.log('🚀 Checking Database & Supabase connection...');
  try {
    const isPg = Boolean(process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.SUPABASE_DB_URL);
    if (isPg) {
      const rawResult = await db.raw('SELECT current_database(), current_user, version()');
      console.log('✅ Connected to Supabase / PostgreSQL:', rawResult.rows ? rawResult.rows[0] : 'Connected');
    } else {
      const rawResult = await db.raw('SELECT sqlite_version() as version');
      console.log('✅ Connected to SQLite Database (Local Mode):', rawResult[0]);
    }

    console.log('📦 Initializing schema...');
    await initSchema();
    console.log('✅ Schema initialized successfully!');

    // Check if staff users seeded
    const staffCount = await db('staff_users').count('id as cnt').first();
    console.log(`👥 Existing Staff Users: ${staffCount.cnt || staffCount['count(*)'] || 0}`);

    if (parseInt(staffCount.cnt || staffCount['count(*)'] || 0) === 0) {
      console.log('🌱 Seeding initial staff, menu, and campus data...');
      const { execSync } = require('child_process');
      execSync('node api-server/src/models/seed.js', { stdio: 'inherit' });
      console.log('🎉 Seeding completed!');
    } else {
      console.log('ℹ️ Database already contains data. Skipped seed to preserve existing records.');
    }

    console.log('✨ All Database checks passed!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Database connection or schema error:', err);
    process.exit(1);
  }
}

main();
