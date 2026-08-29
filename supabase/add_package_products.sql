-- Adds the 4 "foodstuff package" products shown on the landing page's
-- pricing tiers, so the landing page's Place Order buttons can link to a
-- real product with matching details instead of a generic single item.
--
-- Safe to re-run: uses on conflict (slug) do nothing, same as seed_products.sql.
-- Run this once in the Supabase SQL Editor for an already-deployed project.
-- New installs get these automatically from the updated seed_products.sql.

insert into public.products (name, slug, description, price, category_id, image_url, stock_quantity, is_active) values
  ('Starter Foodstuff Package', 'starter-foodstuff-package',
   'A complete starter pack for your kitchen. Includes: Rice, Beans (sorted), Garri, Vegetable Oil, Palm Oil, Tomato Paste, Curry & Thyme, and Salt.',
   15000.0, (select id from public.categories where slug = 'foodstuffs'),
   'https://images.unsplash.com/photo-1543168256-418811576931?w=600&h=600&fit=crop', 50, true)
  on conflict (slug) do nothing;

insert into public.products (name, slug, description, price, category_id, image_url, stock_quantity, is_active) values
  ('Standard Foodstuff Package', 'standard-foodstuff-package',
   'A bigger pack with more staples covered. Includes: Rice, Beans (sorted), Garri, Spaghetti, Vegetable Oil, Palm Oil, Tomato Paste, Dry Pepper, Curry & Thyme, and Salt.',
   25000.0, (select id from public.categories where slug = 'foodstuffs'),
   'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=600&h=600&fit=crop', 50, true)
  on conflict (slug) do nothing;

insert into public.products (name, slug, description, price, category_id, image_url, stock_quantity, is_active) values
  ('Family Foodstuff Package', 'family-foodstuff-package',
   'Our most popular package for a full household. Includes: Rice, Beans (sorted), Garri, Spaghetti, Vegetable Oil, Palm Oil, Tomato Paste, Dry Pepper, Crayfish, Curry & Thyme, and Salt.',
   40000.0, (select id from public.categories where slug = 'foodstuffs'),
   'https://images.unsplash.com/photo-1601599963565-b7f49deb2f8e?w=600&h=600&fit=crop', 50, true)
  on conflict (slug) do nothing;

insert into public.products (name, slug, description, price, category_id, image_url, stock_quantity, is_active) values
  ('Premium Foodstuff Package', 'premium-foodstuff-package',
   'Our top-tier package with larger quantities across the board for bigger households or longer stock-up periods. Includes: Rice, Beans (sorted), Garri, Spaghetti, Vegetable Oil, Palm Oil, Tomato Paste, Dry Pepper, Crayfish, Curry & Thyme, and Salt.',
   60000.0, (select id from public.categories where slug = 'foodstuffs'),
   'https://images.unsplash.com/photo-1608686207856-001b95cf60ca?w=600&h=600&fit=crop', 50, true)
  on conflict (slug) do nothing;
