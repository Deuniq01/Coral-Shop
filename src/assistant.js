// Shopping assistant for Coral Shopping.
// It answers live: when Supabase is configured it calls the secure
// `ai-chat` Edge Function (which is catalogue aware), otherwise it can
// call an OpenAI-compatible endpoint directly via VITE_ env vars, and
// only falls back to the local brain when neither is available.

import { sampleProducts } from './media.js';

const LLM_URL = import.meta.env.VITE_AI_API_URL;
const LLM_KEY = import.meta.env.VITE_AI_API_KEY;
const LLM_MODEL = import.meta.env.VITE_AI_MODEL || 'gpt-4o-mini';

function money(n) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(Number(n || 0));
}

function catalogLines(catalog) {
  return (catalog || [])
    .map((p) => `${p.name} - ${money(p.price)} (${((p.category && p.category.name) || 'Essentials')})`)
    .join('\n');
}

function systemPrompt(catalog) {
  return [
    'You are the shopping assistant for Coral Shopping, an Abeokuta store for foodstuffs, gifts and household essentials.',
    'Be warm, short and helpful, like a friendly neighbour.',
    'Answer based on the customer question and the catalogue below. You can recommend products, explain delivery across Abeokuta, bank transfer payments, and the Shop Your Way custom request form.',
    'When you suggest a product, name it exactly as in the catalogue. Do not use em dashes.',
    '',
    'Catalogue:',
    catalogLines(catalog) || '(no products loaded)',
  ].join('\n');
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

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function stripFiller(t) {
  return t.replace(/do you have|do you sell|have any|any|available|in stock|stock|left|please|carrying|we|you|have|got|some|is|are|the|a|an|of|for|g|n|\u20a6|\d+/g, ' ');
}

// The offline brain. It tries to answer like a real shop assistant:
// varied phrasing, real prices from the catalogue, and it always stays
// in character even for questions it cannot answer.
function localReply(text, catalog) {
  const t = (text || '').toLowerCase();
  const items = catalog && catalog.length ? catalog : sampleProducts;
  const hour = new Date().getHours();
  const dayPart = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';

  if (looksLikeGreeting(t)) {
    return { text: pick([
      `Good ${dayPart}! Welcome to Coral Shopping. I can help you pick groceries, check prices, or put together a gift hamper. What are you shopping for today?`,
      `Hey o, good ${dayPart}! You have landed on the right spot. Tell me what you need and I will sort you out.`,
      `Hello there! I am here to help with foodstuffs, gifts and household items. What can I get you?`,
    ]) };
  }

  if (/how are you|how (is|was) it going|whats up|what( )s up/.test(t)) {
    return { text: pick([
      'I am doing well, thanks for asking! Ready to help you shop. What do you need today?',
      'All good here o! And you? Let me help you with your shopping.',
    ]) };
  }

  if (/who are you|what are you|your name|are you human|are you a robot/.test(t)) {
    return { text: "I am Coral's shopping assistant. Think of me as your personal buyer: I know what we stock, what it costs, and how delivery works in Abeokuta. What are you looking for?" };
  }

  if (/(add|put|include|place|drop).*(cart|basket)|(cart|basket).*(add|put)/.test(t)) {
    const matches = findProducts(t.replace(/add|to (my )?cart|basket|please|me|for me/g, ' '), items);
    if (matches.length) {
      const p = matches[0];
      return { text: `Done! I have added ${p.name} (${money(p.price)}) to your cart. Anything else I should throw in for you?`, add: p };
    }
    return { text: 'Hmm, I could not find that one in our catalogue. Try a product name like rice, garri, vegetable oil, or gift hamper and I will add it for you.' };
  }

  if (/(how much|price|cost|charge|rate|expensive|cheap|how many naira)/.test(t)) {
    const matches = findProducts(stripFiller(t), items);
    if (matches.length === 1) {
      return { text: `${matches[0].name} is ${money(matches[0].price)}. Want me to add it to your cart?` };
    }
    if (matches.length > 1) {
      return { text: 'Here are the prices for what you asked about:', products: matches.slice(0, 3) };
    }
    const prices = items.map(p => Number(p.price || 0)).filter(n => n > 0);
    if (prices.length) {
      return { text: `Our prices range from about ${money(Math.min(...prices))} to ${money(Math.max(...prices))} depending on the item. Tell me the exact product you are asking about and I will quote you right away.` };
    }
    return { text: 'Tell me the exact product you are asking about and I will quote you right away.' };
  }

  if (/what do you sell|what( )s (in )?stock|what do you (stock|deal in)|products do you|what do you have/.test(t)) {
    return { text: 'We stock foodstuffs like rice, beans, garri and oils, gift hampers for every occasion, and household items like detergent and tissue. Which section should I show you?', products: items.slice(0, 3) };
  }

  if (/(do you have|got|have any|available|stock|in stock|left|carry|carrying|sell)/.test(t) && !/when|hour|open|time/.test(t)) {
    const matches = findProducts(stripFiller(t), items);
    if (matches.length) {
      const p = matches[0];
      return { text: pick([
        `Yes, we have ${p.name} in stock right now at ${money(p.price)}. Shall I add it to your cart?`,
        `${p.name} is available and it goes for ${money(p.price)}. Want one?`,
      ]), products: matches.slice(0, 3) };
    }
    return { text: 'I do not see that exact item in our catalogue at the moment. Use the Shop Your Way form on the home page to send us a custom request and we will source it for you.' };
  }

  if (/deliver|shipping|ship|location|abeokuta|lagos|address|area|cover|how far/.test(t)) {
    return { text: pick([
      `We deliver right across Abeokuta and nearby areas. Delivery is a flat ${money(2000)} added at checkout, and most orders arrive within 24 to 48 hours after payment is confirmed. Which area are you in?`,
      `Delivery is simple: place your order, confirm the bank transfer, and we bring it to your door. It is a flat ${money(2000)} and we cover all of Abeokuta. Where should it go?`,
    ]) };
  }

  if (/pay|payment|transfer|bank|deposit|account|card|cash|pos|atm/.test(t)) {
    if (/card|pos|cash|atm|debit/.test(t)) {
      return { text: 'For now we take payment by bank transfer only. Once you place an order, the account details appear right on your order page and you can click the number to copy it. After you confirm, we verify the transfer before dispatching.' };
    }
    return { text: 'We use bank transfer for now. After you place an order you get our account details right on the order page (you can click the number to copy it), and your order stays awaiting payment until you confirm the transfer. We verify before we dispatch.' };
  }

  if (/track|where is my order|status of (my|the) order|my order/.test(t)) {
    return { text: 'You can follow your order any time on the My Orders page in your dashboard. It shows the status, the delivery schedule and the payment details. If it says awaiting payment, just make the transfer and confirm it, and we will move it along.' };
  }

  if (/hour|open|time|when|operat|working|when can/.test(t)) {
    return { text: pick([
      'Our team is around during the day to take orders and answer questions through the site and WhatsApp. You can also drop a custom request any time and we will get back to you. Reach us on WhatsApp at 0906 196 5441.',
      'We are up and taking orders through the day. Drop your order or a custom request on the site, or ping us on WhatsApp at 0906 196 5441 and we will sort you out.',
    ]) };
  }

  if (/return|refund|exchange|damaged|faulty|wrong/.test(t)) {
    return { text: 'If anything arrives damaged or not as expected, let us know straight away through WhatsApp or on your order page and we will sort out a replacement or refund for you. You are covered.' };
  }

  if (/custom|request|source|special|specific|not in (the )?catalog|don.t see|dont see|can you (get|find|buy)/.test(t)) {
    return { text: 'If we do not have it in the catalogue, we can still get it for you. Use the Shop Your Way form on the home page to list what you need and your budget, and we will source it and call you to confirm.' };
  }

  if (/contact|whatsapp|phone|call|email|reach|number/.test(t)) {
    return { text: 'You can reach Coral Shopping on WhatsApp at 0906 196 5441, by email at info@coralshopping.ng, or right here any time. What do you need?' };
  }

  if (/recommend|suggest|gift|hamper|present|idea|birthday|occasion|anniversary/.test(t)) {
    const gifts = items.filter(p => ((p.category && p.category.slug) || '').includes('gift') || /gift|hamper|basket|present/i.test(p.name || ''));
    if (gifts.length) {
      return { text: pick([
        'Here are some gift options our customers love. Which one are you leaning towards?',
        'For gifts, these are the favourites. Tell me the occasion and I will help you pick.',
      ]), products: gifts.slice(0, 3) };
    }
  }

  if (/thank|appreciate|3x|tnx/.test(t)) {
    return { text: pick([
      'You are most welcome! Anything else you need, just ask.',
      'No wahala at all! Happy shopping, and I am here if you need anything else.',
    ]) };
  }

  if (/bye|goodbye|see you|that( )s all/.test(t)) {
    return { text: pick([
      'Okay, happy shopping! I am right here whenever you need me.',
      'Bye o! Come back any time, we will be here.',
    ]) };
  }

  if (/sorry|apolog/.test(t)) {
    return { text: 'No apology needed at all! If there is anything we got wrong, just tell me and we will fix it. What else can I do for you?' };
  }

  const found = findProducts(t, items);
  if (found.length) {
    return { text: pick([
      'Here is what I found in our catalogue:',
      'Let me show you what we have for that:',
    ]), products: found.slice(0, 4) };
  }

  return { text: pick([
    'I want to be honest, I do not have that one in our catalogue at the moment. But I can help with rice, garri, oils, gift hampers and household items, or you can send the item through the Shop Your Way form and we will source it for you.',
    'Hmm, that is not something I can answer about our shop. If it is a product you need, drop it in the Shop Your Way form on the home page and our team will get back to you. Anything else I can help you with?',
    'I am not sure I understand that one. If you are looking for a product, tell me the name and I will check our catalogue for you. Otherwise, WhatsApp us on 0906 196 5441 and the team will take it from there.',
  ]) };
}

export async function assistantReply(text, ctx = {}) {
  const catalog = ctx.catalog && ctx.catalog.length ? ctx.catalog : sampleProducts;
  const history = ctx.history && ctx.history.length ? ctx.history : [{ role: 'user', content: text }];

  // 1) Secure, catalogue-aware live model through Supabase Edge Function
  if (ctx.supabase) {
    try {
      const { data, error } = await ctx.supabase.functions.invoke('ai-chat', { body: { messages: history } });
      if (!error && data && data.content) return { text: data.content };
    } catch (e) {
      // fall through to other options
    }
  }

  // 2) Direct OpenAI-compatible endpoint (set VITE_AI_API_URL + VITE_AI_API_KEY)
  if (LLM_URL && LLM_KEY) {
    try {
      const res = await fetch(LLM_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${LLM_KEY}` },
        body: JSON.stringify({ model: LLM_MODEL, messages: [{ role: 'system', content: systemPrompt(catalog) }, ...history] }),
      });
      if (res.ok) {
        const data = await res.json();
        const content = data?.choices?.[0]?.message?.content?.trim();
        if (content) return { text: content };
      }
    } catch (e) {
      // fall through to local
    }
  }

  // 3) Local brain so the chat still works offline / in preview
  return localReply(text, catalog);
}
