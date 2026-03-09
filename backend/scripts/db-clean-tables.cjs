'use strict';

const path = require('path');
const { Client } = require('pg');
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), override: true });

const quoteIdent = (value) => `"${String(value).replace(/"/g, '""')}"`;
const env = (key, fallback = undefined) => {
  const value = process.env[key];
  if (value === undefined || value === null || value === '') return fallback;
  return String(value).replace(/\r/g, '').trim();
};

const run = async () => {
  const client = new Client({
    host: env('PG_HOST', 'localhost'),
    port: Number(env('PG_PORT', '5432')),
    user: env('PG_USER'),
    password: env('PG_PWD'),
    database: env('PG_DATABASE'),
  });

  const schema = 'public';

  await client.connect();

  try {
    await client.query('BEGIN');

    const views = await client.query('SELECT viewname FROM pg_views WHERE schemaname = $1', [schema]);
    for (const row of views.rows) {
      await client.query(
        `DROP VIEW IF EXISTS ${quoteIdent(schema)}.${quoteIdent(row.viewname)} CASCADE`
      );
    }

    const materializedViews = await client.query(
      'SELECT matviewname FROM pg_matviews WHERE schemaname = $1',
      [schema]
    );
    for (const row of materializedViews.rows) {
      await client.query(
        `DROP MATERIALIZED VIEW IF EXISTS ${quoteIdent(schema)}.${quoteIdent(
          row.matviewname
        )} CASCADE`
      );
    }

    const tables = await client.query('SELECT tablename FROM pg_tables WHERE schemaname = $1', [schema]);
    for (const row of tables.rows) {
      await client.query(
        `DROP TABLE IF EXISTS ${quoteIdent(schema)}.${quoteIdent(row.tablename)} CASCADE`
      );
    }

    const sequences = await client.query(
      'SELECT sequencename FROM pg_sequences WHERE schemaname = $1',
      [schema]
    );
    for (const row of sequences.rows) {
      await client.query(
        `DROP SEQUENCE IF EXISTS ${quoteIdent(schema)}.${quoteIdent(row.sequencename)} CASCADE`
      );
    }

    const enums = await client.query(
      `
        SELECT t.typname
        FROM pg_type t
        INNER JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typtype = 'e' AND n.nspname = $1
      `,
      [schema]
    );
    for (const row of enums.rows) {
      await client.query(`DROP TYPE IF EXISTS ${quoteIdent(schema)}.${quoteIdent(row.typname)} CASCADE`);
    }

    await client.query('COMMIT');

    console.log(
      `[db:clean] Dropped ${tables.rowCount} table(s), ${views.rowCount} view(s), ${materializedViews.rowCount} materialized view(s), ${sequences.rowCount} sequence(s), and ${enums.rowCount} enum type(s).`
    );
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[db:clean] Failed to clean database:', error);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
};

run();
