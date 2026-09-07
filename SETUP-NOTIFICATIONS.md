# Coral Shopping - Notifications, Reviews, Messaging & Push: Setup Runbook

This runbook turns the code in this batch into live features. Work top to bottom.
Every step is idempotent or safe to re-run. Nothing here can be done from the build
sandbox (no network, no push), so you run these on your own machine and dashboards.

## What this batch added

- Search autocomplete in the shop header, a custom 404 page, and PWA (installable / offline).
- An in-app notification bell (live, per user) driven by a `notifications` table.
- Per-order messaging between each customer and the shop (customer thread + admin thread).
- Customer reviews with admin moderation; approved reviews appear on the landing page.
- Email notifications (via Resend): owner gets event alerts, customers get their own updates.
- Device push notifications (Web Push / VAPID) to phones and desktops.

The `notifications` table is the shared spine: order events, new messages, new reviews and
status changes all insert a notification, and email + push both ride that same insert.

## Prerequisites

- Supabase CLI installed and logged in (`supabase login`).
- Link the CLI to the CORRECT project (it was previously linked to the wrong one):

```
supabase link --project-ref bheebvpiutommdyoftht
```

- A Resend account (for email) with a verified sender domain or address.
- Node + npm (for the VAPID key generator and the build).

---

## Part A - Database (SQL Editor)

Run these in the Supabase SQL Editor in THIS ORDER. `notifications.sql` must come first
because `order_messages.sql` and `reviews.sql` call its `notify()` / `notify_admins()`
helpers.

1. `supabase/notifications.sql`   (table, notify helpers, order + request triggers, RLS, realtime)
2. `supabase/order_messages.sql`  (per-order messages, sender/role guard, RLS, realtime)
3. `supabase/reviews.sql`         (reviews + status enum, moderation RPC, RLS)
4. `supabase/push.sql`            (push_subscriptions table, owner guard, RLS)

If you have not already applied these earlier files, run them too (safe to re-run):

- `supabase/profile_self_update.sql`  (lets customers edit their own profile)
- `supabase/order_status_guard.sql`   (server-side order status transition guard)
- `supabase/add_profile_email.sql`    (email column on profiles; required for email routing)

Sanity check after running: the SQL editor should report success with no red errors, and
`select * from public.notifications limit 1;` should work (empty result is fine).

---

## Part B - Deploy the Edge Functions

```
supabase functions deploy public-reviews --no-verify-jwt
supabase functions deploy send-email
supabase functions deploy send-push
```

`public-reviews` is deployed with `--no-verify-jwt` on purpose: the landing page calls it
with no login, and it only ever returns already-approved reviews using the service role.
`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected by Supabase automatically, so
you do not set those yourself.

---

## Part C - Generate VAPID keys (for push)

Run once and keep the output somewhere safe:

```
npx web-push generate-vapid-keys
```

It prints a Public Key and a Private Key. You will use the Public Key in two places (the
push function secret and the client env), and the Private Key only in the push function.

---

## Part D - Function secrets

Set these with `supabase secrets set NAME=value` (you can pass several at once).

For email (send-email):

```
supabase secrets set RESEND_API_KEY=re_your_key_here
supabase secrets set EMAIL_FROM="Coral Shopping <hello@your-verified-domain>"
supabase secrets set SITE_URL=https://coral-shopping-phi.vercel.app
supabase secrets set OWNER_EMAIL=bolatitokehinde2019@gmail.com
```

For push (send-push) - use the keys from Part C:

```
supabase secrets set VAPID_PUBLIC_KEY=your_public_key
supabase secrets set VAPID_PRIVATE_KEY=your_private_key
supabase secrets set VAPID_SUBJECT=mailto:bolatitokehinde2019@gmail.com
```

Optional shared secret (recommended) so only Supabase can trigger the functions. If you set
it, you must add the matching header to BOTH webhooks in Part E:

```
supabase secrets set WEBHOOK_SECRET=some-long-random-string
```

Notes:
- `EMAIL_FROM` must be a sender Resend has verified, or delivery fails. Until you verify a
  domain you can use `onboarding@resend.dev` for testing (that is the built-in default).
- `SITE_URL` is used to build absolute links in emails and push; set it to your real shop
  URL once a custom domain is live.

---

## Part E - Database Webhooks (fan the insert out to email + push)

In the dashboard: Database -> Webhooks -> Create a new hook. Create TWO, both on the same
event:

Webhook 1 (email):
- Table: `public.notifications`
- Events: Insert
- Type: Supabase Edge Function -> `send-email`
- HTTP header (only if you set WEBHOOK_SECRET): `x-webhook-secret: <same value>`

Webhook 2 (push):
- Table: `public.notifications`
- Events: Insert
- Type: Supabase Edge Function -> `send-push`
- HTTP header (only if you set WEBHOOK_SECRET): `x-webhook-secret: <same value>`

That is it for the server side. Every new notification row now lights up the in-app bell,
sends an email to the right recipient, and pushes to that user's subscribed devices.

---

## Part F - Client environment variables (Vercel, shop project)

In the shop project's Settings -> Environment Variables, confirm/add:

- `VITE_SUPABASE_URL` = `https://bheebvpiutommdyoftht.supabase.co`
- `VITE_SUPABASE_ANON_KEY` = your anon key
- `VITE_VAPID_PUBLIC_KEY` = the SAME public key from Part C

