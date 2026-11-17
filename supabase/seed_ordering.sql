-- Bombay Bicycle Chef — ordering seed
-- Run AFTER 0001–0010 and the menu seed. Safe to re-run.
--   1. Backfills menu_items.price_pence from the display price (checkout math).
--   2. Seeds starter delivery zones (outcodes) per branch.
-- Delivery fee / minimum / prep time live on `locations` (0010 defaults); tune
-- them in the admin later.

-- 1. Integer-pence prices from the "£11.55" display strings.
update menu_items
set price_pence = round((replace(price, '£', '')::numeric) * 100)
where price_pence is null
  and price ~ '^£?[0-9]+(\.[0-9]+)?$';

-- 1b. Ordering provider alignment (defense-in-depth second gate). Mirrors
-- src/data/locations.ts `ordering.provider` and getOrderLocations()'s filter.
--
-- Battersea went live on 2026-11-16. This file used to switch its
-- collection and delivery OFF, because Balham was the only branch when it was
-- written — so re-running it would have quietly stopped Battersea taking
-- orders, with nothing on screen to say why.
update locations set collection_enabled = true,  delivery_enabled = true  where slug in ('balham','battersea');
update locations set collection_enabled = false, delivery_enabled = false where slug = 'kilburn';

-- Balham radius delivery: 2 miles from 88 Balham High Rd (SW12 9AG), £3.50 fee,
-- £15 minimum, 3-mile radius. Delivery fee is distance-tiered in code (£1 per
-- started mile: ≤1mi £1, ≤2mi £2, ≤3mi £3 — see deliveryFeeForMiles). The flat
-- delivery_fee_pence below is only the fallback used if geocoding is unavailable.
-- Editable later in admin → Locations. (Requires 0024.)
update locations set
  latitude = 51.4433,
  longitude = -0.1526,
  delivery_radius_miles = 3,
  delivery_fee_pence = 300,
  -- NO free-delivery threshold. This used to seed 3000, which waived the fee
  -- on every order over £30 whatever the distance — a 3-mile delivery on a
  -- £35 order collected nothing toward it, and nobody chose that: it was a
  -- placeholder nobody revisited. freeDeliveryApplies() now treats 0 and null
  -- alike, so leaving it null is the honest "charge by distance".
  free_delivery_over_pence = null,
  min_order_pence = 2000
where slug = 'balham';

-- 2. Delivery zones per branch (postcode districts they deliver to).
do $$
declare loc record;
begin
  for loc in select id, slug from locations where slug in ('balham','battersea','kilburn') loop
    delete from delivery_zones where location_id = loc.id;
    if loc.slug = 'balham' then
      insert into delivery_zones (location_id, outcode) values
        (loc.id, 'SW12'), (loc.id, 'SW17'), (loc.id, 'SW11'), (loc.id, 'SW16');
    elsif loc.slug = 'battersea' then
      insert into delivery_zones (location_id, outcode) values
        (loc.id, 'SW11'), (loc.id, 'SW18'), (loc.id, 'SW8'), (loc.id, 'SW15');
    elsif loc.slug = 'kilburn' then
      insert into delivery_zones (location_id, outcode) values
        (loc.id, 'NW6'), (loc.id, 'NW2'), (loc.id, 'NW10'), (loc.id, 'W9');
    end if;
  end loop;
end $$;
