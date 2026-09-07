// Coral Shopping - device push delivery via Web Push (VAPID).
//
// Fires from a Supabase Database Webhook on INSERT into public.notifications
// (the same event that drives the in-app bell and email). It looks up the
// recipient's push subscriptions and sends each one a push message. Expired
// subscriptions (404/410) are pruned automatically.
//
// Setup (see SETUP-NOTIFICATIONS.md for the full walkthrough):
//   1. Generate VAPID keys once:  npx web-push generate-vapid-keys
//   2. supabase functions deploy send-push
//   3. supabase secrets set VAPID_PUBLIC_KEY=...  VAPID_PRIVATE_KEY=...
//      supabase secrets set VAPID_SUBJECT=mailto:bolatitokehinde2019@gmail.com
//      supabase secrets set SITE_URL=https://your-shop-domain
//      supabase secrets set WEBHOOK_SECRET=...   # optional, matches the webhook header
//   4. Put the SAME public key in the shop's env as VITE_VAPID_PUBLIC_KEY and redeploy.
//   5. Create a second Database Webhook on public.notifications (Insert) -> send-push.

import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const PUB = Deno.env.get('VAPID_PUBLIC_KEY');
const PRIV = Deno.env.get('VAPID_PRIVATE_KEY');
const SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:bolatitokehinde2019@gmail.com';
const SITE_URL = (Deno.env.get('SITE_URL') || 'https://coral-shopping-phi.vercel.app').replace(/\/+$/, '');
const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET');

if (PUB && PRIV) webpush.setVapidDetails(SUBJECT, PUB, PRIV);

function json(o: unknown, status = 200): Response {
  return new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json' } });
}

Deno.serve(async (req) => {
  if (WEBHOOK_SECRET && req.headers.get('x-webhook-secret') !== WEBHOOK_SECRET) return json({ error: 'forbidden' }, 403);
  if (!PUB || !PRIV) return json({ error: 'VAPID keys are not set' }, 500);

  let payload: any;
  try { payload = await req.json(); } catch { return json({ error: 'invalid json' }, 400); }
  const rec = payload?.record || payload?.new || payload;
  if (!rec || !rec.user_id) return json({ skipped: 'no notification record' });

  const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
  const { data: subs } = await supabase.from('push_subscriptions').select('*').eq('user_id', rec.user_id);
  if (!subs || !subs.length) return json({ skipped: 'no subscriptions' });

  const url = rec.link ? (String(rec.link).startsWith('http') ? String(rec.link) : SITE_URL + rec.link) : SITE_URL;
  const body = JSON.stringify({ title: rec.title || 'Coral Shopping', body: rec.body || '', url });

  let sent = 0, removed = 0;
  for (const s of subs) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body);
      sent++;
    } catch (err: any) {
      const code = err?.statusCode || err?.status;
      if (code === 404 || code === 410) {
        await supabase.from('push_subscriptions').delete().eq('endpoint', s.endpoint);
        removed++;
      }
    }
  }
  return json({ sent, removed });
});
