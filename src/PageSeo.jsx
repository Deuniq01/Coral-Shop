import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { metadataHtml, pageMetadata, siteOrigin } from './seo.js';
import { sampleProducts } from './catalog.js';

export default function PageSeo({supabase}) {
  const {pathname, search} = useLocation();
  const [productState, setProductState] = useState(null);
  const path = pathname === '/' ? '/shop/' : '/shop' + pathname.replace(/\/$/, '');
  useEffect(()=>{
    let active = true;
    setProductState(null);
    if (!path.startsWith('/shop/products/')) return;
    let slug;
    try { slug = decodeURIComponent(path.slice('/shop/products/'.length)); } catch { setProductState({path,missing:true}); return; }
    if (!supabase) {
      const product = sampleProducts.find(p=>p.slug===slug || p.id===slug);
      setProductState({path,product,missing:!product});
      return;
    }
    const column = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(slug) ? 'id' : 'slug';
    supabase.from('products').select('*, category:categories(name,slug)').eq('is_active',true).eq(column,slug).maybeSingle().then(({data,error})=>{
      if (active) setProductState({path,product:data,missing:!error&&!data,unavailable:!!error});
    });
    return ()=>{active=false;};
  },[path,supabase]);
  useEffect(()=>{
    const origin = siteOrigin(import.meta.env.VITE_SITE_URL);
    const state = productState?.path === path ? productState : {};
    const meta = pageMetadata(path,origin,{...state,query:new URLSearchParams(search).get('q') || ''});
    if (path.startsWith('/shop/products/') && !productState && document.querySelector('meta[property="og:url"]')?.content === origin + path) return;
    document.head.querySelectorAll('title, link[rel="canonical"], meta[name="description"], meta[name="robots"], meta[property^="og:"], meta[property^="product:"], meta[name^="twitter:"], script[type="application/ld+json"]').forEach(node=>node.remove());
    const template = document.createElement('template');
    template.innerHTML = metadataHtml(meta);
    document.head.appendChild(template.content);
  },[path,search,productState]);
  return null;
}
