import React, { useState } from 'react';
import { productPath } from './seo.js';
import { shareProduct } from './share.js';

export default function ShareProduct({product}) {
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const share = async () => {
    setBusy(true);
    try { setStatus(await shareProduct(product)); }
    catch { setStatus('Copy the link below'); }
    finally { setBusy(false); }
  };
  return <div className="product-share">
    <button type="button" className="secondary share-product-button" aria-label={'Share '+product.name} aria-busy={busy} title={busy ? 'Sharing...' : status || 'Share product'} disabled={busy} onClick={share}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 10.5 6.8-4M8.6 13.5l6.8 4"/></svg>
    </button>
    <span className="share-status" role="status" aria-live="polite">{status}</span>
    {status === 'Copy the link below' && <input className="share-link" aria-label="Product link" readOnly value={window.location.origin + productPath(product)} onFocus={event=>event.target.select()}/>}
  </div>;
}
