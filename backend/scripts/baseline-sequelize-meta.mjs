import pg from 'pg';

const { Client } = pg;

const MIGRATIONS = [
  '20260305172736-init-schema.js',
  '20260305203000-add-waitlist-entries.js',
  '20260305213000-add-appointment-duration-to-availability-slots.js',
  '20260305220000-add-notify-on-doctor-approval-to-appointments.js',
  '20260307120000-add-unique-review-per-patient-doctor.js',
  '20260307150000-drop-appointment-id-from-reviews.js',
  '20260307173000-add-pending-reschedule-to-appointments.js',
  '20260315173000-add-doctor-rejection-reason-to-appointments.js',
  '20260316090000-add-doctor-time-zone.js',
  '20260316093000-add-patient-time-zone.js',
  '20260320100000-add-file-fields-to-messages.js',
  '20260320110000-remove-status-from-connections.js',
  '20260320213532-add-care-types-to-doctors.js',
];

const cleanEnv = (value, fallback = undefined) => {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value).replace(/\r/g, '').trim();
};

const client = new Client({
  user: cleanEnv(process.env.PG_USER),
  password: cleanEnv(process.env.PG_PWD),
  host: cleanEnv(process.env.PG_HOST),
  port: Number(cleanEnv(process.env.PG_PORT, '5432')),
  database: cleanEnv(process.env.PG_DATABASE),
});

try {
  await client.connect();

  await client.query(
    'CREATE TABLE IF NOT EXISTS "SequelizeMeta" (name VARCHAR(255) NOT NULL UNIQUE PRIMARY KEY);'
  );

  const valuesSql = MIGRATIONS.map((_, i) => `($${i + 1})`).join(', ');
  await client.query(
    `INSERT INTO "SequelizeMeta" (name) VALUES ${valuesSql} ON CONFLICT (name) DO NOTHING;`,
    MIGRATIONS
  );

  const result = await client.query('SELECT COUNT(*)::int AS count FROM "SequelizeMeta";');
  console.log(`SequelizeMeta baseline complete. Recorded migrations: ${result.rows[0].count}`);
} finally {
  await client.end();
}
