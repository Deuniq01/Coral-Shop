// Vercel serverless function that receives the landing page contact form
// and emails it to the shop. The email provider key stays on the server,
// so it is never exposed in the browser.
//
// Setup (Vercel dashboard for the LANDING project, Settings > Environment
// Variables):
//   RESEND_API_KEY   your Resend API key (free tier at resend.com)
// Optional overrides:
//   CONTACT_TO       inbox that receives messages (defaults below)
//   CONTACT_FROM     verified sender (defaults to the Resend test sender)
//
// Until RESEND_API_KEY is set the endpoint returns a clear message so the
// form can point visitors to WhatsApp or email in the meantime.

const CONTACT_TO = process.env.CONTACT_TO || 'kehindebolatito@gmail.com';
const CONTACT_FROM = process.env.CONTACT_FROM || 'Coral Shopping <onboarding@resend.dev>';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed.' });
  }

  const body = typeof req.body === 'string' ? parseForm(req.body) : (req.body || {});
  const name = String(body.name || '').trim();
  const email = String(body.email || '').trim();
  const message = String(body.message || '').trim();
  const honeypot = String(body['bot-field'] || '').trim();

  // A filled honeypot means a bot. Report success and drop the message.
  if (honeypot) return res.status(200).json({ ok: true });

  if (name.length < 2 || !EMAIL_RE.test(email) || message.length < 10) {
    return res.status(400).json({ ok: false, error: 'Please add your name, a valid email, and a short message.' });
  }
  if (name.length > 100 || email.length > 200 || message.length > 4000) {
    return res.status(400).json({ ok: false, error: 'One of the fields is too long.' });
  }

  const key = process.env.RESEND_API_KEY;
  if (!key) {
    return res.status(503).json({
      ok: false,
      error: 'The contact form is not connected yet. Please reach us on WhatsApp at 0906 196 5441 or email kehindebolatito@gmail.com.',
    });
  }

  try {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: CONTACT_FROM,
        to: [CONTACT_TO],
        reply_to: email,
        subject: 'New contact form message from ' + name,
        text: 'Name: ' + name + '\nEmail: ' + email + '\n\n' + message,
      }),
    });

    if (!resp.ok) {
      const detail = await resp.text().catch(() => '');
      console.error('Resend responded with', resp.status, detail);
      return res.status(502).json({ ok: false, error: 'We could not send your message right now. Please try WhatsApp or email.' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Contact function error:', err);
    return res.status(502).json({ ok: false, error: 'We could not send your message right now. Please try WhatsApp or email.' });
  }
}

// Fallback parser for urlencoded bodies, in case the platform does not
// pre-parse req.body for us.
function parseForm(raw) {
  const out = {};
  for (const pair of String(raw).split('&')) {
    if (!pair) continue;
    const idx = pair.indexOf('=');
    const k = idx === -1 ? pair : pair.slice(0, idx);
    const v = idx === -1 ? '' : pair.slice(idx + 1);
    out[decodeURIComponent(k.replace(/\+/g, ' '))] = decodeURIComponent(v.replace(/\+/g, ' '));
  }
  return out;
}
