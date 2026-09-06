-- Coral Shop: customer reviews with admin moderation.
-- Run this once in the Supabase SQL editor (after notifications.sql). Safe to re-run.
--
-- A signed-in customer submits a review; it starts as 'pending' and only shows
-- on the public landing page once an admin approves it. New reviews notify the
-- admins so they know to moderate.

do $$ begin
  create type public.review_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  author_name text not null,
  rating int not null check (rating between 1 and 5),
  body text not null,
  product_id uuid references public.products(id) on delete set null,
  status public.review_status not null default 'pending',
  created_at timestamptz not null default now(),
  approved_at timestamptz
);
create index if not exists reviews_public_idx on public.reviews(status, approved_at desc);
create index if not exists reviews_user_idx on public.reviews(user_id, created_at desc);

-- Pin author, ownership and status on the server. A customer can never submit
-- an already-approved review, and cannot post as someone else.
create or replace function public.review_before_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare pname text;
begin
  if auth.uid() is null then raise exception 'Sign in is required to leave a review'; end if;
  new.user_id := auth.uid();
  new.status := 'pending';
  new.approved_at := null;
  select coalesce(nullif(trim(full_name), ''), split_part(email, '@', 1)) into pname
  from public.profiles where id = auth.uid();
  new.author_name := coalesce(nullif(trim(new.author_name), ''), pname, 'Customer');
  new.body := trim(coalesce(new.body, ''));
  if new.rating is null or new.rating < 1 or new.rating > 5 then raise exception 'Rating must be between 1 and 5'; end if;
  if length(new.body) < 4 then raise exception 'Please write a little more in your review'; end if;
  if length(new.body) > 600 then raise exception 'Review is too long'; end if;
  return new;
end; $$;
drop trigger if exists reviews_before on public.reviews;
create trigger reviews_before before insert on public.reviews
  for each row execute procedure public.review_before_insert();

-- Tell the admins a review is waiting for moderation.
create or replace function public.review_after_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.notify_admins('review', 'New review to moderate',
    new.author_name || ' left a ' || new.rating || '-star review.', '/admin', null);
  return new;
end; $$;
drop trigger if exists reviews_after on public.reviews;
create trigger reviews_after after insert on public.reviews
  for each row execute procedure public.review_after_insert();

-- Admin-only approve/reject, stamping approved_at so the landing can order by it.
create or replace function public.set_review_status(p_id uuid, p_status public.review_status)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  update public.reviews
  set status = p_status, approved_at = case when p_status = 'approved' then now() else null end
  where id = p_id;
end; $$;

-- RLS: anyone (including the anonymous landing page) can read approved reviews;
-- a user can see their own in any state; admins see everything. Customers may
-- only insert their own; only admins update or delete.
alter table public.reviews enable row level security;
drop policy if exists "read approved or own reviews" on public.reviews;
create policy "read approved or own reviews" on public.reviews for select
  using (status = 'approved' or user_id = auth.uid() or public.is_admin());
drop policy if exists "create own reviews" on public.reviews;
create policy "create own reviews" on public.reviews for insert to authenticated
  with check (user_id = auth.uid());
drop policy if exists "admins update reviews" on public.reviews;
create policy "admins update reviews" on public.reviews for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admins delete reviews" on public.reviews;
create policy "admins delete reviews" on public.reviews for delete to authenticated
  using (public.is_admin());
