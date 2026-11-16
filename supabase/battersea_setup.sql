-- ============================================================================
-- BATTERSEA: open the branch for online ordering
-- ============================================================================
-- Run this BEFORE battersea_menu.sql — that script refuses to run if the
-- branch does not exist yet.
--
-- Settings mirror Balham, because that is what is known to work, except where
-- Battersea's own details differ (address, phone, coordinates).
--
-- Delivery bands (1 mile free, 2 miles £1.99, 3 miles £3.99) are shared by
-- every branch — see migration 0030 — so they apply here automatically.
--
-- Safe to run twice.
-- ============================================================================

begin;

-- 1. The branch ---------------------------------------------------------------
-- 28 Queenstown Rd, London SW8 3RX.
--
-- The coordinates are what the delivery radius is measured FROM, so a wrong
-- pair silently changes who is allowed to order. Check them on a map before
-- taking real orders: 51.4751, -0.1476 should land on Queenstown Road.
insert into locations (
  slug, name, address, phone, is_active, sort_order,
  accepting_orders, delivery_enabled, collection_enabled,
  delivery_fee_pence, min_order_pence, free_delivery_over_pence,
  prep_time_min, delivery_time_min,
  latitude, longitude, delivery_radius_miles
) values (
  'battersea', 'Battersea', '28 Queenstown Rd, London SW8 3RX', '020 7720 0500', true, 20,
  true, true, true,
  300,      -- flat fee, used only when a postcode cannot be placed on a map
  2000,     -- £20 minimum, same as Balham
  null,     -- NO free-delivery threshold: always charge by distance
  20,       -- collection: 20 minutes
  25,       -- plus 25 more for delivery = 45 minutes to the door
  51.4751,
  -0.1476,
  3         -- miles
)
on conflict (slug) do update set
  is_active                = true,
  accepting_orders         = true,
  delivery_enabled         = true,
  collection_enabled       = true,
  delivery_fee_pence       = excluded.delivery_fee_pence,
  min_order_pence          = excluded.min_order_pence,
  free_delivery_over_pence = excluded.free_delivery_over_pence,
  prep_time_min            = excluded.prep_time_min,
  delivery_time_min        = excluded.delivery_time_min,
  latitude                 = excluded.latitude,
  longitude                = excluded.longitude,
  delivery_radius_miles    = excluded.delivery_radius_miles;

-- 2. Who can work this branch ---------------------------------------------------
-- The print agent signs in as a staff account and is refused any location it
-- holds no grant for, so without this the Battersea till cannot poll for
-- orders and nothing will print.
--
-- This gives the existing staff account Battersea as well as Balham. For a
-- separate Battersea-only login, create the user first, then change the email
-- below — the agent only ever needs 'staff'.
insert into staff_roles (profile_id, location_id, role)
select u.id, l.id, 'staff'
  from auth.users u
  cross join locations l
 where u.email = 'staff@bombaybicyclechef.com'
   and l.slug = 'battersea'
on conflict (profile_id, location_id, role) do nothing;

commit;

-- ============================================================================
-- Check it worked
-- ============================================================================
-- The branch, as ordering sees it:
--   select slug, is_active, accepting_orders, delivery_enabled,
--          min_order_pence, free_delivery_over_pence, delivery_radius_miles,
--          latitude, longitude
--     from locations where slug = 'battersea';
--
-- Staff who can work it (the print agent needs at least one row here):
--   select u.email, s.role
--     from staff_roles s
--     join auth.users u on u.id = s.profile_id
--     join locations l on l.id = s.location_id
--    where l.slug = 'battersea';
--
-- Then run battersea_menu.sql.
-- ============================================================================
