-- Coral Shop: let an admin set or edit the delivery schedule on an order that
-- has already been marked paid (not only at the pending -> paid step).
-- Run once in the Supabase SQL editor. Safe to re-run.
--
-- confirm_payment still sets the schedule when payment is first confirmed. This
-- adds a way to adjust the date/note afterwards (customer rescheduled, typo, a
-- date was never entered at confirmation, etc). It notifies the customer so the
-- in-app bell, email and push all reflect the new time.

create or replace function public.set_delivery_schedule(order_id uuid, scheduled_at timestamptz default null, note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare cur public.order_status; owner uuid;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  select status, user_id into cur, owner from public.orders where id = order_id;
  if not found then raise exception 'Order not found'; end if;
  if cur not in ('paid', 'processing', 'shipped') then
    raise exception 'A delivery schedule can only be set on a paid, processing or shipped order';
  end if;
  update public.orders
    set delivery_scheduled_at = scheduled_at,
        delivery_note = note,
        updated_at = now()
  where id = order_id;
  -- Tell the customer their delivery details changed.
  if owner is not null then
    perform public.notify(
      owner, 'order', 'Delivery details updated',
      case when scheduled_at is not null
           then 'Your delivery is scheduled for ' || to_char(scheduled_at at time zone 'Africa/Lagos', 'DD Mon YYYY, HH24:MI')
           else 'Your delivery schedule has been updated.' end,
      '/orders', order_id);
  end if;
end; $$;
