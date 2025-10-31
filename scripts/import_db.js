const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const { parse } = require('csv-parse/sync');

const DATABASE_URL = process.env.NETLIFY_DATABASE_URL || process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('Set NETLIFY_DATABASE_URL (or NEON_DATABASE_URL/DATABASE_URL) in env');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function ensureSchema(client) {
  await client.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
  await client.query(`
    CREATE TABLE IF NOT EXISTS objects (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      type text NOT NULL,
      object_data jsonb,
      created_at timestamptz DEFAULT now()
    );
  `);
}

function normalizeValue(v) {
  if (v === '') return null;
  if (!isNaN(v) && v.trim() !== '') return Number(v);
  try { return JSON.parse(v); } catch (e) { return v; }
}

async function importCsv(filePath, type) {
  const content = fs.readFileSync(filePath, 'utf8');
  const records = parse(content, { columns: true, skip_empty_lines: true });
  const client = await pool.connect();
  try {
    await ensureSchema(client);
    for (const row of records) {
      const obj = {};
      for (const k of Object.keys(row)) {
        obj[k] = normalizeValue(row[k]);
      }
      await client.query(`INSERT INTO objects (type, object_data) VALUES ($1, $2)`, [type, obj]);
    }
    console.log(`Imported ${records.length} rows from ${path.basename(filePath)} as ${type}`);
  } finally {
    client.release();
  }
}

async function main() {
  try {
    const dbDir = path.join(__dirname, '..', 'database');
    if (!fs.existsSync(dbDir)) {
      console.error('No database folder found at', dbDir);
      process.exit(1);
    }

    const mapping = [
      { file: 'user.csv', type: 'user' },
      { file: 'product.csv', type: 'product' },
      { file: 'custom_order.csv', type: 'custom_order' }
    ];

    for (const m of mapping) {
      const p = path.join(dbDir, m.file);
      if (fs.existsSync(p)) {
        await importCsv(p, m.type);
      } else {
        console.warn('Skipping missing file', p);
      }
    }
  } catch (err) {
    console.error('Import error', err);
  } finally {
    await pool.end();
  }
}

main();

