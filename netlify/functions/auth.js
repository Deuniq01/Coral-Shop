// Support both Node 18 global fetch and node-fetch
let fetch;
try {
  // Try global fetch first (Node 18+)
  fetch = global.fetch;
} catch (e) {
  // Fall back to node-fetch
  fetch = require('node-fetch');
}
const { Pool } = require('pg');

// Database URL (support common env names)
const DATABASE_URL = process.env.NETLIFY_DATABASE_URL || process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;

let pool;
if (DATABASE_URL) {
  pool = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
} else {
  console.warn('No database URL configured for auth function');
}

async function ensureSchema(client) {
  // ensure users table exists; schema.sql in repo contains full schema but be defensive here
  await client.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
  await client.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      address TEXT,
      phone TEXT,
      google_id TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
}

exports.handler = async function(event) {
  try {
    if (!pool) return { statusCode: 500, body: JSON.stringify({ error: 'Database not configured' }) };

    const body = event.body ? JSON.parse(event.body) : {};
    const idToken = body.idToken || body.id_token || null;
    if (!idToken) return { statusCode: 400, body: JSON.stringify({ error: 'Missing idToken' }) };

    // Verify ID token with Google
    const verifyUrl = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`;
    const verifyResp = await fetch(verifyUrl);
    if (!verifyResp.ok) {
      const errText = await verifyResp.text();
      return { statusCode: 401, body: JSON.stringify({ error: 'Invalid ID token', details: errText }) };
    }

    const payload = await verifyResp.json();
    // payload contains: email, email_verified, name, picture, sub (google id), aud, iss, exp, iat
    const email = payload.email;
    const name = payload.name || payload.email.split('@')[0];
    const googleId = payload.sub;

    const client = await pool.connect();
    try {
      await ensureSchema(client);

      // Try to find existing user by email
      const existing = await client.query('SELECT id, email, name FROM users WHERE email = $1 LIMIT 1', [email]);
      let user;
      if (existing.rowCount > 0) {
        // Optionally update google_id if missing
        user = existing.rows[0];
        await client.query('UPDATE users SET google_id = COALESCE(google_id, $1), name = $2 WHERE id = $3', [googleId, name, user.id]);
      } else {
        const ins = await client.query('INSERT INTO users (email, name, google_id) VALUES ($1, $2, $3) RETURNING id, email, name', [email, name, googleId]);
        user = ins.rows[0];
      }

      return {
        statusCode: 200,
        body: JSON.stringify({ user: { id: user.id, email: user.email, name: user.name } })
      };
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Auth function error', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message || String(err) }) };
  }
};
