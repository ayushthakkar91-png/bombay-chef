-- ============================================================================
-- BATTERSEA: sell the same menu as Balham, at the same prices
-- ============================================================================
-- Run AFTER battersea_setup.sql.
--
-- The catalogue (menu_items) IS Balham's menu — it was rebuilt from Balham's
-- Touch site on 2026-11-09. A branch only departs from it through
-- location_menu_items, where a row can hide a dish or change its price.
--
-- So "everything the same as Balham" is expressed by having NO rows: an absent
-- row means available, at the catalogue price, on both the menu page and at
-- checkout. This script simply makes sure none are left behind.
--
-- ----------------------------------------------------------------------------
-- WORTH KNOWING, then ignore if you are sure
--
-- Battersea's own Touch site (battersea.bombaybicyclechef.uk) currently lists
-- different prices for 48 dishes — Shahi Paneer £10.55 there against £11.95 at
-- Balham — plus 28 dishes Balham does not have and 63 of Balham's it does not
-- sell. Those are captured in supabase/battersea-live-menu.json if you ever
-- want them.
--
-- You have said the two branches are the same, so this script follows that.
-- To price Battersea separately later:
--     node scripts/gen-branch-menu-sql.mjs battersea > supabase/battersea_menu.sql
-- ----------------------------------------------------------------------------
--
-- Safe to run twice.
-- ============================================================================

begin;

delete from location_menu_items
 where location_id = (select id from locations where slug = 'battersea');

commit;

-- Check: this should return 0 rows, and the menu page should then show every
-- Balham dish at Balham's price.
--   select count(*) from location_menu_items
--    where location_id = (select id from locations where slug = 'battersea');
--
-- And the branch menu itself:
--   https://www.bombay-bicycle-chef.com/order/menu?loc=battersea
