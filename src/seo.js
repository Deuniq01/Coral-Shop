import { productImage } from './catalog.js';

export const DEFAULT_SITE_URL = 'https://coral-shopping-phi.vercel.app';
export function siteOrigin(value = DEFAULT_SITE_URL) {
  const url = new URL(value || DEFAULT_SITE_URL);
  if (!['https:', 'http:'].includes(url.protocol)) throw new Error('SITE_URL must be an HTTP(S) URL');
  return url.origin;
}
export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const jsonForHtml = value => JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
export const plainText = value => String(value || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
export const productPath = product => '/shop/products/' + encodeURIComponent(product.slug || product.id);
export function absoluteImage(value, origin) {
  try { const image = new URL(value, origin); return /^https?:$/.test(image.protocol) ? image.href : origin + '/shop/logo.png'; }
  catch { return origin + '/shop/logo.png'; }
}
export function businessSchema(origin) {
  return {'@context':'https://schema.org','@type':'Store','@id':origin+'/#store',name:'Coral Shopping',url:origin+'/',image:origin+'/img/food1.jpg',logo:origin+'/img/logo.png',telephone:'+2349061965441',address:{'@type':'PostalAddress',addressLocality:'Abeokuta',addressRegion:'Ogun',addressCountry:'NG'},areaServed:{'@type':'City',name:'Abeokuta'}};
}
export function pageMetadata(path, origin, {product, query = '', missing = false, unavailable = false} = {}) {
  const pages = {
    '/shop/': ['Coral Shop | Groceries, Gifts and Household Essentials in Abeokuta', 'Shop rice, beans, garri, cooking oils, gift hampers and household essentials from Coral Shopping, with delivery across Abeokuta.'],
    '/shop/products': ['Shop Products | Coral Shopping', 'Browse groceries, gift hampers and household essentials. Check product prices and availability, add items to your cart and order for delivery in Abeokuta.'],
    '/shop/sign-in': ['Sign In or Create an Account | Coral Shopping', 'Sign in to Coral Shopping or create an account to place orders and track your deliveries.'],
    '/shop/checkout': ['Checkout | Coral Shopping', 'Review your Coral Shopping cart, enter delivery details and place your order with payment by bank transfer.'],
    '/shop/orders': ['Your Orders | Coral Shopping', 'Sign in to view your Coral Shopping orders, confirm payment and track delivery updates.'],
    '/shop/dashboard': ['Your Account Dashboard | Coral Shopping', 'Manage your Coral Shopping profile, view orders and follow your custom shopping requests.'],
    '/shop/admin': ['Store Administration | Coral Shopping', 'The protected Coral Shopping administration area for managing products, orders and customer requests.'],
  };
  const known = pages[path];
  const [title, description] = known || ['Page Not Found | Coral Shopping', 'This page could not be found. Browse the Coral Shopping catalog for groceries, gifts and household essentials.'];
  const meta = { title, description, canonical: origin + path, url: origin + path, image: origin + '/img/food1.jpg', imageAlt: 'Coral Shopping groceries and household essentials', type:'website', noindex: !known || !['/shop/', '/shop/products'].includes(path), schemas: [] };
  if (path === '/shop/') meta.schemas = [businessSchema(origin), {'@context':'https://schema.org','@type':'WebSite',name:'Coral Shopping',url:origin+'/shop/'}];
  if (path === '/shop/products') meta.schemas = [{'@context':'https://schema.org','@type':'CollectionPage',name:title,description,url:meta.url}];
  if (query && path === '/shop/products') {
    meta.title = 'Search for ' + plainText(query).slice(0, 80) + ' | Coral Shopping';
    meta.description = 'Browse Coral Shopping products matching ' + plainText(query).slice(0, 80) + '. Find prices and availability for delivery in Abeokuta.';
    meta.url += '?q=' + encodeURIComponent(query);
    meta.noindex = true;
    meta.schemas = [];
  }
  if (product && !missing && !unavailable) {
    const name = plainText(product.name), price = Number(product.price);
    const priceText = new Intl.NumberFormat('en-NG',{style:'currency',currency:'NGN',maximumFractionDigits:0}).format(price);
    const stock = Number(product.stock_quantity) > 0;
    meta.title = name + ' | Coral Shopping';
    meta.description = (name + ' - ' + priceText + '. ' + (plainText(product.description) || 'Order from Coral Shopping for delivery in Abeokuta.') + (stock ? ' In stock.' : ' Out of stock.')).slice(0, 300);
    meta.canonical = meta.url = origin + productPath(product);
    meta.image = absoluteImage(productImage(product), origin);
    meta.imageAlt = name;
    meta.type = 'product';
    meta.noindex = false;
    meta.price = price.toFixed(2);
    meta.availability = stock ? 'in stock' : 'out of stock';
    meta.schemas = [
      {'@context':'https://schema.org','@type':'Product',name,description:plainText(product.description) || name,image:[meta.image],sku:String(product.id),url:meta.url,category:product.category?.name,offers:{'@type':'Offer',url:meta.url,price:meta.price,priceCurrency:'NGN',availability:'https://schema.org/'+(stock?'InStock':'OutOfStock'),seller:{'@type':'Organization',name:'Coral Shopping'}}},
      {'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'Shop',item:origin+'/shop/'},{'@type':'ListItem',position:2,name:'Products',item:origin+'/shop/products'},{'@type':'ListItem',position:3,name,item:meta.url}]}
    ];
  }
  if (missing || unavailable) {
    meta.title = unavailable ? 'Temporarily Unavailable | Coral Shopping' : 'Product Not Found | Coral Shopping';
    meta.description = unavailable ? 'This page is temporarily unavailable. Please try again shortly.' : 'This product is no longer available. Browse the Coral Shopping catalog for other groceries, gifts and household essentials.';
    meta.noindex = true;
    meta.schemas = [];
  }
  return meta;
}
export function metadataHtml(meta) {
  const tags = [
    '<title>' + escapeHtml(meta.title) + '</title>',
    '<link rel="canonical" href="' + escapeHtml(meta.canonical) + '">',
    ...Object.entries({description:meta.description,robots:meta.noindex?'noindex, follow':'index, follow, max-image-preview:large','twitter:card':'summary_large_image','twitter:title':meta.title,'twitter:description':meta.description,'twitter:image':meta.image,'twitter:image:alt':meta.imageAlt}).map(([name,value])=>'<meta name="'+name+'" content="'+escapeHtml(value)+'">'),
    ...Object.entries({'og:type':meta.type,'og:site_name':'Coral Shopping','og:locale':'en_NG','og:title':meta.title,'og:description':meta.description,'og:url':meta.url,'og:image':meta.image,'og:image:alt':meta.imageAlt}).map(([property,value])=>'<meta property="'+property+'" content="'+escapeHtml(value)+'">'),
  ];
  if (meta.price) tags.push('<meta property="product:price:amount" content="'+meta.price+'"><meta property="product:price:currency" content="NGN"><meta property="product:availability" content="'+meta.availability+'"><meta name="twitter:label1" content="Price"><meta name="twitter:data1" content="NGN '+meta.price+'"><meta name="twitter:label2" content="Availability"><meta name="twitter:data2" content="'+meta.availability+'">');
  for (const schema of meta.schemas) tags.push('<script type="application/ld+json" data-coral-seo>'+jsonForHtml(schema)+'</script>');
  return tags.join('\n    ');
}
export function replaceMetadata(html, meta) {
  return html.replace(/<title\b[^>]*>[\s\S]*?<\/title>/gi,'')
    .replace(/<meta\b[^>]*(?:name|property)=["'](?:description|robots|og:[^"']+|twitter:[^"']+|product:[^"']+)["'][^>]*>/gi,'')
    .replace(/<link\b[^>]*rel=["']canonical["'][^>]*>/gi,'')
    .replace(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi,'')
    .replace('</head>',metadataHtml(meta)+'\n  </head>');
}
