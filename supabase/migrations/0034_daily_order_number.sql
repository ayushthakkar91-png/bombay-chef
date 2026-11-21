-- ============================================================================
-- A short daily number for every order: 1, 2, 3 … starting again each day
-- ============================================================================
-- The eight-character code (30811412) is unique for ever, which is what the
-- website needs. The kitchen needs the opposite: "order 7", shouted across a
-- counter, written on a bag, matched to a driver. So each branch counts its
-- orders from 1 every day, London time, and the number goes on the ticket.
--
-- The number is handed out the moment an order is PLACED (status becomes
-- 'paid'), not when it is created — a basket that never got through payment
-- must not use up a number and leave a gap on the rail.
--
-- It is assigned by a trigger inside the database, from a per-branch,
-- per-day counter row updated atomically. Two orders placed in the same
-- instant cannot be given the same number, and the number can never change
-- once given, however the order is later edited or cancelled.
--
-- Safe to run twice. Safe to run while the site is live.
-- ============================================================================

alter table orders
  add column if not exists daily_seq integer;

comment on column orders.daily_seq is
  'Position of this order in its branch''s day (London time): 1, 2, 3 … Assigned by trigger when the order is placed. Printed on the kitchen ticket.';

-- One row per branch per day, holding the last number handed out.
create table if not exists order_daily_counters (
  location_id uuid not null references locations(id) on delete cascade,
  day         date not null,
  n           integer not null default 0,
  primary key (location_id, day)
);

create or replace function assign_daily_seq()
returns trigger
language plpgsql
as $$
declare
  became_placed boolean;
begin
  -- Only when the order becomes placed, and only once.
  if tg_op = 'INSERT' then
    became_placed := new.status = 'paid';
  else
    became_placed := new.status = 'paid' and old.status is distinct from 'paid';
  end if;

  if became_placed and new.daily_seq is null then
    insert into order_daily_counters (location_id, day, n)
    values (
      new.location_id,
      (coalesce(new.placed_at, now()) at time zone 'Europe/London')::date,
      1
    )
    on conflict (location_id, day) do update
      set n = order_daily_counters.n + 1
    returning n into new.daily_seq;
  end if;

  return new;
end;
$$;

drop trigger if exists orders_assign_daily_seq on orders;
create trigger orders_assign_daily_seq
  before insert or update of status on orders
  for each row
  execute function assign_daily_seq();

-- ----------------------------------------------------------------------------
-- Number today's orders that already exist, in the order they were placed, so
-- the rest of today carries on from the right place rather than starting at
-- 1 halfway through service.
-- ----------------------------------------------------------------------------
with today as (
  select id,
         location_id,
         row_number() over (partition by location_id order by placed_at, created_at) as seq
    from orders
   where placed_at is not null
     and status not in ('pending_payment')
     and (placed_at at time zone 'Europe/London')::date = (now() at time zone 'Europe/London')::date
)
update orders o
   set daily_seq = today.seq
  from today
 where o.id = today.id
   and o.daily_seq is null;

insert into order_daily_counters (location_id, day, n)
select location_id,
       (now() at time zone 'Europe/London')::date,
       max(daily_seq)
  from orders
 where daily_seq is not null
   and (placed_at at time zone 'Europe/London')::date = (now() at time zone 'Europe/London')::date
 group by location_id
on conflict (location_id, day) do update
  set n = greatest(order_daily_counters.n, excluded.n);

-- ============================================================================
-- Check
-- ============================================================================
--   select l.slug, o.daily_seq, o.code, o.placed_at
--     from orders o join locations l on l.id = o.location_id
--    where (o.placed_at at time zone 'Europe/London')::date = (now() at time zone 'Europe/London')::date
--    order by l.slug, o.daily_seq;
--
-- Each branch should run 1, 2, 3 … with no gaps and no repeats.
-- ============================================================================
