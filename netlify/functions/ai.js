// Netlify Function proxy to OpenAI Chat Completions
const fetch = global.fetch || require('node-fetch');

const OPENAI_KEY = process.env.NETLIFY_OPENAI_KEY || process.env.OPENAI_API_KEY;
const FUNCTIONS_API_KEY = process.env.NETLIFY_FUNCTIONS_API_KEY || process.env.FUNCTIONS_API_KEY || process.env.API_KEY;

exports.handler = async function(event) {
  // Optional function-level API key
  if (FUNCTIONS_API_KEY) {
    const provided = (event.headers && (event.headers['x-api-key'] || event.headers['X-API-KEY'])) || null;
    if (!provided || provided !== FUNCTIONS_API_KEY) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized - missing or invalid API key' }) };
    }
  }

  if (!OPENAI_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'OpenAI API key not configured. Set NETLIFY_OPENAI_KEY.' }) };
  }

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const { systemPrompt, userQuery } = body;
    if (!systemPrompt || !userQuery) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing systemPrompt or userQuery' }) };
    }

    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userQuery }
        ],
        temperature: 0.7,
        max_tokens: 500
      })
    });

    if (!resp.ok) {
      const errText = await resp.text();
      return { statusCode: resp.status, body: JSON.stringify({ error: errText }) };
    }

    const data = await resp.json();
    const text = data.choices && data.choices[0] && data.choices[0].message ? data.choices[0].message.content : null;
    return { statusCode: 200, body: JSON.stringify({ text }) };
  } catch (err) {
    console.error('AI function error', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message || String(err) }) };
  }
};

