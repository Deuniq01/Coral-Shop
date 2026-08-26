// Local media assets and image fallbacks for Coral Shopping.
// These keep the storefront showing real catalog photos even when
// Supabase is not configured, so the shop looks complete in local
// development and on preview environments.

export const brand = {
  logo: 'https://app.trickle.so/storage/public/images/anonymous/6e28483f-d0f7-43cc-b922-33b56d30e9b9.coral%20shopping_125319',
  mark: 'https://app.trickle.so/storage/app/coral%20shopping_125319.png',
  ogImage: 'https://app.trickle.so/storage/app/Cora%20logol.jpg',
};

// Bank details shown to customers for bank-transfer payment (checkout and
// the Orders page). VITE_BANK_* env vars override these defaults.
export const bank = {
  name: import.meta.env.VITE_BANK_NAME || 'Palmpay',
  account: import.meta.env.VITE_BANK_ACCOUNT || '9061965441',
  accountName: import.meta.env.VITE_BANK_ACCOUNT_NAME || 'Bolatito Roqeebah Kehinde',
};

export const heroImage =
  'https://images.unsplash.com/photo-1516594798947-e65505dbb29d?w=1200&h=800&fit=crop';

// Used when a product or section has no specific photo of its own.
export const groceryFallback =
  'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&h=800&fit=crop';

// Shop-by-aisle cards shown on the home page.
export const aisles = [
  {
    name: 'Rice',
    slug: 'foodstuffs',
    blurb: 'Basmati, local and premium rice by the bag.',
    image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&h=600&fit=crop',
  },
  {
    name: 'Gift baskets',
    slug: 'gifts',
    blurb: 'Hampers and gift boxes for every occasion.',
    image: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=600&h=600&fit=crop',
  },
  {
    name: 'Detergent',
    slug: 'household',
    blurb: 'Washing, cleaning and everyday household care.',
    image: 'https://images.unsplash.com/photo-1563453392212-326f5e854473?w=600&h=600&fit=crop',
  },
];

// Keyword to fallback image for products that arrive without an image_url.
const productFallbacks = [
  [/rice/i, 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500&h=500&fit=crop'],
  [/bean/i, 'https://images.unsplash.com/photo-1589542840482-c7c456d2e93c?w=500&h=500&fit=crop'],
  [/garri|casava/i, 'https://images.unsplash.com/photo-1625937286074-9ca519d5d9df?w=500&h=500&fit=crop'],
  [/oil/i, 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500&h=500&fit=crop'],
  [/sugar/i, 'https://images.unsplash.com/photo-1584043204475-8cc101d6c77a?w=500&h=500&fit=crop'],
  [/salt/i, 'https://images.unsplash.com/photo-1607755384475-8cc101d6c77a?w=500&h=500&fit=crop'],
  [/pasta|spaghetti|noodle/i, 'https://images.unsplash.com/photo-1551462147-37cc0f2da6a3?w=500&h=500&fit=crop'],
  [/hamper|basket|gift|box/i, 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=500&h=500&fit=crop'],
  [/vase/i, 'https://images.unsplash.com/photo-1578500494198-246f612d3b3d?w=500&h=500&fit=crop'],
  [/detergent|clean/i, 'https://images.unsplash.com/photo-1563453392212-326f5e854473?w=500&h=500&fit=crop'],
  [/tissue|toilet|paper/i, 'https://images.unsplash.com/photo-1584556326561-c8746083993b?w=500&h=500&fit=crop'],
  [/soap/i, 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=500&h=500&fit=crop'],
  [/towel/i, 'https://images.unsplash.com/photo-1585421514738-01798e348b17?w=500&h=500&fit=crop'],
];

export function productImage(product) {
  if (product && product.image_url) return product.image_url;
  const name = (product && product.name) || '';
  for (const [pattern, url] of productFallbacks) {
    if (pattern.test(name)) return url;
  }
  return groceryFallback;
}

// A small local catalog so the storefront still shows real products and
// photos when Supabase is not configured (for local previews and demos).
export const sampleProducts = [
  { id: 's1', name: 'Premium Basmati Rice (50kg)', description: 'High-quality long grain basmati rice, perfect for special occasions.', price: 85000, stock_quantity: 100, image_url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500&h=500&fit=crop', category: { name: 'Foodstuffs', slug: 'foodstuffs' } },
  { id: 's2', name: 'Brown Beans (10kg)', description: 'Fresh brown beans, rich in protein and perfect for Nigerian dishes.', price: 12000, stock_quantity: 100, image_url: 'https://images.unsplash.com/photo-1589542840482-c7c456d2e93c?w=500&h=500&fit=crop', category: { name: 'Foodstuffs', slug: 'foodstuffs' } },
  { id: 's3', name: 'White Garri (5kg)', description: 'Premium quality white garri, finely processed and hygienically packaged.', price: 4500, stock_quantity: 100, image_url: 'https://images.unsplash.com/photo-1625937286074-9ca519d5d9df?w=500&h=500&fit=crop', category: { name: 'Foodstuffs', slug: 'foodstuffs' } },
  { id: 's4', name: 'Vegetable Oil (25 Liters)', description: 'Pure vegetable cooking oil, ideal for all your cooking needs.', price: 45000, stock_quantity: 100, image_url: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500&h=500&fit=crop', category: { name: 'Foodstuffs', slug: 'foodstuffs' } },
  { id: 's5', name: 'Luxury Gift Basket', description: 'Beautifully curated gift basket with premium items.', price: 35000, stock_quantity: 100, image_url: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=500&h=500&fit=crop', category: { name: 'Gifts', slug: 'gifts' } },
  { id: 's6', name: 'Corporate Gift Hamper', description: 'Professional gift hamper perfect for business occasions.', price: 50000, stock_quantity: 100, image_url: 'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=500&h=500&fit=crop', category: { name: 'Gifts', slug: 'gifts' } },
  { id: 's7', name: 'Cleaning Detergent (5kg)', description: 'Powerful cleaning detergent for all household needs.', price: 8500, stock_quantity: 100, image_url: 'https://images.unsplash.com/photo-1563453392212-326f5e854473?w=500&h=500&fit=crop', category: { name: 'Household', slug: 'household' } },
  { id: 's8', name: 'Toilet Paper (Pack of 20)', description: 'Soft and absorbent toilet tissue, bulk pack.', price: 12000, stock_quantity: 100, image_url: 'https://images.unsplash.com/photo-1584556326561-c8746083993b?w=500&h=500&fit=crop', category: { name: 'Household', slug: 'household' } },
];
