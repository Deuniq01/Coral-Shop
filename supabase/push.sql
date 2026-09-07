-- Coral Shop: device push notification subscriptions (Web Push / VAPID).
-- Run this once in the Supabase SQL editor (after notifications.sql). Safe to re-run.
--
-- Each browser that opts in stores its PushSubscription here. The send-push
-- Edge Function reads these (with the service role) and delivers a push for
-- every new notification. A user can only manage their own subscriptions.

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions(user_id);

-- Pin ownership to the signed-in user so a client cannot register a
-- subscription under someone else's id.
create or replace function public.push_sub_set_owner()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Sign in is required'; end if;
  new.user_id := auth.uid();
  return new;
end; $$;
drop trigger if exists push_sub_owner on public.push_subscriptions;
create trigger push_sub_owner before insert or update on public.push_subscriptions
  for each row execute procedure public.push_sub_set_owner();

alter table public.push_subscriptions enable row level security;
drop policy if exists "read own push subs" on public.push_subscriptions;
create policy "read own push subs" on public.push_subscriptions for select to authenticated
  using (user_id = auth.uid());
drop policy if exists "insert own push subs" on public.push_subscriptions;
create policy "insert own push subs" on public.push_subscriptions for insert to authenticated
  with check (user_id = auth.uid());
drop policy if exists "update own push subs" on public.push_subscriptions;
create policy "update own push subs" on public.push_subscriptions for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "delete own push subs" on public.push_subscriptions;
create policy "delete own push subs" on public.push_subscriptions for delete to authenticated
  using (user_id = auth.uid());
