// Coral Shopping - transactional email for notifications, via Resend.
//
// Fires from a Supabase Database Webhook on INSERT into public.notifications.
// Every in-app notification can also become an email:
//   - notifications addressed to an admin  -> emailed to the shop owner
//   - notifications addressed to a customer -> emailed to that customer
// so the owner gets event alerts and customers get their own order updates.
//
// Setup (see SETUP-NOTIFICATIONS.md for the full walkthrough):
//   supabase functions deploy send-email
//   supabase secrets set RESEND_API_KEY=re_...
//   supabase secrets set OWNER_EMAIL=bolatitokehinde2019@gmail.com   # optional, this is the default
//   supabase secrets set EMAIL_FROM="Coral Shopping <hello@yourdomain>"  # a Resend-verified sender
//   supabase secrets set SITE_URL=https://your-shop-domain            # for absolute links in emails
//   supabase secrets set WEBHOOK_SECRET=some-long-random-string       # optional shared secret
// Then create a Database Webhook: table public.notifications, event Insert,
// type Supabase Edge Function -> send-email. Add header x-webhook-secret with
// the same value if you set WEBHOOK_SECRET.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const OWNER_EMAIL = Deno.env.get('OWNER_EMAIL') || 'bolatitokehinde2019@gmail.com';
const EMAIL_FROM = Deno.env.get('EMAIL_FROM') || 'Coral Shopping <onboarding@resend.dev>';
const SITE_URL = (Deno.env.get('SITE_URL') || 'https://coral-shopping-phi.vercel.app').replace(/\/+$/, '');
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET');

function esc(s: unknown): string {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as Record<string, string>)[c]);
}

function emailHtml(greeting: string, title: string, body: string, url: string): string {
  return `<!doctype html><html><body style="margin:0;background:#f4f4f7;font-family:Arial,Helvetica,sans-serif;color:#2C3E50">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:24px 0">
    <tr><td align="center">
      <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 8px 30px rgba(0,1,143,.08)">
        <tr><td style="background:#00018F;padding:20px 28px"><span style="color:#fff;font-size:20px;font-weight:700">Coral Shopping</span></td></tr>
        <tr><td style="padding:28px">
          <p style="margin:0 0 12px;font-size:15px">${esc(greeting)}</p>
          <h1 style="margin:0 0 10px;font-size:20px;color:#00018F">${esc(title)}</h1>
          <p style="margin:0 0 22px;font-size:15px;line-height:1.5">${esc(body)}</p>
          <a href="${esc(url)}" style="display:inline-block;background:#00018F;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:700;font-size:14px">View details</a>
          <p style="margin:24px 0 0;font-size:12px;color:#7F8C8D">Quality foodstuffs, gift hampers and household essentials, delivered across Abeokuta.</p>
        </td></tr>
      </table>
      <p style="margin:16px 0 0;font-size:11px;color:#9aa0a6">You are receiving this because of activity on your Coral Shopping account.</p>
    </td></tr>
  </table></body></html>`;
}

Deno.serve(async (req) => {
  if (WEBHOOK_SECRET && req.headers.get('x-webhook-secret') !== WEBHOOK_SECRET) {
    return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }
  if (!RESEND_API_KEY) {
    return new Response(JSON.stringify({ error: 'RESEND_API_KEY secret is not set' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  let payload: any;
  try { payload = await req.json(); } catch { return new Response(JSON.stringify({ error: 'invalid json' }), { status: 400, headers: { 'Content-Type': 'application/json' } }); }

  // Database Webhooks send { type, table, record, old_record }. Be liberal.
  const rec = payload?.record || payload?.new || payload;
  if (!rec || !rec.user_id) {
    return new Response(JSON.stringify({ skipped: 'no notification record' }), { headers: { 'Content-Type': 'application/json' } });
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
  const { data: prof } = await supabase.from('profiles').select('email, full_name, role').eq('id', rec.user_id).single();

  const isAdmin = prof?.role === 'admin';
  const to = isAdmin ? OWNER_EMAIL : prof?.email;
  if (!to) {
    return new Response(JSON.stringify({ skipped: 'no recipient email' }), { headers: { 'Content-Type': 'application/json' } });
  }

  const link = rec.link ? (String(rec.link).startsWith('http') ? String(rec.link) : SITE_URL + rec.link) : SITE_URL;
  const subject = rec.title || 'Coral Shopping update';
  const greeting = isAdmin
    ? 'Hello,'
    : 'Hi ' + (prof?.full_name ? String(prof.full_name).split(' ')[0] : 'there') + ',';
  const html = emailHtml(greeting, rec.title || 'Update', rec.body || '', link);

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: EMAIL_FROM, to: [to], subject, html }),
  });
  const out = await res.json().catch(() => ({}));
  return new Response(JSON.stringify({ ok: res.ok, id: (out as any)?.id, to }), {
    status: res.ok ? 200 : 502,
    headers: { 'Content-Type': 'application/json' },
  });
});
