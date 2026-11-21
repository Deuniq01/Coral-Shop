import test from 'node:test';
import assert from 'node:assert/strict';
import {pageResponse,sitemapResponse,robotsResponse,publicProducts} from '../server/site.js';
import {pageMetadata,replaceMetadata,productPath} from '../src/seo.js';
import {shareProduct} from '../src/share.js';
import {readFile} from 'node:fs/promises';

const origin='https://coral-shopping-phi.vercel.app';
const demo={origin,supabaseUrl:'',anonKey:''};
const live={origin,supabaseUrl:'https://example.supabase.co',anonKey:'public-anon-test-key'};
const template='<!doctype html><html lang="en"><head><title>Generic</title><meta property="og:title" content="Generic"><meta name="description" content="Generic"><link rel="canonical" href="https://old.example/"></head><body><div id="root"></div><script type="module" src="/shop/assets/app.js"></script></body></html>';
const rice={id:'12345678-1234-1234-1234-123456789012',slug:'premium-rice',name:'Premium Rice',description:'A 50kg bag of premium rice.',price:45000,image_url:'https://example.supabase.co/storage/v1/object/public/product-images/rice.jpg',stock_quantity:9,category:{name:'Foodstuffs',slug:'foodstuffs'}};
const fetchProduct=async()=>({ok:true,json:async()=>[rice]});

