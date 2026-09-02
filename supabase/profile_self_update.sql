-- Incremental migration for OLD projects only.
--
-- Lets a signed-in customer edit their own profile (full name, phone) from the
-- dashboard. Fresh installs already get all of this from schema.sql; run this
-- once in the Supabase SQL editor on a project created before this change.
--
-- Safe to run more than once: every statement is guarded or uses "or replace".
--
-- Security: the update policy is scoped to the caller's own row, and the guard
-- trigger pins id, role and created_at to their previous values on every
-- update, so a customer cannot promote themselves to admin. Only is_admin()
-- callers can change a role.

-- 1) Guard trigger: identity and role can never be changed by a self update.
create or replace function public.protect_profile_columns() returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.id := old.id;
  new.role := case when public.is_admin() then new.role else old.role end;
  new.created_at := old.created_at;
  new.updated_at := now();
  return new;
end; $$;

drop trigger if exists profiles_protect_columns on public.profiles;
create trigger profiles_protect_columns before update on public.profiles for each row execute procedure public.protect_profile_columns();

-- 2) RLS: allow a signed-in user to update only their own profile row.
drop policy if exists "users update own profile" on public.profiles;
create policy "users update own profile" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
