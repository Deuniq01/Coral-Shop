-- Coral Shop: per-order messaging between a customer and the shop.
-- Run this once in the Supabase SQL editor (after notifications.sql). Safe to re-run.
--
-- A customer can ask a question or send feedback about one of their orders,
-- and an admin can reply. Every message creates a notification for the other
-- party through the helpers in notifications.sql, so the bell (and later email
-- and push) light up automatically.

create table if not exists public.order_messages (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  from_admin boolean not null default false,
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists order_messages_order_idx on public.order_messages(order_id, created_at);

-- Pin the sender and role on the server so a client cannot spoof either, and
-- keep the body sane. Only the order owner or an admin may post.
create or replace function public.order_message_before_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare owner uuid; admin_flag boolean;
begin
  if auth.uid() is null then raise exception 'Sign in is required'; end if;
  select user_id into owner from public.orders where id = new.order_id;
  if owner is null then raise exception 'Order not found'; end if;
  admin_flag := public.is_admin();
  if not admin_flag and owner <> auth.uid() then
    raise exception 'You can only message your own orders';
  end if;
  new.sender_id := auth.uid();
  new.from_admin := admin_flag;
  new.body := trim(coalesce(new.body, ''));
  if length(new.body) < 1 then raise exception 'Message cannot be empty'; end if;
  if length(new.body) > 1000 then raise exception 'Message is too long'; end if;
  new.created_at := now();
  return new;
end; $$;
drop trigger if exists order_messages_before on public.order_messages;
create trigger order_messages_before before insert on public.order_messages
  for each row execute procedure public.order_message_before_insert();

-- Notify the other side of the conversation.
create or replace function public.order_message_after_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare owner uuid; sname text;
begin
  select user_id, shipping_name into owner, sname from public.orders where id = new.order_id;
  if new.from_admin then
    perform public.notify(owner, 'order_message', 'New message about your order',
      'Coral Shopping replied to your order.', '/orders', new.order_id);
  else
    perform public.notify_admins('order_message', 'New customer message',
      coalesce(sname, 'A customer') || ' sent a message about an order.', '/admin', new.order_id);
  end if;
  return new;
end; $$;
drop trigger if exists order_messages_after on public.order_messages;
create trigger order_messages_after after insert on public.order_messages
  for each row execute procedure public.order_message_after_insert();

-- RLS: a participant (the order owner or any admin) can read and post. The
-- before-insert trigger fixes sender_id and from_admin, so posting cannot be
-- spoofed even though the policy is permissive about who may insert.
alter table public.order_messages enable row level security;
drop policy if exists "read order messages" on public.order_messages;
create policy "read order messages" on public.order_messages for select to authenticated
  using (exists(select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_admin())));
drop policy if exists "write order messages" on public.order_messages;
create policy "write order messages" on public.order_messages for insert to authenticated
  with check (exists(select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_admin())));

-- Let open threads update live.
do $$ begin
  alter publication supabase_realtime add table public.order_messages;
exception when duplicate_object then null; end $$;
