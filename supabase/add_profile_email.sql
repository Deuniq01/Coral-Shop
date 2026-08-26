-- Incremental migration for EXISTING projects only.
-- A brand-new project does not need this: schema.sql already includes
-- profiles.email and keeps it filled via handle_new_user() and create_order().
--
-- Run this once in the Supabase SQL Editor if your project was set up
-- before profiles.email existed. Safe to re-run.

alter table public.profiles add column if not exists email text;

-- Backfill existing accounts from auth.users.
update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id and p.email is distinct from u.email;

-- Keep new signups filled in going forward.
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email) values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)), new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end; $$;

-- Self-heal on order creation so accounts that predate this migration still
-- get their email filled the next time they check out.
create or replace function public.create_order(items jsonb, shipping jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare order_id uuid; item jsonb; p public.products%rowtype; qty integer; subtotal_value numeric := 0; fee numeric := 2000;
begin
  if auth.uid() is null then raise exception 'Sign in is required'; end if;
  insert into public.profiles (id, email) select auth.uid(), u.email from auth.users u where u.id = auth.uid()
    on conflict (id) do update set email = coalesce(public.profiles.email, excluded.email);
  if jsonb_array_length(items) = 0 then raise exception 'Cart is empty'; end if;
  for item in select * from jsonb_array_elements(items) loop
    qty := (item->>'quantity')::integer;
    select * into p from public.products where id = (item->>'productId')::uuid and is_active = true for update;
    if not found then raise exception 'A selected product is unavailable'; end if;
    if qty < 1 or p.stock_quantity < qty then raise exception 'Insufficient stock for %', p.name; end if;
    subtotal_value := subtotal_value + (p.price * qty);
  end loop;
  insert into public.orders(user_id, shipping_name, shipping_phone, shipping_address, shipping_city, shipping_state, subtotal, delivery_fee, total)
  values (auth.uid(), shipping->>'name', shipping->>'phone', shipping->>'address', shipping->>'city', shipping->>'state', subtotal_value, fee, subtotal_value + fee)
  returning id into order_id;
  for item in select * from jsonb_array_elements(items) loop
    qty := (item->>'quantity')::integer;
    select * into p from public.products where id = (item->>'productId')::uuid for update;
    insert into public.order_items(order_id, product_id, product_name, unit_price, quantity, line_total)
    values (order_id, p.id, p.name, p.price, qty, p.price * qty);
    update public.products set stock_quantity = stock_quantity - qty, updated_at = now() where id = p.id;
  end loop;
  return order_id;
end; $$;
