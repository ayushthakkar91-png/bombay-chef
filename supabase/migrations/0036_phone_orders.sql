-- ============================================================================
-- Orders taken over the phone by staff
-- ============================================================================
-- A phone order IS an order: same row, same pricing, same ticket, same daily
-- number. Two things differ — where it came from, and who typed it — and
-- both are worth keeping for the ticket, the reports and any later question.
--
-- taken_by_name is stored as text on purpose. The ticket and the reports need
-- a name, not a join, and a staff member who later leaves should still be
-- named on the orders they took.
--
-- Safe to run twice. Safe to run while the site is live.
-- ============================================================================

alter table orders
  add column if not exists source text not null default 'web';

alter table orders
  drop constraint if exists orders_source_check;

alter table orders
  add constraint orders_source_check
  check (source in ('web', 'phone', 'walk_in'));

comment on column orders.source is
  'Where the order came from: web (the website), phone (staff typed it from a call), walk_in (staff typed it at the counter).';

alter table orders
  add column if not exists taken_by uuid references profiles(id) on delete set null;

alter table orders
  add column if not exists taken_by_name text;

comment on column orders.taken_by is 'The staff member who entered a phone or walk-in order. Null for web orders.';
comment on column orders.taken_by_name is 'Their name at the time, for the ticket and reports.';

-- Reports split by channel for free.
create index if not exists orders_source_idx on orders (location_id, source, placed_at desc);

-- ============================================================================
-- Check
-- ============================================================================
--   select source, count(*) from orders group by 1;
-- Every existing order is 'web'.
-- ============================================================================
