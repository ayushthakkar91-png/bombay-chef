-- Bombay Bicycle Chef — 0021 security hardening batch 1 (F2, F3)
--
-- Tightens two over-permissive RLS policies that were reachable directly through
-- the public PostgREST endpoint (`/rest/v1`) by any authenticated customer JWT —
-- independent of the app's server actions. RLS, not server code, is the boundary
-- for authenticated users, so these `FOR ALL` self-policies were the actual hole.
--
-- F2 — customers: was `own customer rw` FOR ALL, so a customer could UPDATE
--   system/CRM columns on their own row (lifetime_value_pence, orders_count,
--   tags, stripe_customer_id, last_order_at, loyalty_opt_in, default_address_id)
--   and DELETE the row entirely (cascading to addresses/loyalty/referrals).
--   Now: self-READ only. The two legitimate self-writes (birthday,
--   default_address_id) are performed by a service-role server action with an
--   explicit column allowlist (src/lib/account/customer-write.ts). Customer-row
--   creation was already service-role (account link on sign-in).
--
-- F3 — reservations: was `own reservations rw` FOR ALL, so a customer could
--   INSERT/UPDATE/DELETE bookings directly, choosing any location_id/party_size/
--   starts_at and bypassing the availability, capacity, blocks and turn-time
--   engine (all of which lives in server actions / service role). Now: self-READ
--   only. Create/modify/cancel already run exclusively through secured server
--   actions (submitReservation, the manage-token flow, and admin actions).
--
-- No schema or data change. Self-guarding (skips objects that don't exist), and
-- idempotent (drop-then-create). Staff policies are deliberately left untouched.
-- Does NOT edit any previously deployed migration.

-- F2 — customers: self-READ only -----------------------------------------------
do $$
begin
  if to_regclass('public.customers') is not null then
    drop policy if exists "own customer rw"   on public.customers;
    drop policy if exists "own customer read" on public.customers;
    create policy "own customer read" on public.customers
      for select using (id = auth.uid());
    -- "staff read customers" (role_at_least('location_manager')) is unchanged.
  end if;
end $$;

-- F3 — reservations: self-READ only --------------------------------------------
do $$
begin
  if to_regclass('public.reservations') is not null then
    drop policy if exists "own reservations rw"   on public.reservations;
    drop policy if exists "own reservations read" on public.reservations;
    create policy "own reservations read" on public.reservations
      for select using (customer_id = auth.uid());
    -- "staff manage reservations" (role_at_least('staff', location_id)) unchanged.
  end if;
end $$;
