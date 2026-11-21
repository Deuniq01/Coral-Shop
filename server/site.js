import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { sampleProducts } from '../src/catalog.js';
import { DEFAULT_SITE_URL, siteOrigin, pageMetadata, replaceMetadata, productPath, escapeHtml, plainText } from '../src/seo.js';

let cachedTemplate;
export async function deploymentConfig() {
  let built = {};
  try { built = JSON.parse(await readFile(join(process.cwd(),'dist/seo-config.json'),'utf8')); } catch {}
  return {
    origin: siteOrigin(process.env.SITE_URL || process.env.VITE_SITE_URL || built.origin || DEFAULT_SITE_URL),
    supabaseUrl: process.env.VITE_SUPABASE_URL || built.supabaseUrl || '',
    anonKey: process.env.VITE_SUPABASE_ANON_KEY || built.anonKey || '',
  };
}
export async function shopTemplate() {
  if (!cachedTemplate) cachedTemplate = await readFile(join(process.cwd(),'dist/shop/index.html'),'utf8');
  return cachedTemplate;
}
const isConfigured = config => Boolean(config.supabaseUrl && config.anonKey && !config.supabaseUrl.includes('your-project'));
const isUuid = value => /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(value);
export async function publicProducts(config, {slug, offset = 0, limit = 1000, fetchImpl = fetch} = {}) {
  if (!isConfigured(config)) return slug ? sampleProducts.filter(p=>p.slug===slug || p.id===slug) : sampleProducts.slice(offset,offset+limit);
  const endpoint = new URL('/rest/v1/products', config.supabaseUrl);
  endpoint.searchParams.set('select','id,name,slug,description,price,image_url,stock_quantity,category:categories(name,slug)');
  endpoint.searchParams.set('is_active','eq.true');
  endpoint.searchParams.set('order','id.asc');
  endpoint.searchParams.set('offset',String(offset));
  endpoint.searchParams.set('limit',String(slug ? 1 : limit));
  if (slug) endpoint.searchParams.set(isUuid(slug) ? 'id' : 'slug','eq.'+slug);
  const response = await fetchImpl(endpoint,{headers:{apikey:config.anonKey,Authorization:'Bearer '+config.anonKey},signal:AbortSignal.timeout(8000)});
  if (!response.ok) throw new Error('Public catalog unavailable: '+response.status);
  const products = await response.json();
  if (!Array.isArray(products)) throw new Error('Invalid catalog response');
  return products;
}
export async function allPublicProducts(config, fetchImpl = fetch) {
  const products = [];
  for (let offset=0; offset<50000; offset+=1000) {
    const page = await publicProducts(config,{offset,fetchImpl});
    products.push(...page);
    if (page.length<1000) return products;
  }
  throw new Error('Catalog exceeds one sitemap; split the sitemap before publishing');
}
function publicContent(meta, {product, products = []} = {}) {
  const e = escapeHtml;
  const nav = '<nav aria-label="Shop navigation"><a href="/">Coral Shopping</a> | <a href="/shop/">Shop home</a> | <a href="/shop/products">Products</a> | <a href="/shop/sign-in">Sign in</a></nav>';
  let content = '<h1>'+e(meta.title.replace(/ \| Coral Shopping$/,''))+'</h1><p>'+e(meta.description)+'</p>';
  if (product) {
    content = '<nav aria-label="Breadcrumb"><a href="/shop/">Shop</a> / <a href="/shop/products">Products</a> / '+e(product.name)+'</nav><h1>'+e(product.name)+'</h1><img src="'+e(meta.image)+'" alt="'+e(meta.imageAlt)+'" width="600" height="600" fetchpriority="high"><p>'+e(plainText(product.description))+'</p><p><strong>NGN '+e(meta.price)+'</strong></p><p>'+e(meta.availability)+'</p>';
  }
  if (products.length) content += '<h2>Browse products</h2><ul>'+products.map(p=>'<li><a href="'+e(productPath(p))+'">'+e(p.name)+'</a> - NGN '+e(p.price)+'</li>').join('')+'</ul>';
  return '<main class="section seo-initial-content">'+nav+content+'<noscript><p>Enable JavaScript to add products to your cart and place an order.</p></noscript></main>';
}
export async function pageResponse({path = '', query = ''} = {}, options = {}) {
  const config = options.config || await deploymentConfig();
  const origin = config.origin;
  // A rewrite supplies only the path below /shop. Never use a client Host header for canonical URLs.
  const relative = String(path).replace(/^\/+|\/+$/g,'');
  const pagePath = relative ? '/shop/'+relative : '/shop/';
  const queryText = String(query || '').slice(0,200);
  let product, products = [], missing = false, unavailable = false, status = 200;
  const detail = relative.startsWith('products/');
  const known = ['', 'products','sign-in','checkout','orders','dashboard','admin'].includes(relative);
  if (!known && !detail) status = 404;
  try {
    if (detail) {
      let slug;
      try { slug = decodeURIComponent(relative.slice('products/'.length)); } catch { missing = true; }
      if (!slug || slug.length>200 || /[\/\\\u0000-\u001f]/.test(slug)) missing = true;
      if (!missing) product = (await publicProducts(config,{slug,fetchImpl:options.fetchImpl}))[0];
      if (!product) { missing = true; status = 404; }
    } else if (relative === 'products' || relative === '') {
      products = relative === '' ? await publicProducts(config,{limit:4,fetchImpl:options.fetchImpl}) : await allPublicProducts(config, options.fetchImpl);
      if (relative === 'products' && queryText) {
        const q = queryText.toLowerCase().trim();
        products = products.filter(p=>(p.name+' '+(p.description||'')+' '+(p.category?.name||'')).toLowerCase().includes(q));
      }
    }
  } catch { unavailable = true; status = 503; }
  const meta = pageMetadata(pagePath,origin,{product,query:relative==='products'?queryText:'',missing,unavailable});
  const template = options.template || await shopTemplate();
  const body = replaceMetadata(template,meta).replace(/<div id="root">[\s\S]*?<\/div>/, '<div id="root">'+publicContent(meta,{product:status===200?product:null,products:status===200?products:[]})+'</div>');
  const headers = {'Content-Type':'text/html; charset=utf-8','Cache-Control':status===200&&!meta.noindex?'public, max-age=0, s-maxage=60, stale-while-revalidate=300':'no-store'};
  if (meta.noindex) headers['X-Robots-Tag'] = 'noindex, follow';
  if (status===503) headers['Retry-After'] = '60';
  return {status,headers,body};
}
export async function sitemapResponse(options = {}) {
  const config = options.config || await deploymentConfig();
  try {
    const products = await allPublicProducts(config, options.fetchImpl);
    const paths = ['/', '/privacy.html','/terms.html','/shop/','/shop/products', ...products.map(productPath)];
    const urls = [...new Set(paths)].map(path=>'<url><loc>'+escapeHtml(config.origin+path)+'</loc></url>').join('\n');
    return {status:200,headers:{'Content-Type':'application/xml; charset=utf-8','Cache-Control':'public, max-age=0, s-maxage=300'},body:'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+urls+'\n</urlset>'};
  } catch {
    return {status:503,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store','Retry-After':'60'},body:'Sitemap temporarily unavailable'};
  }
}
export async function robotsResponse(options = {}) {
  const config = options.config || await deploymentConfig();
  return {status:200,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'public, max-age=0, s-maxage=300'},body:'User-agent: *\nAllow: /\n\nSitemap: '+config.origin+'/sitemap.xml\n'};
}
