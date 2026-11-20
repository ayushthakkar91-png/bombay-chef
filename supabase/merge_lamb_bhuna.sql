-- ============================================================================
-- MERGE "Lamb Bhuma (D)" AND "Lamb Bhuna (D)" INTO ONE DISH
-- ============================================================================
-- The same dish exists twice:
--
--   e8284211…  "Lamb Bhuma (D)"  09 Nov, from the Balham rebuild — a typo
--   a04123fe…  "Lamb Bhuna (D)"  17 Nov, from the Battersea import — correct
--
-- Renaming the typo in admin is refused, because menu_items.name is unique and
-- the correct spelling is taken. They have to be merged instead.
--
-- The OLDER row is kept. It is the one photos, allergens, modifiers and any
-- past order line already point at; keeping the newer one would quietly drop
-- all of that. It is then renamed to the correct spelling.
--
-- Battersea's availability moves across first, so the branch does not lose the
-- dish for the moment between the two statements.
--
-- Runs as one transaction. Safe to run twice.
-- ============================================================================

begin;

-- 1. Battersea sells it: point that at the row we are keeping -----------------
insert into location_menu_items (location_id, item_id, is_available, price_pence_override)
select li.location_id,
       'e8284211-1a1d-4c01-b0a6-896c01633c21'::uuid,
       li.is_available,
       li.price_pence_override
  from location_menu_items li
 where li.item_id = 'a04123fe-cb4a-4d8a-be13-bacd9cf60319'
   -- Only the branches that SELL it. The duplicate also carries a "hidden at
   -- Balham" row from the import, and copying that across would take the dish
   -- off Balham's menu — the opposite of what this is for.
   and li.is_available
on conflict (location_id, item_id) do update
  set is_available = true,
      price_pence_override = excluded.price_pence_override;

-- 2. Keep any order history pointing at a real dish ---------------------------
-- order_items keeps its own copy of the name, price and quantity, so receipts
-- and reports are correct either way — but a line that still resolves to a
-- dish is worth more than one left dangling.
update order_items
   set item_id = 'e8284211-1a1d-4c01-b0a6-896c01633c21'
 where item_id = 'a04123fe-cb4a-4d8a-be13-bacd9cf60319';

-- Same for a loyalty reward that hands out this dish, if one exists.
update rewards
   set item_id = 'e8284211-1a1d-4c01-b0a6-896c01633c21'
 where item_id = 'a04123fe-cb4a-4d8a-be13-bacd9cf60319';

-- 3. Remove the duplicate ------------------------------------------------------
-- Its own location rows, modifier groups and allergens cascade with it.
delete from menu_items
 where id = 'a04123fe-cb4a-4d8a-be13-bacd9cf60319';

-- 4. Correct the spelling -------------------------------------------------------
-- Only possible now the name is free.
update menu_items
   set name = 'Lamb Bhuna (D)'
 where id = 'e8284211-1a1d-4c01-b0a6-896c01633c21';

commit;

-- ============================================================================
-- Check
-- ============================================================================
-- One dish, spelled correctly:
--   select id, name, price_pence from menu_items where name ilike 'Lamb Bh%';
--
-- On sale at both branches:
--   select l.slug, li.is_available, li.price_pence_override
--     from location_menu_items li
--     join locations l on l.id = li.location_id
--    where li.item_id = 'e8284211-1a1d-4c01-b0a6-896c01633c21';
--
-- Balham should have NO row (which means available at the catalogue price) or
-- a row with is_available = true. Battersea should be true at 1155.
--
-- The public menus take up to 5 minutes to catch up — the branch menu is
-- cached for that long.
-- ============================================================================
