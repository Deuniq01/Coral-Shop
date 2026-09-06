-- Coral Shop: in-app notification system.
-- Run this once in the Supabase SQL editor (after schema.sql). Safe to re-run.
--
-- What it sets up:
--   1. A notifications table (one row per recipient) with RLS so each user
--      only ever sees their own rows.
--   2. Helper functions notify() and notify_admins() that other server-side
--      functions call to create notifications. Direct inserts by clients are
--      not allowed; notifications are always minted on the server.
--   3. mark_notifications_read() so a signed-in user can clear their unread
--      badge without being able to touch anyone else's rows.
--   4. Triggers that turn real events into notifications: a new order and a
--      new custom request alert the admins; an order status change alerts the
--      customer (or the admins when a payment is submitted for review).
--   5. Realtime enabled on the table so the bell updates live.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null default 'system',
  title text not null,
  body text not null default '',
  link text,
  order_id uuid references public.orders(id) on delete cascade,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications(user_id, created_at desc);
create index if not exists notifications_unread_idx on public.notifications(user_id) where read = false;

-- Mint a single notification for one recipient. security definer so the
-- callers below (and any Edge Function using the service role) can insert
-- past RLS, while regular clients cannot insert at all.
create or replace function public.notify(p_user uuid, p_type text, p_title text, p_body text, p_link text, p_order uuid default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare nid uuid;
begin
  if p_user is null then return null; end if;
  insert into public.notifications(user_id, type, title, body, link, order_id)
  values (p_user, p_type, p_title, coalesce(p_body,''), p_link, p_order)
  returning id into nid;
  return nid;
end; $$;

-- Fan a notification out to every admin (used for events the shop owner needs
-- to see, like a new order or a customer message).
create or replace function public.notify_admins(p_type text, p_title text, p_body text, p_link text, p_order uuid default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications(user_id, type, title, body, link, order_id)
  select id, p_type, p_title, coalesce(p_body,''), p_link, p_order
  from public.profiles where role = 'admin';
end; $$;

-- Clear the unread state for the calling user. Pass an array of ids to clear
-- specific ones, or null to clear everything. A user can only ever affect
-- their own rows.
create or replace function public.mark_notifications_read(p_ids uuid[] default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return; end if;
  update public.notifications set read = true
  where user_id = auth.uid() and read = false and (p_ids is null or id = any(p_ids));
end; $$;

-- New order -> tell the admins.
create or replace function public.on_order_created()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.notify_admins(
    'order', 'New order placed',
    coalesce(new.shipping_name, 'A customer') || ' just placed an order.',
    '/admin', new.id);
  return new;
end; $$;
drop trigger if exists orders_notify_created on public.orders;
create trigger orders_notify_created after insert on public.orders
  for each row execute procedure public.on_order_created();

-- Order status change -> tell the customer, except a fresh payment submission
-- which the admins need to verify.
create or replace function public.on_order_status_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare human text;
begin
  if new.status is distinct from old.status then
    if new.status = 'pending' then
      perform public.notify_admins(
        'order', 'Payment submitted',
        coalesce(new.shipping_name, 'A customer') || ' marked an order as paid. Please verify the transfer.',
        '/admin', new.id);
    else
      human := case new.status
        when 'paid' then 'Payment confirmed. We are preparing your order.'
        when 'processing' then 'Your order is being processed.'
        when 'shipped' then 'Your order is on the way.'
        when 'delivered' then 'Your order has been delivered. Enjoy!'
        when 'cancelled' then 'Your order was cancelled. Reach out if this is unexpected.'
        else 'Your order status is now ' || replace(new.status::text, '_', ' ') || '.'
      end;
      perform public.notify(new.user_id, 'order', 'Order update', human, '/orders', new.id);
    end if;
  end if;
  return new;
end; $$;
drop trigger if exists orders_notify_status on public.orders;
create trigger orders_notify_status after update of status on public.orders
  for each row execute procedure public.on_order_status_change();

-- New custom (Shop Your Way) request -> tell the admins.
create or replace function public.on_custom_request_created()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.notify_admins(
    'custom_request', 'New custom request',
    coalesce(new.name, 'A customer') || ' sent a Shop Your Way request.',
    '/admin', null);
  return new;
end; $$;
drop trigger if exists custom_requests_notify on public.custom_requests;
create trigger custom_requests_notify after insert on public.custom_requests
  for each row execute procedure public.on_custom_request_created();

-- RLS: a user reads only their own notifications. There is no client insert,
-- update, or delete policy on purpose. Creation happens through the security
-- definer helpers above; clearing the unread state happens through
-- mark_notifications_read(). The service role (Edge Functions) bypasses RLS.
alter table public.notifications enable row level security;
drop policy if exists "users read own notifications" on public.notifications;
create policy "users read own notifications" on public.notifications
  for select to authenticated using (user_id = auth.uid());

-- Let the bell update live. Ignore the error if the table is already in the
-- realtime publication (re-running this script).
do $$ begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null; end $$;