The push toggle in the notification panel only appears when `VITE_VAPID_PUBLIC_KEY` is set,
so if you skip this the shop still works, just without device push. Redeploy after changing
env vars so the build picks them up.

---

## Part G - Build and deploy the shop

IMPORTANT: `package.json` gained `vite-plugin-pwa`, but `package-lock.json` has not been
regenerated yet. Vercel runs `npm ci`, which fails on an out-of-sync lockfile. So you must
run `npm install` locally first to refresh the lockfile and commit it. The push commands in
the chat message do exactly this.

Locally:

```
npm install      # pulls vite-plugin-pwa + workbox, updates package-lock.json
npm run build    # confirm a clean production build
```

Then commit the updated `package-lock.json` and push (see the push block in chat). Vercel
builds on push; the service worker, offline caching, and push handler ship with that build.

---

## Part I - Landing at /, shop at /shop (single Vercel project)

The site was restructured so the marketing landing page is the front door at `/` and the
React shop lives under `/shop`, all from ONE Vercel project (the existing
`coral-shopping-phi.vercel.app`). How it works:

- `vite.config.js` sets `base: '/shop/'` and `build.outDir: 'dist/shop'`, so the shop builds
  under `/shop`. The router uses `basename="/shop"` and the PWA scope/start_url are `/shop/`.
- `npm run build` runs `vite build` then `node scripts/assemble-site.mjs`, which copies the
  `landing/` folder into the root of `dist/`. Final layout: `dist/index.html` (landing) and
  `dist/shop/index.html` (shop).
- The root `vercel.json` serves the landing at `/`, falls back unknown `/shop/*` routes to
  the shop SPA shell, and 301-redirects the old shop URLs (`/products`, `/orders`, `/admin`,
  etc.) to their `/shop/...` equivalents so old bookmarks and links still work.

Action items for this project:

1. This is now a SINGLE Vercel project. If you still have a SEPARATE landing project pointed
   at the old landing URL, delete it (or leave it, but it is now redundant). The shop project
   is the one that serves everything.
2. In the shop project's Vercel settings, make sure the Root Directory is the repo root (not
   `landing/`) and the Output Directory is `dist` (the root `vercel.json` already declares
   this).
3. The shop is now reached at `https://coral-shopping-phi.vercel.app/shop`. Update
   `SITE_URL` for the Edge Functions to the shop path so email/push links land in the app:
   `supabase secrets set SITE_URL=https://coral-shopping-phi.vercel.app/shop`
4. In Supabase Auth -> URL Configuration, set the Site URL / redirect allow-list to include
   `https://coral-shopping-phi.vercel.app/shop` (sign-up confirmation now returns to /shop).

The old standalone `landing/vercel.json` is intentionally NOT copied into the build; the root
`vercel.json` is authoritative for the combined site.

---

## Part H - Test checklist

1. In-app: place a test order as a customer; the admin bell should show "New order".
2. Messaging: open the order as admin, send a message; the customer bell + email fire, and
   the message appears in the customer's order thread (and vice versa).
3. Reviews: as a customer, leave a review; it stays "pending". Approve it in Admin ->
   Reviews; reload the landing page and it should appear in the reviews strip.
4. Email: check the owner inbox (bolatitokehinde2019@gmail.com) and a customer inbox for
   the branded emails. If nothing arrives, check Resend logs and the webhook delivery log.
5. Push: click "Turn on device alerts" in the bell panel, allow the browser prompt, then
   trigger a notification; a system notification should appear. Turn it off to unsubscribe.

---

## Caveats

- iOS push requires iOS 16.4+ AND the site added to the Home Screen (installed as a PWA);
  it does not work in a normal Safari tab. Desktop Chrome/Edge/Firefox and Android Chrome
  work from a regular tab.
- Push and email both depend on the notification insert, so if the bell is silent, fix that
  first (Part A + realtime), then email/push.
- The landing page reads reviews through the public `public-reviews` function (no key in the
  page), so approving a review is all that is needed for it to show up there.
