-- pgTAP regression for security batch 2 (F4, F5, F8). Run: supabase test db
-- Requires pgTAP. Wrapped in a rolled-back transaction so it leaves no data.
--
-- Fixtures use fixed UUIDs in a private range so they never collide with real
-- rows. Every INSERT here runs as the migration/test role (superuser in the
-- local test DB), which bypasses RLS — these tests target DB constraints and
-- SECURITY DEFINER logic, not RLS (RLS is covered by rls_batch1_test.sql).

begin;
select plan(4);

-- ---------------------------------------------------------------------------
-- F8: at most one (order_id, reason) row where order_id is not null.
-- ---------------------------------------------------------------------------
-- Minimal customer + loyalty prerequisites may be enforced by FKs; insert a
-- customer row if the schema requires it. loyalty_ledger.customer_id -> customers.
insert into customers (id) values ('00000000-0000-0000-0000-000000000001')
  on conflict do nothing;

prepare earn1 as insert into loyalty_ledger(customer_id, delta, reason, order_id)
  values ('00000000-0000-0000-0000-000000000001', 10, 'earn',
          '00000000-0000-0000-0000-0000000000aa');
select lives_ok('earn1', 'F8: first earn for an order inserts');
select throws_ok('earn1', '23505', null, 'F8: duplicate earn for same order is rejected');

-- ---------------------------------------------------------------------------
-- F5: a global_limit=1 promo can be reserved once; a second reservation raises.
-- ---------------------------------------------------------------------------
insert into promo_codes (id, code, kind, value, global_limit, is_active)
  values ('00000000-0000-0000-0000-0000000000b1', 'TESTONCE', 'fixed', 500, 1, true)
  on conflict (id) do nothing;

-- Two orders to attach reservations to. orders requires location + money fields.
insert into locations (id, slug, name, address, is_active)
  values ('00000000-0000-0000-0000-0000000000d1', 'test-loc', 'Test', 'x', true)
  on conflict (id) do nothing;
insert into orders (id, code, location_id, fulfilment, status, subtotal_pence, total_pence)
  values
    ('00000000-0000-0000-0000-0000000000c1', 'TESTC1', '00000000-0000-0000-0000-0000000000d1', 'collection', 'pending_payment', 1000, 500),
    ('00000000-0000-0000-0000-0000000000c2', 'TESTC2', '00000000-0000-0000-0000-0000000000d1', 'collection', 'pending_payment', 1000, 500)
  on conflict (id) do nothing;

select lives_ok(
  $$ select reserve_promo('00000000-0000-0000-0000-0000000000b1'::uuid,
                          '00000000-0000-0000-0000-0000000000c1'::uuid, null) $$,
  'F5: first reservation of a single-use code succeeds');
select throws_ok(
  $$ select reserve_promo('00000000-0000-0000-0000-0000000000b1'::uuid,
                          '00000000-0000-0000-0000-0000000000c2'::uuid, null) $$,
  '23514', null, 'F5: second reservation of a single-use code is rejected');

select finish();
rollback;
