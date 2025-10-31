// Browser shim that exposes trickleListObjects, trickleCreateObject, trickleUpdateObject, trickleDeleteObject
// It talks to the Netlify serverless function at /.netlify/functions/api

async function callApi(payload) {
  const headers = { 'Content-Type': 'application/json' };
  // Add API key if configured globally (your build process can inject this)
  if (window.NETLIFY_FUNCTIONS_API_KEY) {
    headers['x-api-key'] = window.NETLIFY_FUNCTIONS_API_KEY;
  }
  
  const res = await fetch('/.netlify/functions/api', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API error: ${res.status} ${err}`);
  }
  return res.json();
}

async function trickleListObjects(resource, limit = 100, includeData = true) {
  const result = await callApi({ action: 'list', resource, limit });
  // Adapt to old shape used by code: { items: [{ objectId, objectData }] }
  return { items: (result.items || []) };
}

async function trickleCreateObject(resource, objectData) {
  const result = await callApi({ action: 'create', resource, data: objectData });
  return { objectId: result.objectId, objectData: result.objectData };
}

async function trickleUpdateObject(resource, id, partialData) {
  const result = await callApi({ action: 'update', resource, id, data: partialData });
  return { objectId: result.objectId, objectData: result.objectData };
}

async function trickleDeleteObject(resource, id) {
  const result = await callApi({ action: 'delete', resource, id });
  return { objectId: result.objectId };
}

// Expose globally in browser so existing code which calls these globals keeps working
if (typeof window !== 'undefined') {
  window.trickleListObjects = trickleListObjects;
  window.trickleCreateObject = trickleCreateObject;
  window.trickleUpdateObject = trickleUpdateObject;
  window.trickleDeleteObject = trickleDeleteObject;
}

