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
  // Read and execute schema.sql
  const schemaPath = path.join(__dirname, '..', 'netlify', 'functions', 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  await client.query(schema);
}

function normalizeValue(v) {
  if (v === '') return null;
  if (!isNaN(v) && v.trim() !== '') return Number(v);
  try { return JSON.parse(v); } catch (e) { return v; }
}

// Caches for tracking processed entities
const processedEmails = new Set();
const userCache = new Map(); // email -> uuid
const productCache = new Map(); // sku -> uuid

async function importUsers(client, records) {
  console.log('Importing users...');
  for (const record of records) {
    if (!record.email || processedEmails.has(record.email)) continue;
    processedEmails.add(record.email);
    
    const userResult = await client.query(
      'INSERT INTO users (email, name, address, phone) VALUES ($1, $2, $3, $4) RETURNING id',
      [record.email, record.name || 'Unknown', record.address || '', record.phone || '']
    );
    userCache.set(record.email, userResult.rows[0].id);
  }
}

async function importProducts(client, records) {
  console.log('Importing products...');
  for (const record of records) {
    if (!record.sku || productCache.has(record.sku)) continue;
    
    const productResult = await client.query(
      'INSERT INTO products (sku, name, description, price, stock_quantity) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [
        record.sku,
        record.name || 'Unknown Product',
        record.description || '',
        parseFloat(record.price) || 0,
        parseInt(record.stock_quantity, 10) || 0
      ]
    );
    productCache.set(record.sku, productResult.rows[0].id);
  }
}

async function importOrders(client, records) {
  console.log('Importing orders...');
  const processedOrders = new Set();
  
  for (const record of records) {
    if (!record.order_id || processedOrders.has(record.order_id)) continue;
    processedOrders.add(record.order_id);
    
    const userId = userCache.get(record.email);
    if (!userId) {
      console.warn(`Skipping order ${record.order_id} - user ${record.email} not found`);
      continue;
    }
    
    // Create order
    const orderResult = await client.query(
      'INSERT INTO orders (user_id, status, total_amount, shipping_address) VALUES ($1, $2, $3, $4) RETURNING id',
      [
        userId,
        record.status || 'pending',
        parseFloat(record.total_amount) || 0,
        record.shipping_address || record.address || ''
      ]
    );
    const orderId = orderResult.rows[0].id;

    // Add order items for this order
    const orderItems = records.filter(r => r.order_id === record.order_id);
    for (const item of orderItems) {
      const productId = productCache.get(item.sku);
      if (productId) {
        await client.query(
          'INSERT INTO order_items (order_id, product_id, quantity, price_at_time) VALUES ($1, $2, $3, $4)',
          [
            orderId,
            productId,
            parseInt(item.quantity, 10) || 1,
            parseFloat(item.price) || 0
          ]
        );
      }
    }
  }
}

async function importCsv(filePath, type) {
  const content = fs.readFileSync(filePath, 'utf8');
  const records = parse(content, { columns: true, skip_empty_lines: true });
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    await ensureSchema(client);

    // Import in the correct order to maintain referential integrity
    if (type === 'user') {
      await importUsers(client, records);
    } else if (type === 'product') {
      await importProducts(client, records);
    } else if (type === 'custom_order') {
      await importOrders(client, records);
    }

    await client.query('COMMIT');
    console.log(`Imported ${records.length} rows from ${path.basename(filePath)} as ${type}`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
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

