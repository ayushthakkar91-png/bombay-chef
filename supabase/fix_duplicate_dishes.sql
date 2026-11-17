-- ============================================================================
-- REMOVE DUPLICATE DISHES, AND MAKE THEM IMPOSSIBLE
-- ============================================================================
-- battersea_menu.sql added 28 dishes with "on conflict do nothing". There is
-- no unique constraint on menu_items.name, so there was no conflict to
-- detect: running the script a second time inserted all 28 again. Section 4
-- joins dishes BY NAME, so each duplicate got its own availability row and
-- Battersea reported 141 dishes on sale instead of 112.
--
-- Keeps the OLDEST row of each name — the one that photos, modifiers and any
-- past order line already point at — and removes the later copies.
--
-- A duplicate somebody has actually ordered from is KEPT, not deleted: an
-- order line pointing at a dish is worth more than a tidy catalogue. If any
-- survive, the check at the bottom lists them to merge by hand.
--
-- Past orders are unaffected either way: order_items keeps its own copy of
-- each line's name, price and quantity, so receipts and reports read
-- correctly whatever happens to the catalogue.
--
-- One statement at a time, no temporary tables — paste the whole thing and
-- run it. Safe to run twice.
-- ============================================================================

-- 1. Remove the later copies of any duplicated name --------------------------
-- location_menu_items, item_modifier_groups, item_allergens and favourites
-- all cascade from menu_items, so a dish's stray availability rows go with it.
delete from menu_items
 where id in (
   select id from (
     select id,
            row_number() over (partition by name order by created_at, id) as rn
       from menu_items
   ) ranked
    where rn > 1
 )
 -- …unless somebody ordered from that exact row.
 and id not in (select item_id from order_items where item_id is not null);

-- 2. Stop it happening again --------------------------------------------------
-- The whole per-branch menu design joins dishes by name. Two rows sharing a
-- name was never going to work, and now the database says so.
-- This FAILS if duplicates remain because they were ordered from — see step 1.
create unique index if not exists menu_items_name_key on menu_items (name);

-- ============================================================================
-- Check — run these after
-- ============================================================================
-- Names still duplicated. Expect 0 rows. Anything listed was ordered from and
-- needs merging by hand; tell me and I will write that bit.
--   select name, count(*) from menu_items group by name having count(*) > 1;
--
-- Battersea should now read 112 on sale, 62 hidden:
--   select count(*) filter (where is_available) as sells,
--          count(*) filter (where not is_available) as hidden
--     from location_menu_items li
--     join locations l on l.id = li.location_id
--    where l.slug = 'battersea';
--
-- The catalogue should be 175 — Balham's 147 plus Battersea's 28:
--   select count(*) from menu_items;
-- ============================================================================
