# Coral Shop

A secure, Supabase-backed storefront for foodstuffs, gifts, and household essentials. The application requires account sign-in before checkout, calculates orders in Postgres, and gives staff a protected workflow for payment confirmation and delivery scheduling.

## Stack

- React + Vite
- Supabase Auth (free tier) for email/password accounts and sessions
- Supabase Postgres + Row Level Security for catalog, orders, and roles
- No payment gateway yet: bank-transfer/manual confirmation workflow

## What changed

The old browser-side account implementation, generic JSON object store, plaintext-password flow, public user listing, browser-held API key pattern, Neon-specific functions, and incomplete order routes have been retired. There is one authoritative Supabase schema in `supabase/schema.sql`.

## Local setup

1. Create a **free** project at [Supabase](https://supabase.com).
2. In **SQL Editor**, run `supabase/schema.sql`.
3. In **Authentication → Providers**, enable Email. Configure the Site URL and redirect URL for your development and production addresses.
4. Copy `.env.example` to `.env`, then enter the project URL and publishable anon key from **Project Settings → API**. Never put a service-role key in a `VITE_` variable.
5. Install and run:

   ```bash
   npm install
   npm run dev
   ```

## Import product data

The safe seed source retained from the old project is `database/product.csv`. For a development catalog, run `supabase/seed_products.sql` in the Supabase SQL Editor **after** `supabase/schema.sql`. It imports each legacy product with a unique slug and an initial stock quantity of 100.

Before launch, review names, images, prices, categories, and stock in the Supabase Table Editor. The seed is intentionally product-only; old user and order data is not imported.

Old user and order CSVs were intentionally removed: passwords/identities must be created through Supabase Auth, not migrated from insecure legacy records.

## Make the first administrator

1. Register normally through the app.
2. Copy the account UUID from **Authentication → Users**.
3. Run the following in the SQL Editor, replacing the value:

   ```sql
   update public.profiles
   set role = 'admin'
   where id = 'YOUR-USER-UUID';
   ```

Refresh the application. The **Admin** link is shown only after the authenticated profile has the admin role. Server-side RLS and SQL functions enforce this role; it is not a browser/localStorage flag.

## Temporary payment workflow

1. Signed-in customer submits delivery details and places an order.
2. The database sets it to `awaiting_payment`; product prices and stock are validated server-side.
3. Customer makes the manual payment and clicks **I've made payment**. The status becomes `pending`.
4. An administrator selects delivery date/time and clicks **Payment received — mark paid**. The status becomes `paid` and the customer sees the planned delivery in their order history.
5. Admin progresses fulfillment through `processing`, `shipped`, and `delivered`.

No payment provider is simulated and no client can mark an order paid.

## Security model

- Supabase Auth owns password hashing, verification, and session management.
- The browser uses only Supabase's public anon key.
- RLS lets customers read only their own orders and order items.
- Catalog reads are public; product writes are admin-only.
- `create_order`, `submit_payment`, `confirm_payment`, and fulfillment updates are controlled SQL functions that enforce ownership, pricing, stock, and roles on the server.

## Production checklist

- Configure Supabase Auth Site URL and allowed redirect URLs.
- Enable email confirmation and configure SMTP when ready.
- Assign at least one admin profile.
- Load real product inventory.
- Set a payment provider/webhook later; replace the manual workflow only after webhook verification is implemented.
- Deploy the Vite build (`npm run build`) to Netlify or another static host.
