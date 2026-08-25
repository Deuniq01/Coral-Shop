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
  return /^(hi|hello|hey|good\s(morning|afternoon|evening)|howdy|yo|hiya|hello o)\b/.test((text || '').toLowerCase());
}

function localReply(text, catalog) {
  const t = (text || '').toLowerCase();
  const items = catalog && catalog.length ? catalog : sampleProducts;

  if (looksLikeGreeting(t)) {
    return { text: 'Hello o! Welcome to Coral Shopping. I am here to help you find what you need, explain delivery around Abeokuta, or add items to your cart. What are you looking for today?' };
  }

  // Add to cart intent
  if (/(add|put|include|place).*(cart|basket)|(cart|basket).*(add|put)/.test(t)) {
    const matches = findProducts(t.replace(/add|to (my )?cart|basket|please|me/g, ''), items);
    if (matches.length) {
      const p = matches[0];
      return { text: `Done! I have added ${p.name} (${money(p.price)}) to your cart. Open the cart whenever you are ready to check out.`, add: p };
    }
    return { text: 'Hmm, I could not find that one. Try a product name like rice, garri, vegetable oil, or gift hamper and I will add it for you.' };
  }

  if (/deliver|shipping|ship|location|abeokuta|lagos|address|area|cover/.test(t)) {
    return { text: `We deliver right across Abeokuta and nearby areas. Delivery is a flat ${money(2000)} added at checkout, and you can choose your preferred delivery date and time. Which area are you in?` };
  }
  if (/pay|payment|transfer|bank|deposit|account/.test(t)) {
    return { text: 'We use bank transfer for now. After you place an order you get our account details, and your order stays awaiting payment until you confirm the transfer. We verify before we dispatch.' };
  }
  if (/hour|open|time|when|operat|available|working/.test(t)) {
    return { text: 'Our team is around during the day to take orders and answer questions through the site and WhatsApp. You can also drop a custom request any time and we will get back to you. Reach us on WhatsApp at 0906 196 5441.' };
  }
  if (/return|refund|exchange|damaged|faulty|wrong/.test(t)) {
    return { text: 'If anything arrives damaged or not as expected, let us know straight away through WhatsApp or your order page and we will sort out a replacement or refund.' };
  }
  if (/custom|request|source|find|special|specific|not in (the )?catalog|don.t see|dont see/.test(t)) {
    return { text: 'Cannot find it in the catalogue? Use the Shop Your Way form on the home page to list what you need and your budget. Signed-in customers can send a custom request and we will source it for you.' };
  }
  if (/contact|whatsapp|phone|call|email|reach|number/.test(t)) {
    return { text: 'You can reach Coral Shopping on WhatsApp at 0906 196 5441, by email at info@coralshopping.ng, or right here any time.' };
  }
  if (/recommend|suggest|gift|hamper|present|idea|birthday|occasion/.test(t)) {
    const gifts = items.filter((p) => ((p.category && p.category.slug) || '').includes('gift') || /gift|hamper|basket|present/i.test(p.name || ''));
    if (gifts.length) {
      return { text: 'Here are some gift options our customers love:', products: gifts.slice(0, 3) };
    }
  }

  // Generic product search
  const found = findProducts(t, items);
  if (found.length) {
    return { text: 'Here is what I found in the catalogue:' , products: found };
  }

  return {
    text: 'I am not quite sure about that one. I can help with products, delivery around Abeokuta, payments, gifts, and custom requests. Try asking for rice, vegetable oil, a gift hamper, or how delivery works.',
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
                'You are the friendly shopping assistant for Coral Shopping, an Abeokuta store for foodstuffs, gifts and household essentials. Keep replies short, warm and conversational, like a helpful neighbour. Mention delivery across Abeokuta, bank transfer payments, and the Shop Your Way custom request form when relevant. Do not use em dashes.',
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
