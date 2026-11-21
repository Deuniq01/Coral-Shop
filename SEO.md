SEO and product sharing

Production canonical origin: https://coral-shopping-phi.vercel.app.
Set VITE_SITE_URL at build time (and optionally SITE_URL at runtime) when moving to a custom domain. Use the same origin for both.

The Vercel HTML routes and Netlify functions return product-specific HTML before JavaScript runs. They read only active public products using the same Supabase anon credentials as the storefront, preserving RLS. Product pages include the product name, description, image, NGN price, availability, canonical URL, Open Graph and Twitter metadata, Product/Offer structured data and breadcrumbs. The browser updates this metadata on client navigation. Sharing is available on catalog cards and product detail pages, with native sharing, clipboard and manual-copy fallbacks.

Public pages have indexable titles, descriptions and canonical URLs. Checkout, sign-in, orders, dashboard, administration, search results and errors use noindex. Their previews describe the page without exposing customer details. Unknown products and routes return HTTP 404. Catalog outages return HTTP 503 and Retry-After instead of incorrect product details.

The combined sitemap at /sitemap.xml reads all active products in batches, plus the homepage, shop, catalog and legal pages. Private pages are excluded. Robots.txt allows crawling so crawlers can read each page's noindex directive. Product previews are cached for up to 60 seconds at the CDN, with up to five minutes of stale content while a refresh completes. Social platforms also maintain their own preview caches.

Run npm test and npm run build. Run npm run test:browser with Chrome installed (or set CHROME_PATH) for desktop/mobile browser checks. Browser checks use the demo catalog; live catalog responses are covered with controlled fixtures in the server tests. Run npm run seo:preview for a local production preview of the server HTML and sitemap; Vite preview alone does not emulate serverless functions.

For deployment, retain the included Vercel functions and HTML template configuration. Supabase credentials must match the browser's build configuration. The build stores only the public URL and anon key in dist/seo-config.json for the functions; never put a service-role key there. Dynamic product previews require the serverless deployment and cannot be provided by a static-only file host.

After deploying, verify a real product URL in Facebook Sharing Debugger and LinkedIn Post Inspector, and request a fresh scrape for previously shared links. WhatsApp and other apps decide which metadata fields to display and may cache old previews. Submit the sitemap in Google Search Console and inspect product pages. Search engines decide indexing, ranking and rich-result eligibility; metadata does not guarantee them.

Scope: SEO and sharing changes were made in Coral-Shop and Coral-Shopping, including the marketing copy bundled under Coral-Shop/landing. The older workspace CODE-REVIEW.md is historical and was not treated as a current list of bugs.
