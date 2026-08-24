-- Incremental migration for projects that already ran schema.sql.
-- Safe to run once in the Supabase SQL Editor.

do $$ begin
  create type public.custom_request_status as enum ('new', 'contacted', 'fulfilled', 'cancelled');
exception when duplicate_object then null;
end $$;

create table if not exists public.custom_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  name text not null,
  phone text not null,
  items text not null,
  budget text,
  status public.custom_request_status not null default 'new',
  admin_note text,
  created_at timestamptz not null default now()
);
create index if not exists custom_requests_created_idx on public.custom_requests(created_at desc);

create or replace function public.create_custom_request(payload jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  req_id uuid;
  nm text := trim(coalesce(payload->>'name', ''));
  ph text := trim(coalesce(payload->>'phone', ''));
  it text := trim(coalesce(payload->>'items', ''));
  bd text := nullif(trim(coalesce(payload->>'budget', '')), '');
begin
  if length(nm) < 2 or length(nm) > 80 then raise exception 'Please enter your name'; end if;
  if length(ph) < 7 or length(ph) > 20 then raise exception 'Please enter a valid phone number'; end if;
  if ph !~ '^[0-9+()[:space:]-]+$' then raise exception 'Please enter a valid phone number'; end if;
  if length(it) < 3 or length(it) > 2000 then raise exception 'Please describe the items you need'; end if;
  if bd is not null and length(bd) > 80 then raise exception 'Budget is too long'; end if;
  insert into public.custom_requests(user_id, name, phone, items, budget)
  values (auth.uid(), nm, ph, it, bd)
  returning id into req_id;
  return req_id;
end; $$;

create or replace function public.update_custom_request(request_id uuid, next_status public.custom_request_status, note text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  update public.custom_requests
    set status = next_status, admin_note = coalesce(note, admin_note)
    where id = request_id;
  if not found then raise exception 'Custom request not found'; end if;
end; $$;

alter table public.custom_requests enable row level security;
drop policy if exists "admins read custom requests" on public.custom_requests;
create policy "admins read custom requests" on public.custom_requests for select using (public.is_admin());
grant execute on function public.create_custom_request(jsonb) to anon, authenticated;
grant execute on function public.update_custom_request(uuid, public.custom_request_status, text) to authenticated;
