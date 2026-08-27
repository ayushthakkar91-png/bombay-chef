-- RLS regression tests — security batch 1 (F2, F3) + F10 reproduction.
--
-- Runs under Supabase's pgTAP harness:  supabase test db
-- (requires a local DB: `supabase start` / `supabase db reset`, which needs Docker).
--
-- Proves, by impersonating real roles against RLS, that after migration 0021:
--   F2  a customer cannot UPDATE protected columns on their own `customers` row,
--       cannot DELETE it, but CAN still read it.
--   F3  a customer cannot INSERT / UPDATE / DELETE `reservations`, cannot read
--       another customer's booking, but CAN read their own.
--   F10 (reproduction, NOT a fix) a staff status change currently ERRORS because
--       the status-history trigger cannot insert under the authenticated role.
--
-- Impersonation idiom: set the `authenticated` role + a JWT-claims GUC so that
-- `auth.uid()` resolves to the test user, exactly as PostgREST does per request.

begin;
select plan(11);

-- ── Fixtures (created as the migration/owner role, which bypasses RLS) ─────────
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'cust1@test.local', '', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'cust2@test.local', '', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '33333333-3333-3333-3333-333333333333', 'authenticated', 'authenticated', 'staff1@test.local', '', now(), now())
on conflict (id) do nothing;

-- profiles are auto-created by the on_auth_user_created trigger; ensure they exist.
insert into profiles (id) values
  ('11111111-1111-1111-1111-111111111111'),
  ('22222222-2222-2222-2222-222222222222'),
  ('33333333-3333-3333-3333-333333333333')
on conflict (id) do nothing;

insert into customers (id) values
  ('11111111-1111-1111-1111-111111111111'),
  ('22222222-2222-2222-2222-222222222222')
on conflict (id) do nothing;

insert into locations (id, slug, name, address) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'rls-test-loc', 'RLS Test Location', '1 Test St')
on conflict (id) do nothing;

-- cust1 owns a reservation; staff1 is 'staff' at the test location.
insert into reservations (id, location_id, customer_id, party_size, starts_at, status) values
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 2, now() + interval '2 days', 'confirmed')
on conflict (id) do nothing;

insert into staff_roles (profile_id, location_id, role) values
  ('33333333-3333-3333-3333-333333333333', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'staff')
on conflict (profile_id, location_id, role) do nothing;

-- Pin the CRM column to a known value so we can prove it is unchanged.
update customers set lifetime_value_pence = 111 where id = '11111111-1111-1111-1111-111111111111';

-- ── Impersonate customer #1 ───────────────────────────────────────────────────
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

-- F2.1 — can read own customers row
select isnt(
  (select count(*) from customers where id = auth.uid())::int, 0,
  'F2: customer CAN read their own customers row');

-- F2.2 — UPDATE of a protected CRM column affects 0 rows (self-read only, no UPDATE policy)
select is(
  (with u as (update customers set lifetime_value_pence = 999999 where id = auth.uid() returning 1) select count(*) from u)::int,
  0, 'F2: customer UPDATE of customers is blocked by RLS');

-- F2.3 — DELETE of own row affects 0 rows
select is(
  (with d as (delete from customers where id = auth.uid() returning 1) select count(*) from d)::int,
  0, 'F2: customer DELETE of customers is blocked by RLS');

-- F3.1 — can read own reservation
select isnt(
  (select count(*) from reservations where customer_id = auth.uid())::int, 0,
  'F3: customer CAN read their own reservation');

-- F3.2 — INSERT is rejected (no INSERT policy → row-level security violation)
select throws_ok(
  $$ insert into reservations (location_id, customer_id, party_size, starts_at)
     values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 8, now() + interval '3 days') $$,
  '42501', NULL, 'F3: customer INSERT into reservations is blocked by RLS');

-- F3.3 — UPDATE affects 0 rows
select is(
  (with u as (update reservations set party_size = 99 where customer_id = auth.uid() returning 1) select count(*) from u)::int,
  0, 'F3: customer UPDATE of reservations is blocked by RLS');

-- F3.4 — DELETE affects 0 rows
select is(
  (with d as (delete from reservations where customer_id = auth.uid() returning 1) select count(*) from d)::int,
  0, 'F3: customer DELETE of reservations is blocked by RLS');

-- ── Impersonate customer #2 (cross-customer isolation) ────────────────────────
set local "request.jwt.claims" = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';

-- F3.5 — cannot read another customer's booking
select is(
  (select count(*) from reservations where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')::int,
  0, 'F3: customer CANNOT read another customer''s reservation');

-- F2.4 — cannot read another customer's customers row
select is(
  (select count(*) from customers where id = '11111111-1111-1111-1111-111111111111')::int,
  0, 'F2: customer CANNOT read another customer''s row');

-- ── Prove the protected value never changed ───────────────────────────────────
reset role;
reset "request.jwt.claims";
select is(
  (select lifetime_value_pence from customers where id = '11111111-1111-1111-1111-111111111111'),
  111::bigint, 'F2: lifetime_value_pence is unchanged after the blocked UPDATE');

-- ── F10 REPRODUCTION (expected to PASS today = bug present) ────────────────────
-- Staff changes a reservation status via the authenticated role. The SECURITY
-- INVOKER trigger tries to INSERT into reservation_status_history (RLS on, no
-- INSERT policy) → insufficient_privilege. This assertion documents the current
-- broken behaviour; after the proposed 0022 trigger fix it should be replaced
-- with a lives_ok() assertion.
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';
select throws_ok(
  $$ update reservations set status = 'seated' where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' $$,
  '42501', NULL, 'F10: staff status change currently FAILS (history-trigger RLS insert denied)');

select * from finish();
rollback;
