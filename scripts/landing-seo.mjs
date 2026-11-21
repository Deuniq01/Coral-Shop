export const DEFAULT_ORIGIN = 'https://coral-shopping-phi.vercel.app';
const e = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const json = value => JSON.stringify(value).replace(/</g,'\\u003c');
export function landingMetadata(html, filename, origin = DEFAULT_ORIGIN) {
  origin = new URL(origin).origin;
  const pages = {
    'index.html':['Coral Shopping | Groceries and Gift Hampers in Abeokuta','Order foodstuffs, gift hampers and household essentials from Coral Shopping. Browse our foodstuff packages and shop online for delivery in Abeokuta, Ogun State.','/','Coral Shopping groceries and household essentials','/img/food1.jpg'],
    'privacy.html':['Privacy Policy | Coral Shopping','Read how Coral Shopping collects, uses and protects your personal information when you create an account, place an order or request a delivery.','/privacy.html','Coral Shopping logo','/img/logo.png'],
    'terms.html':['Terms and Conditions | Coral Shopping','Read the Coral Shopping terms for orders, bank transfer payments, delivery, cancellations and returns.','/terms.html','Coral Shopping logo','/img/logo.png'],
    '404.html':['Page Not Found | Coral Shopping','This Coral Shopping page could not be found. Return to the homepage or browse our groceries, gift hampers and household essentials.','/404.html','Coral Shopping logo','/img/logo.png'],
  };
  const [title,description,path,alt,image] = pages[filename];
  const url=origin+path, imageUrl=origin+image;
  const tags = ['<title>'+e(title)+'</title>','<link rel="canonical" href="'+e(url)+'">'];
  for(const [name,value] of Object.entries({description,robots:filename==='404.html'?'noindex, follow':'index, follow, max-image-preview:large','twitter:card':filename==='index.html'?'summary_large_image':'summary','twitter:title':title,'twitter:description':description,'twitter:image':imageUrl,'twitter:image:alt':alt})) tags.push('<meta name="'+name+'" content="'+e(value)+'">');
  for(const [property,value] of Object.entries({'og:type':'website','og:site_name':'Coral Shopping','og:locale':'en_NG','og:title':title,'og:description':description,'og:url':url,'og:image':imageUrl,'og:image:alt':alt})) tags.push('<meta property="'+property+'" content="'+e(value)+'">');
  const schema = {'@context':'https://schema.org','@type':'WebPage',name:title,description,url,isPartOf:{'@type':'WebSite',name:'Coral Shopping',url:origin+'/'}};
  if(filename!=='404.html') tags.push('<script type="application/ld+json">'+json(schema)+'</script>');
  if(filename==='index.html') tags.push('<script type="application/ld+json">'+json({'@context':'https://schema.org','@type':'Store','@id':origin+'/#store',name:'Coral Shopping',url:origin+'/',image:imageUrl,logo:origin+'/img/logo.png',telephone:'+2349061965441',address:{'@type':'PostalAddress',addressLocality:'Abeokuta',addressRegion:'Ogun',addressCountry:'NG'},areaServed:{'@type':'City',name:'Abeokuta'}})+'</script>');
  return html.replace(/<title\b[^>]*>[\s\S]*?<\/title>/gi,'')
    .replace(/<meta\b[^>]*(?:name|property)=["'](?:description|robots|og:[^"']+|twitter:[^"']+)["'][^>]*>/gi,'')
    .replace(/<link\b[^>]*rel=["']canonical["'][^>]*>/gi,'')
    .replace(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi,'')
    .replace(/<meta\b[^>]*charset[^>]*>/gi,'')
    .replace(/<head>/i,'<head>\n    <meta charset="utf-8">')
    .replace('</head>',tags.join('\n    ')+'\n  </head>');
}
export function staticSitemap(origin = DEFAULT_ORIGIN) {
  return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+['/','/privacy.html','/terms.html'].map(path=>'<url><loc>'+e(new URL(origin).origin+path)+'</loc></url>').join('\n')+'\n</urlset>\n';
}
