-- ============================================================================
-- REMOVE DUPLICATE DISHES, AND MAKE THEM IMPOSSIBLE
-- ============================================================================
-- battersea_menu.sql added 28 dishes with "on conflict do nothing". There is
-- no unique constraint on menu_items.name, so there was no conflict to
-- detect: running the script a second time inserted all 28 again. Section 4
-- joins dishes BY NAME, so each duplicate got its own availability row and
-- Battersea reported 141 dishes on sale instead of 112.
--
-- This removes the surplus copies, keeping the OLDEST of each name — the one
-- that photos, modifiers and any past order line already point at — and then
-- adds the unique index that should always have been there.
--
-- Nothing a customer ordered is touched: order_items keeps its own copy of
-- each line's name, price and quantity, so past orders and reports still read
-- correctly whatever happens to the catalogue.
--
-- Runs as one transaction. Safe to run twice.
-- ============================================================================

begin;

-- 1. What we are about to remove ---------------------------------------------
-- Keeps the earliest row per name; everything later with the same name goes.
create temporary table dupes_to_remove on commit drop as
with ranked as (
  select id, name,
         row_number() over (partition by name order by created_at nulls first, id) as rn
    from menu_items
)
select id, name from ranked where rn > 1;

-- A duplicate that somebody has actually ordered from is kept, not deleted:
-- an order line pointing at a dish is worth more than a tidy catalogue, and
-- the row can be merged by hand later.
delete from dupes_to_remove d
 where exists (select 1 from order_items oi where oi.item_id = d.id);

-- 2. Remove them --------------------------------------------------------------
-- location_menu_items, item_modifier_groups, item_allergens and favourites all
-- cascade from menu_items, so the stray availability rows go with the dish.
delete from menu_items m
 where m.id in (select id from dupes_to_remove);

-- 3. Stop it happening again ---------------------------------------------------
-- The whole per-branch menu design joins dishes by name. Two rows sharing a
-- name was never going to work, and now the database says so.
create unique index if not exists menu_items_name_key on menu_items (name);

commit;

-- ============================================================================
-- Check
-- ============================================================================
-- Any names still duplicated (expect 0 rows; anything here was ordered from
-- and needs merging by hand):
--   select name, count(*) from menu_items group by name having count(*) > 1;
--
-- Battersea should now read 112 on sale, 62 hidden:
--   select count(*) filter (where is_available) as sells,
--          count(*) filter (where not is_available) as hidden
--     from location_menu_items li
--     join locations l on l.id = li.location_id
--    where l.slug = 'battersea';
--
-- And Balham should still have its own 147:
--   select count(*) from menu_items;
-- ============================================================================
