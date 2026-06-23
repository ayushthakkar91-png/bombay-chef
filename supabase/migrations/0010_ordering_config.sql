-- Bombay Bicycle Chef — 0010 ordering: status model, delivery config, zones
-- Reconciles the 0006 order schema to the Phase 3 spec:
--   * the 9-state order lifecycle + transition guard
--   * a guest track token (tracking/confirmation without an account)
--   * per-location delivery settings (fee, minimum, prep/delivery time)
--   * delivery_zones: the postcode districts (outcodes) each branch serves
-- Safe pre-production (ordering ships behind NEXT_PUBLIC_FEATURE_ORDERING).

-- Order status model ----------------------------------------------------------
alter table orders drop constraint if exists orders_status_check;
alter table orders
  add constraint orders_status_check check (status in (
    'pending_payment','paid','accepted','preparing',
    'ready_for_collection','out_for_delivery','completed','cancelled','refunded'
  ));

-- Guest tracking token (bearer capability for the confirmation/track page).
alter table orders add column if not exists track_token text unique
  default encode(gen_random_bytes(16), 'hex');

-- Marketing consent captured at checkout, kept SEPARATE from the order/payment
-- (GDPR: unbundled, explicit opt-in). Migrates to the consents log in Phase 5.
alter table orders add column if not exists marketing_opt_in boolean not null default false;

-- Transition guard (replaces the 0006 version with the new lifecycle).
create or replace function orders_guard_status() returns trigger as $$
declare ok boolean;
begin
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    ok := case old.status
      when 'pending_payment'      then new.status in ('paid','cancelled')
      when 'paid'                 then new.status in ('accepted','cancelled','refunded')
      when 'accepted'             then new.status in ('preparing','cancelled','refunded')
      when 'preparing'            then new.status in ('ready_for_collection','out_for_delivery','cancelled','refunded')
      when 'ready_for_collection' then new.status in ('completed','cancelled','refunded')
      when 'out_for_delivery'     then new.status in ('completed','cancelled','refunded')
      when 'completed'            then new.status in ('refunded')
      when 'cancelled'            then new.status in ('refunded')
      else false end;
    if not ok then
      raise exception 'illegal order transition % -> %', old.status, new.status;
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

-- Per-location delivery / collection config -----------------------------------
alter table locations add column if not exists collection_enabled boolean not null default true;
alter table locations add column if not exists delivery_enabled   boolean not null default true;
alter table locations add column if not exists delivery_fee_pence  int not null default 350;
alter table locations add column if not exists min_order_pence     int not null default 1500;
alter table locations add column if not exists prep_time_min       int not null default 30;
alter table locations add column if not exists delivery_time_min   int not null default 45;

-- Delivery zones: the outcodes (postcode districts, e.g. 'SW12') a branch serves.
-- Postcode validation = does the entered postcode's outcode exist here & active?
create table if not exists delivery_zones (
  id          uuid primary key default gen_random_uuid(),
  location_id uuid not null references locations(id) on delete cascade,
  outcode     text not null,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (location_id, outcode)
);
create index if not exists delivery_zones_loc_idx on delivery_zones(location_id);

alter table delivery_zones enable row level security;

-- Public may read active zones (the postcode checker reads them); managers manage.
drop policy if exists "public read delivery_zones" on delivery_zones;
drop policy if exists "managers manage delivery_zones" on delivery_zones;
create policy "public read delivery_zones" on delivery_zones for select using (is_active = true);
create policy "managers manage delivery_zones" on delivery_zones for all
  using (role_at_least('location_manager', location_id))
  with check (role_at_least('location_manager', location_id));
