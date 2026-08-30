-- Remove duplicate placeholder products from the live catalog.
--
-- seed_products.sql originally shipped 4 extra rows that duplicated existing
-- curated products at different slugs and prices. Because the slugs differed,
-- the "on conflict (slug) do nothing" guard did not catch them, so a database
-- seeded before this cleanup shows each item twice at two different prices.
--
--   premium-rice-50kg   duplicated  premium-basmati-rice-50kg
--   vegetable-oil-5l    reused the 25L oil image and description
--   gift-basket-deluxe  duplicated  luxury-gift-basket
--   cleaning-kit-pro    duplicated  cleaning-detergent-5kg
--
-- Safe to run: order_items.product_id is "on delete set null" and each line
-- stores a product_name / unit_price snapshot, so past orders are preserved.
-- Idempotent: deleting slugs that no longer exist is a no-op.

delete from public.products
where slug in (
  'premium-rice-50kg',
  'vegetable-oil-5l',
  'gift-basket-deluxe',
  'cleaning-kit-pro'
);
