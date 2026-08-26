-- Incremental migration for EXISTING projects only.
-- A brand-new project does not need this: schema.sql already creates the
-- product-images storage bucket and its policies.
--
-- Run this once in the Supabase SQL Editor if your project predates the
-- "upload a product image" feature in the admin panel. Safe to re-run.

insert into storage.buckets (id, name, public) values ('product-images', 'product-images', true) on conflict (id) do nothing;

drop policy if exists "public read product images" on storage.objects;
create policy "public read product images" on storage.objects for select using (bucket_id = 'product-images');

drop policy if exists "admins upload product images" on storage.objects;
create policy "admins upload product images" on storage.objects for insert with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "admins update product images" on storage.objects;
create policy "admins update product images" on storage.objects for update using (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "admins delete product images" on storage.objects;
create policy "admins delete product images" on storage.objects for delete using (bucket_id = 'product-images' and public.is_admin());
