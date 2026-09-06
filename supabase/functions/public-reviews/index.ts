// Coral Shopping - public approved-reviews endpoint for the landing page.
//
// The static landing site is not signed in, so it cannot query the database
// directly. This function returns only APPROVED reviews as plain JSON with open
// CORS, so the landing can render them as testimonials.
//
// Deploy as a public endpoint (no auth required):
//   supabase functions deploy public-reviews --no-verify-jwt
//
// It reads with the service role (available automatically in the function
// environment) and never exposes anything but approved, already-public reviews.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
    const { data, error } = await supabase
      .from('reviews')
      .select('author_name, rating, body, created_at')
      .eq('status', 'approved')
      .order('approved_at', { ascending: false })
      .limit(24);
    if (error) throw error;
    return new Response(JSON.stringify({ reviews: data ?? [] }), {
      headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' },
    });
  } catch (e) {
    // Fail soft: the landing simply hides the section when there is nothing.
    return new Response(JSON.stringify({ reviews: [], error: String(e) }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
