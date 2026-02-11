/**
 * Database Initialization Script
 * Creates all tables based on Sequelize models
 *
 * Usage:
 *   npm run db:init        - Create tables (safe, won't drop existing)
 *   npm run db:reset       - Drop and recreate all tables (DANGER: deletes data)
 */

import { syncDatabase } from './models/index.js';

const args = process.argv.slice(2);
const force = args.includes('--force');

console.log('====================================');
console.log('Database Initialization');
console.log('====================================');

if (force) {
  console.warn('⚠️  WARNING: Running with --force flag');
  console.warn('⚠️  This will DROP all existing tables and data!');
  console.log('');
}

(async () => {
  try {
    await syncDatabase(force);

    console.log('');
    console.log('✅ Database tables created successfully!');
    console.log('');
    console.log('Tables created:');
    console.log('  - users');
    console.log('  - patients');
    console.log('  - doctors');
    console.log('  - appointments');
    console.log('  - availability_patterns');
    console.log('  - availability_slots');
    console.log('  - messages');
    console.log('  - reviews');
    console.log('  - questionnaires');
    console.log('  - admin_logs');
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    process.exit(1);
  }
})();
