// Client-side wrapper that calls the Netlify AI function at /.netlify/functions/ai
async function invokeAIAgent(systemPrompt, userQuery) {
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (window.NETLIFY_FUNCTIONS_API_KEY) headers['x-api-key'] = window.NETLIFY_FUNCTIONS_API_KEY;

    const res = await fetch('/.netlify/functions/ai', {
      method: 'POST',
      headers,
      body: JSON.stringify({ systemPrompt, userQuery })
    });
    if (!res.ok) {
      const text = await res.text();
      console.error('invokeAIAgent error', res.status, text);
      return null;
    }
    const json = await res.json();
    return json.text || null;
  } catch (err) {
    console.error('invokeAIAgent caught', err);
    return null;
  }
}

if (typeof window !== 'undefined') window.invokeAIAgent = invokeAIAgent;

