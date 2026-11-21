// Local media assets and image fallbacks for Coral Shopping.
// These keep the storefront showing real catalog photos even when
// Supabase is not configured, so the shop looks complete in local
// development and on preview environments.

export const brand = {
  // BASE_URL is '/shop/' in production so the logo resolves under the shop base.
  logo: import.meta.env.BASE_URL + 'logo.png',
};

// Bank details shown to customers for bank-transfer payment (checkout and
// the Orders page). VITE_BANK_* env vars override these defaults.
export const bank = {
  name: import.meta.env.VITE_BANK_NAME || 'Palmpay',
  account: import.meta.env.VITE_BANK_ACCOUNT || '9061965441',
  accountName: import.meta.env.VITE_BANK_ACCOUNT_NAME || 'Bolatito Roqeebah Kehinde',
};

export {heroImage,groceryFallback,aisles,productImage,sampleProducts} from './catalog.js';
