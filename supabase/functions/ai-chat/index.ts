// Coral Shopping - live AI chat Edge Function
//
// Securely answers customer questions with a real LLM. The LLM key stays
// server side (set as a Supabase secret), and the live product catalogue
// is pulled from the database so replies are grounded in what we sell.
//
// Deploy:
//   supabase functions deploy ai-chat
//   supabase secrets set LLM_API_KEY=sk-...          # required
//   supabase secrets set LLM_API_URL=https://api.openai.com/v1/chat/completions  # optional
//   supabase secrets set LLM_MODEL=gpt-4o-mini       # optional
//
// The client calls this with: supabase.functions.invoke('ai-chat', { body: { messages, cart } })

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function money(n: number): string {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(Number(n || 0));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { messages, cart } = await req.json();

    // Pull the live, active catalogue so the model recommends real items.
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );
    const { data: products } = await supabase
      .from('products')
      .select('id, name, price, stock_quantity, image_url, category:categories(name)')
      .eq('is_active', true)
      .limit(80);

    const catalogue = (products || [])
      .map((p: any) => `${p.name} - ${money(p.price)} (${(p.category && p.category.name) || 'Essentials'})${p.stock_quantity < 1 ? ' [OUT OF STOCK]' : ''}`)
      .join('\n');

    const cartLine = Array.isArray(cart) && cart.length
      ? `The customer currently has this in their cart: ${cart.map((c: any) => `${c.quantity} x ${c.name}`).join(', ')}.`
      : 'The customer has an empty cart right now.';

    const system = [
      "You are the person who runs the chat for Coral Shopping, a store in Abeokuta selling foodstuffs, gift hampers and household essentials. You are not a generic AI assistant bot; you are staff, and you talk like it.",
      '',
      'How you sound:',
      '- Write like a real person texting on WhatsApp, not like a customer-support script. Short sentences. Contractions. No corporate filler like "I\'d be happy to help!" or "Great question!" or "Certainly!".',
      '- Professional and friendly, not overly excitable. Skip exclamation points unless something genuinely warrants one; do not put one on every line.',
      '- Vary how you open replies. Do not start every message the same way, and do not end every message with a question just for the sake of it, only ask one when you actually need info to help.',
      '- Keep replies tight: usually 1 to 3 short sentences. Do not dump the whole catalogue or every policy detail unless asked; answer what was asked, then stop.',
      '- Light, natural Nigerian English is fine where it fits ("o", "no wahala", "abeg") but do not force it into every message, and never overdo it.',
      '- If you genuinely do not know something, say so plainly in one line and point them at WhatsApp (0906 196 5441) or the Shop Your Way custom request form, rather than guessing.',
      '- Never invent a product, price, or policy that is not in the catalogue or the facts below. Quote prices exactly as listed.',
      '- When you recommend or confirm a product, use its exact catalogue name so it can be matched and shown to the customer.',
      '- Do not use em dashes.',
      '',
      'Facts you can rely on:',
      '- Delivery covers all of Abeokuta and nearby areas, flat fee ' + money(2000) + ', usually 24 to 48 hours after payment is confirmed.',
      '- Payment is by bank transfer only for now. Account details appear on the order page once an order is placed, not before. Orders sit as "awaiting payment" until the customer confirms the transfer, then the team verifies before dispatch.',
      '- Cannot find an item in the catalogue? Point them to the Shop Your Way custom request form on the home page.',
      '- Support: WhatsApp 0906 196 5441, email kehindebolatito@gmail.com.',
      '',
      cartLine,
      '',
      'Catalogue:',
      catalogue || '(no products loaded)',
    ].join('\n');

    const llmUrl = Deno.env.get('LLM_API_URL') || 'https://api.openai.com/v1/chat/completions';
    const llmKey = Deno.env.get('LLM_API_KEY');
    const llmModel = Deno.env.get('LLM_MODEL') || 'gpt-4o-mini';

    if (!llmKey) {
      return new Response(JSON.stringify({ error: 'LLM_API_KEY secret is not set on the ai-chat function.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const res = await fetch(llmUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${llmKey}` },
      body: JSON.stringify({
        model: llmModel,
        temperature: 0.8,
        messages: [{ role: 'system', content: system }, ...(messages || [])],
      }),
    });

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content?.trim() || 'Sorry, I could not get a reply right now. Try again in a moment or reach us on WhatsApp at 0906 196 5441.';

    // Surface clickable product cards for whichever catalogue items the
    // assistant actually named in its reply, so the UI can offer an Add
    // to cart button without the model needing to call a separate tool.
    const mentioned = (products || []).filter((p: any) => p.name && content.toLowerCase().includes(String(p.name).toLowerCase()));

    return new Response(JSON.stringify({ content, products: mentioned.slice(0, 4) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
