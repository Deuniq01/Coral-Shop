// Shopping assistant for Coral Shopping.
// It answers live: when Supabase is configured it calls the secure
// `ai-chat` Edge Function (which is catalogue aware and keeps the LLM key
// server side as a Supabase secret), and falls back to the local brain
// when the function is unavailable (offline, preview, or not deployed).
//
// There is deliberately no browser-direct LLM path here: a `VITE_`-prefixed
// API key would be baked into the shipped client bundle and exposed to every
// visitor. All real-model calls go through the Edge Function instead.

import { sampleProducts } from './media.js';

function money(n) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(Number(n || 0));
}

// Words that carry no product meaning, so we drop them before matching.
const STOP_WORDS = new Set(['do','you','have','sell','any','some','is','are','the','a','an','of','for','me','my','i','we','want','need','looking','look','get','buy','please','can','could','would','and','to','in','on','at','it','that','this','how','much','many','price','cost','costs','stock','available','abeg','biko','pls','plz','naira']);

// Casual and local phrasings mapped to catalogue vocabulary, so "provisions",
// "cooking oil" or "tissue" all reach the right products.
const SYNONYMS = {
  provisions: 'foodstuffs', groceries: 'foodstuffs', foodstuff: 'foodstuffs', food: 'foodstuffs',
  oil: 'oil', 'cooking oil': 'vegetable oil', groundnut: 'groundnut oil', vegetable: 'vegetable oil',
  tissue: 'toilet paper', 'toilet roll': 'toilet paper', tissuepaper: 'toilet paper',
  soap: 'hand soap', detergent: 'cleaning detergent', omo: 'cleaning detergent',
  towel: 'kitchen towels', towels: 'kitchen towels',
  hamper: 'gift basket', present: 'gift', gifts: 'gift', giftbox: 'gift box',
  rice: 'rice', beans: 'beans', garri: 'garri', gari: 'garri', spaghetti: 'pasta', macaroni: 'pasta',
  sugar: 'sugar', salt: 'salt', vase: 'vase',
  package: 'foodstuff package', packages: 'foodstuff package', combo: 'package', bundle: 'package', pack: 'package',
};

