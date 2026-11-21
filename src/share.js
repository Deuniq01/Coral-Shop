import { productPath } from './seo.js';

export async function shareProduct(product, {navigator: nav = navigator, origin = window.location.origin, document: doc = document} = {}) {
  const url = origin + productPath(product);
  const title = product.name + ' | Coral Shopping';
  const price = new Intl.NumberFormat('en-NG', {style:'currency',currency:'NGN',maximumFractionDigits:0}).format(Number(product.price));
  if (nav.share) {
    try { await nav.share({title,text:(product.name+' - '+price+'. '+(product.description || '')).trim(),url}); return 'Shared'; }
    catch (error) { if (error.name === 'AbortError') return ''; }
  }
  try { await nav.clipboard.writeText(url); return 'Link copied'; }
  catch {
    const input = doc.createElement('textarea');
    input.value = url;
    input.style.position = 'fixed';
    input.style.opacity = '0';
    doc.body.appendChild(input);
    input.select();
    let copied = false;
    try { copied = doc.execCommand('copy'); } finally { input.remove(); }
    return copied ? 'Link copied' : 'Copy the link below';
  }
}
