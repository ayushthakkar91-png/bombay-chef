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

-- 1b. Ordering provider alignment (defense-in-depth second gate). Only Balham
-- takes orders on our own system today; Battersea/Kilburn route to the external
-- platform, so their collection/delivery are OFF in the DB too. This mirrors
-- src/data/locations.ts `ordering.provider` and getOrderLocations()'s filter.
update locations set collection_enabled = true,  delivery_enabled = true  where slug = 'balham';
update locations set collection_enabled = false, delivery_enabled = false where slug in ('battersea','kilburn');

-- Balham radius delivery: 2 miles from 88 Balham High Rd (SW12 9AG), £3.50 fee,
-- free over £30, £15 minimum. Editable later in admin → Locations. (Requires 0024.)
update locations set
  latitude = 51.4433,
  longitude = -0.1526,
  delivery_radius_miles = 2,
  delivery_fee_pence = 350,
  free_delivery_over_pence = 3000,
  min_order_pence = 1500
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