function tokenize(s) {
  return (s || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
}

// Meaningful search terms only: drop stop words, expand synonyms.
function keywords(query) {
  const raw = (query || '').toLowerCase();
  const expanded = [];
  for (const [k, v] of Object.entries(SYNONYMS)) {
    if (k.includes(' ') && raw.includes(k)) expanded.push(...v.split(' '));
  }
  const toks = tokenize(query).map((t) => SYNONYMS[t] || t).flatMap((t) => t.split(' '));
  return [...new Set([...toks, ...expanded])].filter((t) => t.length > 1 && !STOP_WORDS.has(t));
}

// Levenshtein distance, capped small, so single-letter typos still match
// (e.g. "spagetti" -> "spaghetti", "detergnt" -> "detergent").
function fuzzyHit(token, hay) {
  if (token.length < 4) return hay.includes(token);
  if (hay.includes(token)) return true;
  for (const word of hay.split(/\s+/)) {
    if (Math.abs(word.length - token.length) > 2) continue;
    let prev = Array.from({ length: token.length + 1 }, (_, i) => i);
    for (let j = 1; j <= word.length; j++) {
      const cur = [j];
      for (let i = 1; i <= token.length; i++) {
        cur[i] = Math.min(prev[i] + 1, cur[i - 1] + 1, prev[i - 1] + (token[i - 1] === word[j - 1] ? 0 : 1));
      }
      prev = cur;
    }
    if (prev[token.length] <= (token.length > 6 ? 2 : 1)) return true;
  }
  return false;
}

export function findProducts(query, catalog) {
  const q = keywords(query);
  if (!q.length) return [];
  return (catalog || [])
    .map((p) => {
      const name = (p.name || '').toLowerCase();
      const hay = (name + ' ' + (p.description || '') + ' ' + ((p.category && p.category.name) || '')).toLowerCase();
      let score = 0;
      for (const t of q) {
        if (name.includes(t)) score += 3;        // a hit in the name is worth most
        else if (hay.includes(t)) score += 1.5;
        else if (fuzzyHit(t, hay)) score += 1;    // typo-tolerant fallback
      }
      return { p, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((x) => x.p);
}

function looksLikeGreeting(text) {
  return /^(hi+|hello+|hey+|good\s(morning|afternoon|evening)|howdy|yo|hiya|hello o|good day|wetin dey|how far)\b/.test((text || '').toLowerCase().trim());
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function stripFiller(t) {
  return keywords(t).join(' ');
}

// The offline brain. It tries to answer like a real shop assistant:
// varied phrasing, real prices from the catalogue, and it always stays
// in character even for questions it cannot answer.
function localReply(text, catalog, cart) {
  const t = (text || '').toLowerCase();
  const items = catalog && catalog.length ? catalog : sampleProducts;
  const hour = new Date().getHours();
  const dayPart = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';

  // Explicit "add X to cart" intent is checked before the cart summary,
  // otherwise the "my cart" substring in "add it to my cart" would be read
  // as a request to list the cart.
  if (/(add|put|include|place|drop).*(cart|basket)|(cart|basket).*(add|put)/.test(t)) {
    const matches = findProducts(t.replace(/\b(add|put|include|place|drop)\b|to (my )?(cart|basket)|\b(cart|basket)\b|please|for me|\bme\b/g, ' '), items);
    if (matches.length) {
      const p = matches[0];
      return { text: pick([
        `Done, ${p.name} is in your cart now (${money(p.price)}). Anything else?`,
        `Added ${p.name} for you, ${money(p.price)}. What else do you need?`,
        `Got it, ${p.name} added at ${money(p.price)}.`,
      ]), add: p };
    }
    return { text: 'I could not match that to anything in our catalogue. Try a product name like rice, garri, vegetable oil, or gift hamper and I will add it.' };
  }

  if (/what.s in my cart|my cart|cart total|how many items? (do i have|are in)/.test(t)) {
    if (!cart || !cart.length) return { text: 'Your cart is empty right now. Want me to suggest something?' };
    const total = cart.reduce((s, c) => s + Number(c.price || 0) * Number(c.quantity || 1), 0);
    const list = cart.map((c) => `${c.quantity} x ${c.name}`).join(', ');
    return { text: `You have ${list} in your cart, about ${money(total)} so far. Ready to checkout, or still adding things?` };
  }

  if (looksLikeGreeting(t)) {
    return { text: pick([
      `Good ${dayPart}! I can help you pick groceries, check prices, or put together a gift hamper. What are you shopping for?`,
      `Hey o, good ${dayPart}. Tell me what you need and I will sort you out.`,
      `Hello there, welcome to Coral Shopping. What can I get you?`,
      `Hi! What are we shopping for today?`,
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
    return { text: 'You can reach Coral Shopping on WhatsApp at 0906 196 5441, by email at kehindebolatito@gmail.com, or right here any time. What do you need?' };
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
      'These look like what you mean:',
    ]), products: found.slice(0, 4) };
  }

  // Last try before giving up: match on the filler-stripped message, so a
  // vague or misspelled product mention still surfaces something useful.
  const salvage = findProducts(stripFiller(t), items);
  if (salvage.length) {
    return { text: pick([
      'Not totally sure what you meant, but this might be it:',
      'I think you might be after one of these. Have a look:',
    ]), products: salvage.slice(0, 3) };
  }

  return { text: pick([
    'I want to be honest, I do not have that one in our catalogue right now. I can help with foodstuffs like rice, beans, garri and oils, gift hampers, or household items like detergent and tissue. What are you after? If it is something we do not stock, the Shop Your Way form on the home page lets you send a custom request and we will source it.',
    'I did not quite catch that one. Tell me a product name (rice, oil, a gift hamper, detergent) and I will check stock and price for you, or drop a custom request through the Shop Your Way form and we will get it for you.',
    'Hmm, not sure I followed. If you are after a product, give me the name and I will look it up. For anything else you can reach the team on WhatsApp at 0906 196 5441.',
  ]) };
}

export async function assistantReply(text, ctx = {}) {
  const catalog = ctx.catalog && ctx.catalog.length ? ctx.catalog : sampleProducts;
  const history = ctx.history && ctx.history.length ? ctx.history : [{ role: 'user', content: text }];

  // 1) Secure, catalogue-aware live model through Supabase Edge Function.
  // The LLM key stays server side; the browser never sees it.
  if (ctx.supabase) {
    try {
      const { data, error } = await ctx.supabase.functions.invoke('ai-chat', { body: { messages: history, cart: ctx.cart || [] } });
      if (!error && data && data.content) return { text: data.content, products: data.products && data.products.length ? data.products : undefined };
    } catch (e) {
      // fall through to the local brain
    }
  }

  // 2) Local brain so the chat still works offline / in preview
  return localReply(text, catalog, ctx.cart);
}
