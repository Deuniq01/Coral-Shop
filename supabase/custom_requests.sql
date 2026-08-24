-- Incremental, idempotent migration for projects that already ran schema.sql.
-- Safe to re-run in the Supabase SQL Editor.

do $$ begin
  create type public.custom_request_status as enum ('new', 'contacted', 'closed');
exception when duplicate_object then null;
end $$;

do $$ begin
  alter type public.custom_request_status add value if not exists 'closed';
exception when others then null;
end $$;

create table if not exists public.custom_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  name text not null,
  phone text not null,
  items text not null,
  budget text,
  status public.custom_request_status not null default 'new',
  admin_note text,
  created_at timestamptz not null default now()
);

do $$ begin
  alter table public.custom_requests alter column user_id set not null;
exception when others then null;
end $$;

create index if not exists custom_requests_created_idx on public.custom_requests(created_at desc);
create index if not exists custom_requests_user_idx on public.custom_requests(user_id, created_at desc);

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

drop trigger if exists custom_request_validate on public.custom_requests;
create trigger custom_request_validate before insert on public.custom_requests
  for each row execute procedure public.custom_request_validate();

alter table public.custom_requests enable row level security;

drop policy if exists "admins read custom requests" on public.custom_requests;
drop policy if exists "customers create own custom requests" on public.custom_requests;
drop policy if exists "owners and admins read custom requests" on public.custom_requests;
drop policy if exists "admins update custom requests" on public.custom_requests;

create policy "customers create own custom requests" on public.custom_requests
  for insert to authenticated with check (user_id = auth.uid());
create policy "owners and admins read custom requests" on public.custom_requests
  for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "admins update custom requests" on public.custom_requests
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop function if exists public.create_custom_request(jsonb);
drop function if exists public.update_custom_request(uuid, public.custom_request_status, text);
