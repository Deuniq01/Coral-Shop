-- Incremental migration for OLD projects only.
--
-- Hardens the admin order-fulfilment path with a real status guard. The
-- previous version updated an order to any of processing/shipped/delivered/
-- cancelled without checking the current status, so a crafted RPC call (or a
-- future UI bug) could mark an unpaid order delivered, or move a delivered or
-- cancelled order back into an active state. Fresh installs already get this
-- from schema.sql; run this once in the Supabase SQL editor otherwise.
--
-- Safe to run more than once: it only replaces the function definition.
--
-- Allowed transitions after this change:
--   * delivered / cancelled are terminal and cannot change.
--   * processing / shipped / delivered require the order to be paid or later.
--   * cancelled is allowed from any non-terminal state (refund / cancellation).
-- The existing admin UI already advances orders one legal step at a time, so
-- this does not change normal operation; it only blocks illegal jumps.

create or replace function public.update_order_fulfillment(order_id uuid, next_status public.order_status, scheduled_at timestamptz default null, note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare cur public.order_status;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  if next_status not in ('processing', 'shipped', 'delivered', 'cancelled') then raise exception 'Invalid fulfillment status'; end if;
  select status into cur from public.orders where id = order_id;
  if not found then raise exception 'Order not found'; end if;
  if cur in ('delivered', 'cancelled') then raise exception 'Order is already % and cannot be changed', cur; end if;
  if next_status in ('processing', 'shipped', 'delivered') and cur not in ('paid', 'processing', 'shipped') then
    raise exception 'Confirm the payment before moving this order to %', next_status;
  end if;
  update public.orders set status = next_status, delivery_scheduled_at = coalesce(scheduled_at, delivery_scheduled_at), delivery_note = coalesce(note, delivery_note), updated_at = now() where id = order_id;
end; $$;
