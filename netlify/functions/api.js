const { Pool } = require('pg');

// Support several common env var names (Neon/Heroku-style)
const DATABASE_URL = process.env.NETLIFY_DATABASE_URL || process.env.NEON_DATABASE_URL || process.env.DATABASE_URL || process.env.PG_CONNECTION_STRING || process.env.PG_URI;

// Optional API key protection - set NETLIFY_FUNCTIONS_API_KEY in your Netlify site env to require it
const FUNCTIONS_API_KEY = process.env.NETLIFY_FUNCTIONS_API_KEY || process.env.FUNCTIONS_API_KEY || process.env.API_KEY;

let pool;
if (!DATABASE_URL) {
  console.warn('No database URL found in environment. Set NETLIFY_DATABASE_URL or NEON_DATABASE_URL or DATABASE_URL.');
} else {
  pool = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
}

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

exports.handler = async function(event) {
  // Check if this is a write operation that needs API key
  const body = event.body ? JSON.parse(event.body) : {};
  const { action, resource, data, id, limit } = body;
  const isWriteOperation = ['create', 'update', 'delete'].includes(action);

  // Allow unauthenticated creation of orders from the client (so customers can place orders)
  // while still requiring the FUNCTIONS_API_KEY for other write operations.
  const isOrderCreate = (action === 'create' && typeof resource === 'string' && resource.startsWith('order'));

  // API key enforcement for write operations only (if FUNCTIONS_API_KEY is set)
  if (FUNCTIONS_API_KEY && isWriteOperation && !isOrderCreate) {
    const provided = (event.headers && (event.headers['x-api-key'] || event.headers['X-API-KEY'])) || null;
    if (!provided || provided !== FUNCTIONS_API_KEY) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized - missing or invalid API key for write operation' }) };
    }
  }

  if (!pool) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Database not configured. Set NETLIFY_DATABASE_URL or NEON_DATABASE_URL or DATABASE_URL.' }) };
  }

  try {
    const client = await pool.connect();
    try {
      await ensureSchema(client);

      if (action === 'list') {
        const l = parseInt(limit, 10) || 100;
        const res = await client.query(`SELECT id::text as objectId, object_data FROM objects WHERE type = $1 ORDER BY created_at DESC LIMIT $2`, [resource, l]);
        return { statusCode: 200, body: JSON.stringify({ items: res.rows.map(r => ({ objectId: r.objectid, objectData: r.object_data })) }) };
      }

      if (action === 'create') {
        const res = await client.query(`INSERT INTO objects (type, object_data) VALUES ($1, $2) RETURNING id::text as objectId, object_data`, [resource, data]);
        return { statusCode: 200, body: JSON.stringify({ objectId: res.rows[0].objectid, objectData: res.rows[0].object_data }) };
      }

      if (action === 'update') {
        if (!id) return { statusCode: 400, body: JSON.stringify({ error: 'Missing id for update' }) };
        const res = await client.query(`UPDATE objects SET object_data = COALESCE(object_data, '{}'::jsonb) || $1 WHERE id::text = $2 RETURNING id::text as objectId, object_data`, [data, id]);
        if (res.rowCount === 0) return { statusCode: 404, body: JSON.stringify({ error: 'Not found' }) };
        return { statusCode: 200, body: JSON.stringify({ objectId: res.rows[0].objectid, objectData: res.rows[0].object_data }) };
      }

      if (action === 'delete') {
        if (!id) return { statusCode: 400, body: JSON.stringify({ error: 'Missing id for delete' }) };
        const res = await client.query(`DELETE FROM objects WHERE id::text = $1 RETURNING id::text as objectId`, [id]);
        if (res.rowCount === 0) return { statusCode: 404, body: JSON.stringify({ error: 'Not found' }) };
        return { statusCode: 200, body: JSON.stringify({ objectId: res.rows[0].objectid }) };
      }

      return { statusCode: 400, body: JSON.stringify({ error: 'Unknown action' }) };
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Function error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message || String(error) }) };
  }
};

