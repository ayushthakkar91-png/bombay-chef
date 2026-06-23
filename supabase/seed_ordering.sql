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
