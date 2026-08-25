-- Coral Shop: run this once in the Supabase SQL editor.
create extension if not exists pgcrypto;

create type public.app_role as enum ('customer', 'admin');
create type public.order_status as enum ('awaiting_payment', 'pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  role public.app_role not null default 'customer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique
);
create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text not null default '',
  price numeric(12,2) not null check (price >= 0),
  category_id uuid references public.categories(id) on delete set null,
  image_url text,
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  status public.order_status not null default 'awaiting_payment',
  shipping_name text not null,
  shipping_phone text not null,
  shipping_address text not null,
  shipping_city text not null,
  shipping_state text not null,
  delivery_fee numeric(12,2) not null default 2000 check (delivery_fee >= 0),
  subtotal numeric(12,2) not null check (subtotal >= 0),
  total numeric(12,2) not null check (total >= 0),
  payment_submitted_at timestamptz,
  payment_confirmed_at timestamptz,
  delivery_scheduled_at timestamptz,
  delivery_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  unit_price numeric(12,2) not null check (unit_price >= 0),
  quantity integer not null check (quantity > 0),
  line_total numeric(12,2) not null check (line_total >= 0)
);
create type public.custom_request_status as enum ('new', 'contacted', 'closed');
create table public.custom_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  phone text not null,
  items text not null,
  budget text,
  status public.custom_request_status not null default 'new',
  admin_note text,
  created_at timestamptz not null default now()
);
create index orders_user_created_idx on public.orders(user_id, created_at desc);
create index products_active_idx on public.products(is_active);
create index custom_requests_created_idx on public.custom_requests(created_at desc);
create index custom_requests_user_idx on public.custom_requests(user_id, created_at desc);

create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name) values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)));
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

-- Prices, stock, and ownership are always decided on the server through this function.
create or replace function public.create_order(items jsonb, shipping jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare order_id uuid; item jsonb; p public.products%rowtype; qty integer; subtotal_value numeric := 0; fee numeric := 2000;
begin
  if auth.uid() is null then raise exception 'Sign in is required'; end if;
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

create or replace function public.submit_payment(order_id uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  update public.orders set status = 'pending', payment_submitted_at = now(), updated_at = now()
  where id = order_id and user_id = auth.uid() and status = 'awaiting_payment';
  if not found then raise exception 'This order cannot be marked as paid'; end if;
end; $$;
create or replace function public.confirm_payment(order_id uuid, scheduled_at timestamptz default null, note text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  update public.orders set status = 'paid', payment_confirmed_at = now(), delivery_scheduled_at = scheduled_at, delivery_note = note, updated_at = now()
  where id = order_id and status = 'pending';
  if not found then raise exception 'Only submitted payments can be confirmed'; end if;
end; $$;
create or replace function public.update_order_fulfillment(order_id uuid, next_status public.order_status, scheduled_at timestamptz default null, note text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  if next_status not in ('processing', 'shipped', 'delivered', 'cancelled') then raise exception 'Invalid fulfillment status'; end if;
  update public.orders set status = next_status, delivery_scheduled_at = coalesce(scheduled_at, delivery_scheduled_at), delivery_note = coalesce(note, delivery_note), updated_at = now() where id = order_id;
end; $$;

create or replace function public.custom_request_validate()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  nm text := trim(coalesce(new.name, ''));
  ph text := trim(coalesce(new.phone, ''));
  it text := trim(coalesce(new.items, ''));
  bd text := nullif(trim(coalesce(new.budget, '')), '');
begin
  if auth.uid() is null then raise exception 'Sign in is required'; end if;
  if not public.is_admin() then new.user_id := auth.uid(); end if;
  if new.user_id is null then new.user_id := auth.uid(); end if;
  if length(nm) < 2 or length(nm) > 80 then raise exception 'Please enter your name'; end if;
  if length(ph) < 7 or length(ph) > 20 or ph !~ '^[0-9+()[:space:]-]+$' then raise exception 'Please enter a valid phone number'; end if;
  if length(it) < 3 or length(it) > 2000 then raise exception 'Please describe the items you need'; end if;
  if bd is not null and length(bd) > 80 then raise exception 'Budget is too long'; end if;
  new.name := nm; new.phone := ph; new.items := it; new.budget := bd;
  if tg_op = 'INSERT' then new.status := 'new'; end if;
  return new;
end; $$;
create trigger custom_request_validate before insert on public.custom_requests
  for each row execute procedure public.custom_request_validate();

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.custom_requests enable row level security;
create policy "profiles are private" on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "public catalog" on public.categories for select using (true);
create policy "public active products" on public.products for select using (is_active or public.is_admin());
create policy "admins manage categories" on public.categories for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage products" on public.products for all using (public.is_admin()) with check (public.is_admin());
create policy "users see own orders" on public.orders for select using (user_id = auth.uid() or public.is_admin());
create policy "users see own order items" on public.order_items for select using (exists(select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_admin())));
-- Customers create and read their own requests; only admins update them.
drop policy if exists "admins read custom requests" on public.custom_requests;
create policy "customers create own custom requests" on public.custom_requests for insert to authenticated with check (user_id = auth.uid());
create policy "owners and admins read custom requests" on public.custom_requests for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "admins update custom requests" on public.custom_requests for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Seed categories. Import database/product.csv through Supabase's Table Editor after creating matching categories,
-- or use the importer documented in README.
insert into public.categories(name, slug) values ('Foodstuffs','foodstuffs'), ('Gifts','gifts'), ('Household','household') on conflict do nothing;
