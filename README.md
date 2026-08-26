# Coral Shop

A secure, Supabase-backed storefront for Coral Shopping, a grocery, gift and household shop in Abeokuta, Nigeria. Customers browse the catalog, place orders by bank transfer, and track payment and delivery in their dashboard. Staff manage products, orders, payments and custom "Shop Your Way" requests from a protected admin area.

This README is the onboarding guide: by the end of it you can run the app locally, understand the data model, and deploy a new build.

## Contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Repository layout](#repository-layout)
- [Quick start (5 minutes)](#quick-start-5-minutes)
- [Environment variables](#environment-variables)
- [Importing product data](#importing-product-data)
- [Creating the first admin](#creating-the-first-admin)
- [AI shopping assistant](#ai-shopping-assistant)
- [Order and payment flow](#order-and-payment-flow)
- [Pages and routes](#pages-and-routes)
- [Database overview](#database-overview)
- [Security model](#security-model)
- [Build and deploy](#build-and-deploy)
- [Troubleshooting](#troubleshooting)
- [Style and conventions](#style-and-conventions)

## Features

- Public storefront: home page, catalog with search and category filters, "Shop by aisle" cards, product cards with stock-aware "Add to cart".
- "Shop Your Way" custom request form beside a hamper photo, with a per-customer request history.
- Email/password accounts via Supabase Auth; sign-in required before checkout.
- Checkout with delivery details, bank-transfer payment instructions (bank, account number, account name) and a click-to-copy account number.
- Customer dashboard (`/dashboard`): order stats, recent orders, custom requests, recommendations.
- Orders page (`/orders`): status timeline, payment confirmation button, delivery schedule.
- Admin area (`/admin`): orders (confirm payment, schedule delivery, progress fulfillment), product management (add, edit, price, stock, image, category) and custom request management.
- Live AI shopping assistant: answers questions about the catalog, prices, delivery and payments, and can add items to the cart.
- Bank-transfer/manual confirmation workflow: no payment gateway; prices and stock are validated server-side.

## Tech stack

- **Frontend:** React 18 + Vite, React Router, plain CSS (indigo/yellow palette, Inter typography).
- **Backend:** Supabase (Postgres + Row Level Security + Auth). All pricing, stock and role checks happen in Postgres security-definer functions, never in the browser.
- **AI chat:** optional Supabase Edge Function (`supabase/functions/ai-chat`) that calls an OpenAI-compatible API with the live catalog; direct `VITE_AI_*` env vars as an alternative; a built-in local brain as the offline fallback.
- **Hosting:** any static host. `netlify.toml` is included for Netlify.

## Repository layout

```
index.html                  App shell, favicon, Open Graph meta
netlify.toml                Netlify build config and SPA redirect
.env.example                Template for local environment variables
src/
  main.jsx                  All React UI: routes, pages, header/footer, cart, chat
  assistant.js              AI chat logic: live function call, direct LLM, local brain
  media.js                  Brand assets, images, sample catalog, bank details
  styles.css                All styling (indigo #3538A0 / yellow #FFCB05, Inter)
supabase/
  schema.sql                Authoritative schema: tables, functions, triggers, RLS
  seed_products.sql         Optional development catalog seed (run after schema.sql)
  custom_requests.sql       Incremental migration for OLD projects only (see note below)
  functions/ai-chat/
    index.ts                Edge Function for the live AI assistant
database/
  product.csv               Legacy product export (source of the seed)
trickle/
  assets/                   Legacy Trickle export, kept for reference only
```

Note on `supabase/custom_requests.sql`: a brand-new project does not need it. `schema.sql` already contains the `custom_requests` table, validation trigger and RLS policies. Only run `custom_requests.sql` if you are working on a project that was set up before the schema was unified.

## Quick start (5 minutes)

Prerequisites: Node.js 18 or newer and a free [Supabase](https://supabase.com) account.

1. **Create a Supabase project** (free tier is fine).
2. **Run the schema:** open **SQL Editor**, paste the whole contents of `supabase/schema.sql`, and run it. This creates all tables, functions, triggers and RLS policies.
3. **Enable email auth:** in **Authentication → Providers**, enable Email. Set your development URL (for example `http://localhost:5173`) as the Site URL and add it under **Authentication → URL Configuration → Redirect URLs**.
4. **Configure the app:** copy `.env.example` to `.env` and fill in the Project URL and the publishable **anon** key from **Project Settings → API**. Never put a service-role key in a `VITE_` variable; that key must never reach the browser.
5. **Run it:**

   ```bash
   npm install
   npm run dev
   ```

   The app listens on `0.0.0.0` (default Vite port 5173). Open it, create an account, add a few products, and you are live locally.

Tip: without Supabase configured the storefront still renders a demo mode with a small sample catalog, so you can look around immediately. Checkout, orders and the dashboard need real Supabase credentials.

## Environment variables

All variables go in `.env` (local) or in your host's environment settings (production). They are read by Vite at build time, so restart the dev server after changes.

| Variable | Required | Description |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Yes (for real use) | Supabase Project URL. |
| `VITE_SUPABASE_ANON_KEY` | Yes (for real use) | Supabase publishable anon key. Public by design; RLS protects the data. |
| `VITE_AI_API_URL` | No | Direct OpenAI-compatible chat endpoint. Used only when the Edge Function is unavailable. |
| `VITE_AI_API_KEY` | No | API key for the direct endpoint. |
| `VITE_AI_MODEL` | No | Model name for the direct endpoint (default `gpt-4o-mini`). |
| `VITE_BANK_NAME` | No | Overrides the default bank name (`Palmpay`). |
| `VITE_BANK_ACCOUNT` | No | Overrides the default account number (`9061965441`). |
| `VITE_BANK_ACCOUNT_NAME` | No | Overrides the default account name (`Bolatito Roqeebah Kehinde`). |

The bank details shown at checkout and on the Orders page come from `src/media.js`. The real account is already the default; the `VITE_BANK_*` variables exist only so you can switch banks without a code change.

## Importing product data

For a development catalog, run `supabase/seed_products.sql` in the SQL Editor **after** `schema.sql`. It inserts a product-only catalog with unique slugs and an initial stock of 100, and it is idempotent (`on conflict (slug) do nothing`), so you can re-run it safely.

The seed source is `database/product.csv`. Review names, images, prices, categories and stock in the Supabase Table Editor before launch. Old user and order data from the legacy app is intentionally not migrated: accounts must be created through Supabase Auth.

From then on, manage products through the Admin area (`/admin` → Products): add, edit, reprice, adjust stock, or deactivate.

## Creating the first admin

1. Register normally through the app (`/sign-in` → Create your account).
2. In the Supabase SQL Editor, promote the account, replacing the email:

   ```sql
   insert into public.profiles (id, full_name, role)
   select id, split_part(email, '@', 1), 'admin'
   from auth.users
   where email = 'you@example.com'
   on conflict (id) do update set role = 'admin';
   ```

   The `insert ... on conflict` form also covers accounts whose `profiles` row is missing for any reason.
3. Refresh the app. The **Admin** link appears in the header and `/admin` opens the store control centre.

The role is enforced server-side: `is_admin()` checks the `profiles.role` column, and RLS plus security-definer functions apply it to every query. It is not a browser flag, and changing it in the browser does nothing.

## AI shopping assistant

The floating chat button talks to three layers, in this order:

1. **Supabase Edge Function `ai-chat` (primary, recommended).** A real LLM grounded in the live catalog: it reads the current active products from Postgres and answers with exact names and prices. The API key stays server-side as a Supabase secret, never in the browser.
2. **Direct LLM endpoint (optional).** If `VITE_AI_API_URL` and `VITE_AI_API_KEY` are set, the browser can call an OpenAI-compatible endpoint directly. Useful for quick testing; less secure than the Edge Function because the key ships to the client.
3. **Local brain (offline fallback).** A rule-based assistant in `src/assistant.js` that still answers price, stock, delivery, payment and gift questions from the catalog, and keeps a friendly persona for anything else. This is what runs in preview environments without Supabase.

Deploying the Edge Function (requires the [Supabase CLI](https://supabase.com/docs/guides/cli)):

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy ai-chat
supabase secrets set LLM_API_KEY=sk-...
# Optional overrides (defaults: OpenAI chat completions, gpt-4o-mini):
supabase secrets set LLM_API_URL=https://api.openai.com/v1/chat/completions
supabase secrets set LLM_MODEL=gpt-4o-mini
```

The client calls it with `supabase.functions.invoke('ai-chat', { body: { messages } })`; if the call fails for any reason, the app silently falls through to the next layer, so chat never breaks.

## Order and payment flow

1. Customer signs in, builds a cart and submits delivery details at `/checkout`.
2. The `create_order` Postgres function validates the cart server-side: every product must be active, stock must cover the quantity, and prices are taken from the database (never from the client). Stock is decremented in the same transaction, and the order is created with status `awaiting_payment`.
3. The customer sees the bank details (amount, bank, account number, account name) on the Orders page, transfers, and clicks **I've made payment**. `submit_payment` moves the order to `pending`.
4. An admin opens `/admin` → Orders, enters a delivery date/time and note, and clicks **Payment received - mark paid** (`confirm_payment`). The status becomes `paid` and the customer sees the schedule on their order.
5. The admin progresses fulfillment: `paid` → `processing` → `shipped` → `delivered` (`update_order_fulfillment`).

Statuses: `awaiting_payment`, `pending`, `paid`, `processing`, `shipped`, `delivered`, `cancelled`. No client can mark an order paid; only the admin-gated Postgres functions can.

## Pages and routes

| Route | Access | What it does |
| --- | --- | --- |
| `/` | Public | Home: hero, shop-by-aisle, best sellers, Shop Your Way form. |
| `/products` | Public | Full catalog with search (`?q=`) and category chips. |
| `/sign-in` | Public | Sign in or create account (Supabase Auth). |
| `/checkout` | Signed in | Delivery details + payment method + cart summary. |
| `/orders` | Signed in | The customer's orders, payment confirmation, delivery schedule. |
| `/dashboard` | Signed in | Stats, recent orders, custom requests, recommendations. |
| `/admin` | Admin role | Orders, products and custom request management. |

## Database overview

Tables (all in `public`):

- `profiles` (id → auth.users, full_name, phone, role `customer`/`admin`)
- `categories` (name, slug) and `products` (name, slug, description, price, category_id, image_url, stock_quantity, is_active)
- `orders` (user_id, status, shipping fields, subtotal, delivery_fee, total, payment and delivery timestamps)
- `order_items` (order_id, product_id, product_name, unit_price, quantity, line_total)
- `custom_requests` (user_id, name, phone, items, budget, status, admin_note)

Key functions (all security definer, all role/ownership checked inside):

- `create_order(items jsonb, shipping jsonb)` → order id. Self-heals a missing `profiles` row, validates stock, prices server-side, decrements stock.
- `submit_payment(order_id)` → customer confirms transfer; only their own `awaiting_payment` order.
- `confirm_payment(order_id, scheduled_at, note)` → admin confirms payment and delivery plan.
- `update_order_fulfillment(order_id, next_status, scheduled_at, note)` → admin progresses `processing`/`shipped`/`delivered`/`cancelled`.
- `is_admin()` → role check used by RLS and every admin function.
- `handle_new_user()` trigger → creates the `profiles` row when a user signs up.
- `custom_request_validate()` trigger → validates Shop Your Way fields and forces the customer's own id.

RLS in one line per table: profiles are private (self or admin); catalog reads are public, writes admin-only; customers read their own orders, order items and requests; admins see and update everything.

## Security model

- Supabase Auth owns password hashing, verification and sessions. The browser holds only the public anon key.
- Customers can read only their own orders, order items and custom requests. They cannot update anything except confirming payment on their own order, which the Postgres function gates by ownership and status.
- Pricing and stock are always decided server-side inside `create_order`; a tampered cart cannot change prices or reserve stock it does not have.
- Admin access is the `role` column in `profiles`, enforced by `is_admin()` in RLS and in every admin function. There is no client-side bypass.
- The LLM key for the AI assistant lives in a Supabase secret (server-side), not in `VITE_` variables.

## Build and deploy

```bash
npm run build     # outputs dist/
npm run preview   # serves the production build locally on 0.0.0.0:4173
```

**Netlify** (configured in `netlify.toml`): connect the repo, and add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (plus any `VITE_AI_*` / `VITE_BANK_*` you use) under **Site settings → Environment variables**. The SPA redirect (`/* → /index.html`, 200) is already in `netlify.toml`, so deep links like `/orders` work on refresh. Then add your production domain to Supabase's redirect URLs.

Any other static host works the same way: upload `dist/` and rewrite all paths to `index.html`.

## Troubleshooting

- **App shows "Connect Coral Shop to Supabase":** `.env` is missing or still has placeholders. Copy `.env.example` to `.env`, set the URL and anon key, and restart the dev server.
- **Sign-up works but checkout fails, or orders never appear:** the `profiles` row is missing. `create_order` now self-heals this, but if you ran an old schema, re-run `schema.sql` in a fresh project or promote the profile with the SQL in [Creating the first admin](#creating-the-first-admin).
- **I signed up but there is no Admin link:** you are not an admin yet. Run the promote SQL above with your email, then refresh.
- **Orders placed before a schema upgrade are gone:** before the `create_order` self-heal fix, orders from accounts with a missing `profiles` row failed to insert and never existed in the database. Hard-refresh `/dashboard` or `/admin` after deploying a new schema.
- **Chat only gives canned answers:** the Edge Function is not deployed or `LLM_API_KEY` is not set, so the local brain is answering. Deploy `ai-chat` (see [AI shopping assistant](#ai-shopping-assistant)) or set the `VITE_AI_*` variables.
- **Chat error mentions `ai-chat` or CORS:** the function is deployed but failing (missing secret, model name). Check **Edge Functions → ai-chat → Logs** in the Supabase dashboard.
- **Products do not show after import:** check that `schema.sql` ran fully (no error at the end), that the category slugs `foodstuffs`, `gifts`, `household` exist, and that `is_active` is `true`.
- **Blank admin orders tab:** the admin panel now reports per-query errors with a Try again button; read the red notice to see which query failed (usually RLS/role).
- **Existing project set up before recent updates:** two features need one-time SQL migrations on a project that predates them. `schema.sql` covers brand-new projects automatically; for a project you already deployed, run these once each in the Supabase SQL Editor (both are safe to re-run):
  - `supabase/add_profile_email.sql` — adds `profiles.email`, required for the admin Orders tab to show customer emails.
  - `supabase/add_product_images_bucket.sql` — creates the `product-images` storage bucket used by the "upload a photo" control in Admin → Products.

## Style and conventions

- **Palette and type:** indigo `#3538A0` and yellow `#FFCB05`, with the Inter font. Keep new UI inside these tokens (defined at the top of `src/styles.css`).
- **No em dashes or en dashes** anywhere in tracked files. Use commas, colons, parentheses or a regular hyphen instead. This is a standing project rule.
- **Frontend is intentionally single-file per concern:** `src/main.jsx` holds all pages, `src/styles.css` all styles, `src/media.js` assets and bank details. When you add a page, follow the existing patterns (route in `App`, page component in `main.jsx`, styles appended to `styles.css`).
- **Server-side truth:** anything about money, stock, roles or order status must be enforced in Postgres (functions + RLS). The browser only displays it.
- **Env vars:** only public, non-secret values belong in `VITE_` variables. Secrets live in Supabase secrets or your host's server-side environment.
