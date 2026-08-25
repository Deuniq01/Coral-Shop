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
// The client calls this with: supabase.functions.invoke('ai-chat', { body: { messages } })

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
    const { messages } = await req.json();

    // Pull the live, active catalogue so the model recommends real items.
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );
    const { data: products } = await supabase
      .from('products')
      .select('name, price, category:categories(name)')
      .eq('is_active', true)
      .limit(80);

    const catalogue = (products || [])
      .map((p: any) => `${p.name} - ${money(p.price)} (${(p.category && p.category.name) || 'Essentials'})`)
      .join('\n');

    const system = [
      'You are the shopping assistant for Coral Shopping, an Abeokuta store for foodstuffs, gifts and household essentials.',
      'Be warm, short and helpful, like a friendly neighbour.',
      'Answer based on the customer question and the catalogue below. Recommend products by their exact catalogue names, explain delivery across Abeokuta, bank transfer payments, and the Shop Your Way custom request form.',
      'Do not use em dashes.',
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
        messages: [{ role: 'system', content: system }, ...(messages || [])],
      }),
    });

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content?.trim() || 'Sorry, I could not get a reply right now.';
    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
