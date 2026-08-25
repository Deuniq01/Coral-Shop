// Lightweight shopping assistant for Coral Shopping.
// When VITE_AI_API_URL and VITE_AI_API_KEY are set it talks to an
// OpenAI-compatible chat endpoint. Otherwise it replies from the local
// catalog, so the chat still works in previews and offline.

import { sampleProducts } from './media.js';

const LLM_URL = import.meta.env.VITE_AI_API_URL;
const LLM_KEY = import.meta.env.VITE_AI_API_KEY;
const LLM_MODEL = import.meta.env.VITE_AI_MODEL || 'gpt-4o-mini';

function money(n) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(Number(n || 0));
}

function tokenize(s) {
  return (s || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
}

export function findProducts(query, catalog) {
  const q = tokenize(query);
  if (!q.length) return [];
  return (catalog || [])
    .map((p) => {
      const hay = ((p.name || '') + ' ' + (p.description || '') + ' ' + ((p.category && p.category.name) || '')).toLowerCase();
      let score = 0;
      for (const t of q) if (hay.includes(t)) score += 1;
      return { p, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((x) => x.p);
}

function looksLikeGreeting(text) {
  return /^(hi|hello|hey|good\s(morning|afternoon|evening)|howdy|yo|hiya)\b/.test((text || '').toLowerCase());
}

function localReply(text, catalog) {
  const t = (text || '').toLowerCase();
  const items = catalog && catalog.length ? catalog : sampleProducts;

  if (looksLikeGreeting(t)) {
    return { text: 'Hello and welcome to Coral Shopping. I can help you find products, explain delivery and payments, or add items to your cart. What are you looking for today?' };
  }

  // Add to cart intent
  if (/(add|put|include|place).*(cart|basket)|(cart|basket).*(add|put)/.test(t)) {
    const matches = findProducts(t.replace(/add|to (my )?cart|basket|please|me/g, ''), items);
    if (matches.length) {
      const p = matches[0];
      return { text: `Sure, I have added ${p.name} (${money(p.price)}) to your cart. Open the cart whenever you are ready to check out.`, add: p };
    }
    return { text: 'I could not find that item. Try a product name like rice, garri, vegetable oil, or gift hamper and I will add it for you.' };
  }

  if (/deliver|shipping|ship|location|lagos|address|area|cover/.test(t)) {
    return { text: `We deliver across Lagos. Delivery is a flat ${money(2000)} added at checkout, and you can pick a delivery date and time. Tell me your area and I will confirm it is covered.` };
  }
  if (/pay|payment|transfer|bank|deposit|account/.test(t)) {
    return { text: 'We use bank transfer for now. After you place an order you get our account details, and your order stays awaiting payment until you confirm the transfer. We verify before dispatch.' };
  }
  if (/hour|open|time|when|operat|available|working/.test(t)) {
    return { text: 'Our team takes orders and answers questions through the site and WhatsApp during the day. You can also send a custom request any time and we will reply. Reach us on WhatsApp at 0906 196 5441.' };
  }
  if (/return|refund|exchange|damaged|faulty|wrong/.test(t)) {
    return { text: 'If something arrives damaged or wrong, let us know right away through WhatsApp or your order page and we will arrange a replacement or refund.' };
  }
  if (/custom|request|source|find|special|specific|not in (the )?catalog|don.t see|dont see/.test(t)) {
    return { text: 'Cannot find it in the catalog? Use the Shop Your Way form on the home page to list what you need and your budget. Signed-in customers can send a custom request and we will source it for you.' };
  }
  if (/contact|whatsapp|phone|call|email|reach|number/.test(t)) {
    return { text: 'You can reach Coral Shopping on WhatsApp at 0906 196 5441, by email at info@coralshopping.ng, or right here any time.' };
  }
  if (/recommend|suggest|gift|hamper|present|idea|birthday|occasion/.test(t)) {
    const gifts = items.filter((p) => ((p.category && p.category.slug) || '').includes('gift') || /gift|hamper|basket|present/i.test(p.name || ''));
    if (gifts.length) {
      return { text: 'Here are a few gifting options our customers love:', products: gifts.slice(0, 3) };
    }
  }

  // Generic product search
  const found = findProducts(t, items);
  if (found.length) {
    return { text: 'Here is what I found in the catalog:', products: found };
  }

  return {
    text: 'I am not sure about that one. I can help with products, delivery across Lagos, payments, gifts, and custom requests. Try asking for rice, vegetable oil, a gift hamper, or how delivery works.',
  };
}

export async function assistantReply(text, ctx = {}) {
  const catalog = ctx.catalog && ctx.catalog.length ? ctx.catalog : sampleProducts;
  if (LLM_URL && LLM_KEY) {
    try {
      const res = await fetch(LLM_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${LLM_KEY}` },
        body: JSON.stringify({
          model: LLM_MODEL,
          messages: [
            {
              role: 'system',
              content:
                'You are the friendly shopping assistant for Coral Shopping, a Lagos store for foodstuffs, gifts and household essentials. Keep replies short, helpful and warm. Mention delivery across Lagos, bank transfer payments, and the Shop Your Way custom request form when relevant. Do not use em dashes.',
            },
            { role: 'user', content: text },
          ],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const content = data?.choices?.[0]?.message?.content?.trim();
        if (content) return { text: content };
      }
    } catch (e) {
      // fall through to the local reply
    }
  }
  return localReply(text, catalog);
}
