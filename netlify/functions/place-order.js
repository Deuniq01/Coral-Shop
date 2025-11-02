const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database URL
const DATABASE_URL = process.env.NETLIFY_DATABASE_URL || process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;

let pool;
if (DATABASE_URL) {
  pool = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
} else {
  console.warn('No database URL configured for place-order function');
}

async function ensureSchema(client) {
  // Execute schema.sql if present to ensure normalized tables exist
  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf8');
      await client.query(schema);
    }
  } catch (e) {
    // non-fatal here; if tables already exist the rest should still work
    console.warn('Could not ensure schema from file:', e.message);
  }
}

exports.handler = async function(event) {
  try {
    if (!pool) return { statusCode: 500, body: JSON.stringify({ error: 'Database not configured' }) };

    const body = event.body ? JSON.parse(event.body) : {};
    const { userId, email, name, shipping_address, items, payment_method } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return { statusCode: 400, body: JSON.stringify({ error: 'No items in order' }) };
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await ensureSchema(client);

      // Resolve or create user if email provided
      let dbUserId = null;
      if (userId) {
        const u = await client.query('SELECT id FROM users WHERE id::text = $1 LIMIT 1', [userId]);
        if (u.rowCount > 0) dbUserId = u.rows[0].id;
      } else if (email) {
        const u = await client.query('SELECT id FROM users WHERE email = $1 LIMIT 1', [email]);
        if (u.rowCount > 0) {
          dbUserId = u.rows[0].id;
        } else {
          const nameVal = name || email.split('@')[0];
          const ins = await client.query('INSERT INTO users (email, name) VALUES ($1, $2) RETURNING id', [email, nameVal]);
          dbUserId = ins.rows[0].id;
        }
      }

      // Validate items and compute total
      let totalAmount = 0;
      const validatedItems = [];
      for (const it of items) {
        const quantity = parseInt(it.quantity, 10) || 1;
        if (quantity <= 0) {
          await client.query('ROLLBACK');
          return { statusCode: 400, body: JSON.stringify({ error: 'Invalid quantity' }) };
        }

        let productRow = null;
        if (it.productId) {
          const r = await client.query('SELECT id, price FROM products WHERE id::text = $1 LIMIT 1', [it.productId]);
          if (r.rowCount === 0) {
            await client.query('ROLLBACK');
            return { statusCode: 400, body: JSON.stringify({ error: `Product not found: ${it.productId}` }) };
          }
          productRow = r.rows[0];
        } else if (it.sku) {
          const r = await client.query('SELECT id, price FROM products WHERE sku = $1 LIMIT 1', [it.sku]);
          if (r.rowCount === 0) {
            await client.query('ROLLBACK');
            return { statusCode: 400, body: JSON.stringify({ error: `Product not found: ${it.sku}` }) };
          }
          productRow = r.rows[0];
        } else {
          await client.query('ROLLBACK');
          return { statusCode: 400, body: JSON.stringify({ error: 'Item missing productId or sku' }) };
        }

        const price = parseFloat(productRow.price);
        const lineTotal = price * quantity;
        totalAmount += lineTotal;
        validatedItems.push({ productId: productRow.id, quantity, price_at_time: price });
      }

      // Create order
      const orderRes = await client.query(
        'INSERT INTO orders (user_id, status, total_amount, shipping_address) VALUES ($1, $2, $3, $4) RETURNING id',
        [dbUserId, 'pending', totalAmount, shipping_address || '']
      );
      const orderId = orderRes.rows[0].id;

      // Insert order items
      for (const vi of validatedItems) {
        await client.query(
          'INSERT INTO order_items (order_id, product_id, quantity, price_at_time) VALUES ($1, $2, $3, $4)',
          [orderId, vi.productId, vi.quantity, vi.price_at_time]
        );
      }

      await client.query('COMMIT');
      return { statusCode: 200, body: JSON.stringify({ orderId }) };
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Place-order error:', err);
      return { statusCode: 500, body: JSON.stringify({ error: err.message || String(err) }) };
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Place-order handler error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message || String(err) }) };
  }
};