test('shared product HTML contains the exact product before JavaScript executes',async()=>{
  const response=await pageResponse({path:'products/premium-rice'},{config:live,template,fetchImpl:fetchProduct});
  assert.equal(response.status,200);
  assert.match(response.body,/<title>Premium Rice \| Coral Shopping<\/title>/);
  assert.match(response.body,/property="og:type" content="product"/);
  assert.match(response.body,/rice\.jpg/);
  assert.match(response.body,/product:price:amount" content="45000.00"/);
  assert.match(response.body,/<h1>Premium Rice<\/h1>/);
  assert.match(response.body,/https:\/\/schema.org\/InStock/);
  assert.match(response.body,/href="https:\/\/coral-shopping-phi.vercel.app\/shop\/products\/premium-rice"/);
  assert.equal((response.body.match(/<title>/g)||[]).length,1);
  assert.equal((response.body.match(/rel="canonical"/g)||[]).length,1);
  const schemas=[...response.body.matchAll(/<script type="application\/ld\+json"[^>]*>(.*?)<\/script>/g)].map(m=>JSON.parse(m[1]));
  assert.equal(schemas[0].offers.price,'45000.00');
  assert.equal(schemas[1].itemListElement.at(-1).name,'Premium Rice');
});
test('different products and out-of-stock products have their own previews',async()=>{
  const second={...rice,slug:'gift-basket',name:'Gift Basket',price:15000,stock_quantity:0};
  const meta=pageMetadata(productPath(second),origin,{product:second});
  assert.equal(meta.title,'Gift Basket | Coral Shopping');
  assert.match(meta.description,/15,000/);
  assert.equal(meta.schemas[0].offers.availability,'https://schema.org/OutOfStock');
  assert.equal(meta.canonical,origin+'/shop/products/gift-basket');
});
test('all account routes have distinct public descriptions and are excluded from indexing',async()=>{
  const titles=new Set();
  for(const path of ['sign-in','checkout','orders','dashboard','admin']){
    const response=await pageResponse({path},{config:demo,template});
    assert.equal(response.status,200);
    assert.equal(response.headers['X-Robots-Tag'],'noindex, follow');
    titles.add(response.body.match(/<title>(.*?)<\/title>/)[1]);
    assert.doesNotMatch(response.body,/Product"|"@type":"Offer/);
  }
  assert.equal(titles.size,5);
});
test('catalog search previews reflect the query and canonicalize to the catalog',async()=>{
  const response=await pageResponse({path:'products',query:'rice'},{config:demo,template});
  assert.match(response.body,/Search for rice/);
  assert.match(response.body,/og:url" content="[^"]*\?q=rice"/);
  assert.match(response.body,/canonical" href="[^"]*\/shop\/products"/);
  assert.equal(response.headers['X-Robots-Tag'],'noindex, follow');
});
test('missing and invalid product links return real 404 responses',async()=>{
  for(const path of ['products/not-real','products/%2Fetc','products/%ZZ','not-a-page']){
    const result=await pageResponse({path},{config:demo,template});
    assert.equal(result.status,404,path);
    assert.equal(result.headers['X-Robots-Tag'],'noindex, follow');
    assert.doesNotMatch(result.body,/"@type":"Product"/);
  }
});
test('catalog outages return 503 rather than invented product data or a false 404',async()=>{
  const fetchImpl=async()=>{throw new Error('offline')};
  const response=await pageResponse({path:'products/premium-rice'},{config:live,template,fetchImpl});
  assert.equal(response.status,503);
  assert.equal(response.headers['Retry-After'],'60');
  assert.doesNotMatch(response.body,/Premium Basmati|45000.00|"@type":"Product"/);
  assert.equal((await sitemapResponse({config:live,fetchImpl})).status,503);
});
test('only active public products are requested using the anon key',async()=>{
  let endpoint,headers;
  await publicProducts(live,{slug:rice.id,fetchImpl:async(url,options)=>{endpoint=url;headers=options.headers;return{ok:true,json:async()=>[rice]}}});
  assert.equal(endpoint.searchParams.get('is_active'),'eq.true');
  assert.equal(endpoint.searchParams.get('id'),'eq.'+rice.id);
  assert.equal(headers.apikey,live.anonKey);
  assert.equal(headers.Authorization,'Bearer '+live.anonKey);
});
test('metadata and structured data escape untrusted product content',()=>{
  const product={...rice,name:'Rice "><img src=x onerror=alert(1)>',description:'</script><script>alert(1)</script>',image_url:'javascript:alert(1)'};
  const html=replaceMetadata(template,pageMetadata(productPath(product),origin,{product}));
  assert.doesNotMatch(html,/<img src=x|<script>alert|javascript:alert/);
  const json=html.match(/<script type="application\/ld\+json"[^>]*>(.*?)<\/script>/)[1];
  assert.equal(JSON.parse(json)['@type'],'Product');
});
test('sitemap paginates the live catalog and excludes private and missing pages',async()=>{
  let calls=0;
  const fetchImpl=async url=>{
    calls++;const offset=Number(url.searchParams.get('offset'));
    return {ok:true,json:async()=>Array.from({length:offset===0?1000:2},(_,i)=>({...rice,id:'id-'+(offset+i),slug:'product-'+(offset+i)}))};
  };
  const response=await sitemapResponse({config:live,fetchImpl});
  assert.equal(response.status,200);
  assert.equal(calls,2);
  assert.match(response.body,/product-1001/);
  assert.doesNotMatch(response.body,/\/admin|\/checkout|\/dashboard|\/sign-in|404.html/);
  assert.equal((response.body.match(/<url>/g)||[]).length,1007);
  assert.match((await robotsResponse({config:demo})).body,/Sitemap: https:\/\/coral-shopping-phi.vercel.app\/sitemap.xml/);
});
test('native product sharing contains a clean URL, product name and price',async()=>{
  let payload;
  const result=await shareProduct(rice,{origin,navigator:{share:async data=>{payload=data}},document:{}});
  assert.equal(result,'Shared');
  assert.equal(payload.url,origin+'/shop/products/premium-rice');
  assert.match(payload.text,/Premium Rice.*45,000/);
});
test('copy fallback works, cancelled shares do not unexpectedly copy',async()=>{
  let copied;
  const result=await shareProduct(rice,{origin,navigator:{clipboard:{writeText:async url=>{copied=url}}},document:{}});
  assert.equal(result,'Link copied');assert.equal(copied,origin+productPath(rice));
  copied=null;
  const cancelled=await shareProduct(rice,{origin,navigator:{share:async()=>{throw Object.assign(new Error(),{name:'AbortError'})},clipboard:{writeText:async url=>{copied=url}}},document:{}});
  assert.equal(cancelled,'');assert.equal(copied,null);
});
test('denied clipboard access offers a manual copy link when the legacy copy fails',async()=>{
  let removed=false;
  const result=await shareProduct(rice,{origin,navigator:{clipboard:{writeText:async()=>{throw Error('denied')}}},document:{createElement:()=>({style:{},select(){},remove(){removed=true}}),body:{appendChild(){}},execCommand:()=>false}});
  assert.equal(result,'Copy the link below');assert.equal(removed,true);
});
test('Vercel HTML rewrites exclude service worker, manifest, icons and assets',async()=>{
  const config=JSON.parse(await readFile(new URL('../vercel.json',import.meta.url),'utf8'));
  const rule=config.rewrites.find(r=>r.source.startsWith('/shop/:path'));
  assert.equal(rule.destination,'/api/page?path=:path');
  const regex=new RegExp('^/shop/'+rule.source.slice('/shop/:path'.length)+'$');
  assert.ok(regex.test('/shop/products/premium-rice'));
  assert.ok(regex.test('/shop/dashboard'));
  for(const path of ['/shop/sw.js','/shop/logo.png','/shop/manifest.webmanifest','/shop/assets/app.js'])assert.equal(regex.test(path),false,path);
});
