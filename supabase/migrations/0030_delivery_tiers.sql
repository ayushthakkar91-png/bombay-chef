-- 0030_delivery_tiers.sql — distance-banded delivery charges.
--
-- Replaces the hard-coded "£1 per started mile" rule in src/lib/ordering/delivery.ts
-- with bands the office can edit: 1 mile free, 2 miles £1.99, 3 miles £3.99.
--
-- Scope: these bands are SHARED by every branch (no location_id). A branch's own
-- delivery_radius_miles still applies on top, and free_delivery_over_pence still
-- wins — spend over the threshold and delivery is free at any distance.
--
-- Beyond the largest band we do not deliver: the top band is the real cutoff.

create table if not exists delivery_tiers (
  id         uuid primary key default gen_random_uuid(),
  -- Upper bound of the band, inclusive. 1.00 = "up to and including 1 mile".
  max_miles  numeric(5,2) not null unique check (max_miles > 0),
  fee_pence  int not null check (fee_pence >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists delivery_tiers_updated on delivery_tiers;
create trigger delivery_tiers_updated before update on delivery_tiers
  for each row execute function set_updated_at();

alter table delivery_tiers enable row level security;
-- Read and write happen server-side through the service client (the delivery
-- quote and the admin action), so no public policy: deny by default.

-- Starting bands. Only inserted when the table is empty, so re-running this
-- migration never overwrites what the office has since edited.
insert into delivery_tiers (max_miles, fee_pence)
select * from (values (1.00, 0), (2.00, 199), (3.00, 399)) as v(max_miles, fee_pence)
where not exists (select 1 from delivery_tiers);

-- Managers edit the bands from the admin panel (the action uses the signed-in
-- user's client, so it needs a policy — service-role reads bypass RLS anyway).
drop policy if exists "managers write delivery_tiers" on delivery_tiers;
create policy "managers write delivery_tiers" on delivery_tiers for all
  using (role_at_least('restaurant_manager')) with check (role_at_least('restaurant_manager'));
