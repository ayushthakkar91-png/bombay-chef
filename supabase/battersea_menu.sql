-- ============================================================================
-- ADD BATTERSEA TO ONLINE ORDERING  —  ADDITIVE, nothing is deleted
-- ============================================================================
-- Source: https://battersea.bombaybicyclechef.uk/menu  (scraped 2026-11-17)
--
-- 112 dishes sold at battersea. Of those, 84 already exist in
-- the catalogue (which was built from Balham) and 28 are new.
-- 62 catalogue dishes are NOT sold here and are switched off for
-- this branch only — Balham keeps all of them.
--
-- Prices differ between branches, so every dish gets an explicit override
-- rather than inheriting Balham's price.
--
-- Runs as one transaction: if any statement fails, nothing changes.
-- Safe to run twice.
-- ============================================================================

begin;

-- 1. The branch must exist and be open for business -------------------------
do $$ begin
  if not exists (select 1 from locations where slug = 'battersea') then
    raise exception 'No location with slug battersea — add it in admin > Locations first.';
  end if;
end $$;

-- 2. Categories this branch introduces --------------------------------------
insert into menu_categories (id, title, sort_order) values
  ('veg-starters', 'Veg Starters', 900),
  ('non-veg-starters', 'Non Veg Starters', 910),
  ('chicken-main-dishes', 'Chicken Mains', 920),
  ('lamb-main-dishes', 'Lamb Mains', 930),
  ('biryanis', 'Biryani', 940),
  ('vegetarian-side-dishes', 'Vegetable Sides', 950),
  ('rice', 'Rice & Bread', 960),
  ('bread', 'Bread', 970),
  ('vegan-dishes', 'Vegan Dishes', 980),
  ('accompaniments', 'Drinks & Accompaniments', 990),
  ('desserts', 'Desserts', 1000)
on conflict (id) do nothing;

-- 3. Dishes only battersea sells -------------------------------------------
-- Added to the shared catalogue, then switched OFF everywhere else, so they
-- do not appear on another branch's menu.
insert into menu_items (category_id, name, price, price_pence, description, image_url, sort_order, dietary) values
  ('veg-starters', 'French Fries', '£2.95', 295, 'Crispy golden fries, perfectly salted, served hot and fresh', null, 2000, '{}'::text[]),
  ('veg-starters', 'Chilli Paneer', '£8.95', 895, 'Succulent cottage cheese cubes tossed in spicy, tangy sauce with bell peppers and onions.', null, 2010, '{}'::text[]),
  ('non-veg-starters', 'Chicken Momo', '£9.95', 995, 'Minced chicken encased in thin dough, steamed to perfection, server with dipping sauce', null, 2020, '{}'::text[]),
  ('chicken-main-dishes', 'Chilli Chicken Curry (D)', '£11.55', 1155, 'Tandoori chicken breast slices, cooked with homemade spices, garlic, ginger, fresh green chilli & coriander and finished with soya sauce.', null, 2030, '{}'::text[]),
  ('lamb-main-dishes', 'Lamb Karahi', '£11.55', 1155, 'A tantalizing blend of tender Lamb, aromatic spices, and vibrant herbs, cooked to perfection in a slightly spicy, rich, and aromatic curry', null, 2040, '{}'::text[]),
  ('lamb-main-dishes', 'Lamb Tikka Masala (D) (N)', '£11.55', 1155, 'Tender lamb infused with aromatic spices, simmered in a rich onion-tomato gravy, enriched with cashews and cream.', null, 2050, '{}'::text[]),
  ('lamb-main-dishes', 'Lamb Bhuna (D)', '£11.55', 1155, 'Tender lamb cooked to perfection in a rich onion-tomato gravy, bursting with aromatic spices.', null, 2060, '{}'::text[]),
  ('biryanis', 'Vegetable Dum Biryani (D)', '£10.95', 1095, 'Savour our exquisite Lamb Biryani, a fragrant blend of succulent lamb, aromatic basmati rice, and chefs secret spices, creating a symphony of flavours in every bite. Served with vegetable gravy', null, 2070, '{}'::text[]),
  ('biryanis', 'Lamb Dum Biryani (D)', '£12.95', 1295, 'Tender lamb cooked with basmati rice.', null, 2080, '{}'::text[]),
  ('biryanis', 'Mixed Dum Biryani (D) (S)', '£13.95', 1395, 'Basmati rice mixed with chicken, lamb and king prawn.', null, 2090, '{}'::text[]),
  ('biryanis', 'King Prawn Dum Biryani (D) (S)', '£16.95', 1695, 'Spiced prawn cooked with basmati rice.', null, 2100, '{}'::text[]),
  ('biryanis', 'Chicken Tikka Dum Biryani (D)', '£12.95', 1295, 'Indulge in the rich flavours of our Chicken Tikka Biryani, where succulent marinated chicken meets aromatic basmati rice, creating a delightful fusion of spices. Served with vegetable gravy.', null, 2110, '{}'::text[]),
  ('vegetarian-side-dishes', 'Khaybari Channa Masala (D)', '£6.95', 695, 'Chick peas cooked with fresh tomatoes, onion, green pepper, ginger & our special channa masala.', null, 2120, '{}'::text[]),
  ('vegetarian-side-dishes', 'Palak Daal (D)', '£6.95', 695, 'Cumin flavoured mix lentils cooked with garlic, ginger & spinach leaves.', null, 2130, '{}'::text[]),
  ('rice', 'Basmati Pilau Rice (D)', '£3.65', 365, 'Fragrant basmati rice infused with spices, a perfect companion to savoury dishes.', null, 2140, '{}'::text[]),
  ('rice', 'Basmati Plain Rice', '£3.35', 335, 'Exquisite Basmati rice, expertly boiled for perfect texture, a delightful addition to your meal.', null, 2150, '{}'::text[]),
  ('rice', 'Special Mushroom Rice (D)', '£3.95', 395, 'Savour the exquisite blend of aromatic Basmati mushroom rice with sauteed mushrooms.', null, 2160, '{}'::text[]),
  ('bread', 'Kulcha Naan (E) (G) (D)', '£3.95', 395, 'Naan bread stuffed with mild spicy vegetables.', null, 2170, '{}'::text[]),
  ('bread', 'Keema Naan (E) (G) (D)', '£3.95', 395, 'Naan bread stuffed with spiced lamb mince meat.', null, 2180, '{}'::text[]),
  ('vegan-dishes', 'Zeera Aloo', '£5.95', 595, 'Cumin and coriander flavoured dry sauteed potatoes.', null, 2190, '{}'::text[]),
  ('vegan-dishes', 'Khaybari Channa Masala', '£6.15', 615, 'Chick peas cooked with fresh tomatoes, onions, green peppers, ginger and our special channa masala.', null, 2200, '{}'::text[]),
  ('accompaniments', 'Home Made Sweet Lassi (D)', '£4.25', 425, null, null, 2210, '{}'::text[]),
  ('accompaniments', 'Home Made Plain Lassi (D)', '£4.25', 425, null, null, 2220, '{}'::text[]),
  ('accompaniments', 'Coke 1.25L', '£2.95', 295, null, null, 2230, '{}'::text[]),
  ('accompaniments', 'Mineral Water 1.5L', '£2.55', 255, null, null, 2240, '{}'::text[]),
  ('accompaniments', 'Plain Poppadums', '£1.50', 150, null, null, 2250, '{}'::text[]),
  ('accompaniments', 'Spicy Poppadums', '£1.50', 150, 'Two in a portion', null, 2260, '{}'::text[]),
  ('desserts', 'Gulab Jamun (3 pcs) (N)', '£2.65', 265, 'Soft spongy balls flavoured with cardamom and pistachio nuts in sweet syrup.', null, 2270, '{}'::text[])
on conflict (name) do nothing;

-- Hide the new dishes at every OTHER branch.
insert into location_menu_items (location_id, item_id, is_available)
select l.id, m.id, false
  from locations l
  join menu_items m on m.name in (
    'French Fries',
    'Chilli Paneer',
    'Chicken Momo',
    'Chilli Chicken Curry (D)',
    'Lamb Karahi',
    'Lamb Tikka Masala (D) (N)',
    'Lamb Bhuna (D)',
    'Vegetable Dum Biryani (D)',
    'Lamb Dum Biryani (D)',
    'Mixed Dum Biryani (D) (S)',
    'King Prawn Dum Biryani (D) (S)',
    'Chicken Tikka Dum Biryani (D)',
    'Khaybari Channa Masala (D)',
    'Palak Daal (D)',
    'Basmati Pilau Rice (D)',
    'Basmati Plain Rice',
    'Special Mushroom Rice (D)',
    'Kulcha Naan (E) (G) (D)',
    'Keema Naan (E) (G) (D)',
    'Zeera Aloo',
    'Khaybari Channa Masala',
    'Home Made Sweet Lassi (D)',
    'Home Made Plain Lassi (D)',
    'Coke 1.25L',
    'Mineral Water 1.5L',
    'Plain Poppadums',
    'Spicy Poppadums',
    'Gulab Jamun (3 pcs) (N)'
  )
 where l.slug <> 'battersea'
on conflict (location_id, item_id) do update set is_available = excluded.is_available;

-- 4. What battersea sells, and for how much ----------------------------------
insert into location_menu_items (location_id, item_id, is_available, price_pence_override)
select l.id, m.id, true, v.pence
  from locations l
  cross join (values
    ('French Fries', 295),
    ('Paneer Shashlik', 895),
    ('Chilli Paneer', 895),
    ('Onion Bhaji (E)', 595),
    ('Vegetable Pakora', 595),
    ('Vegetable Samosa (G)', 595),
    ('Lamb Samosa', 595),
    ('Chicken Momo', 995),
    ('Tandoori Half Chicken', 1095),
    ('Tandoori King Prawn', 1395),
    ('Tandoori Chicken Tikka (d)', 895),
    ('Tandoori Lamb Tikka (d)', 895),
    ('Chicken Pakora', 595),
    ('Lamb Shish Kebab (d)', 995),
    ('Tandoori Mixed Grill (s) (d)', 1595),
    ('Shahi Paneer (D)', 1055),
    ('Mixed Vegetables Curry (D)', 1055),
    ('Mixed Vegetable Korma (D) (N)', 1055),
    ('Paneer Masala (N) (D)', 1055),
    ('Mutter Paneer (D)', 1055),
    ('Palak Paneer (D)', 1055),
    ('King Prawn Masala (N) (S) (D)', 1695),
    ('King Prawn Bhuna (S) (D)', 1695),
    ('King Prawn Pathiya (S) (D)', 1695),
    ('King Prawn Dhansak (S) (D)', 1695),
    ('King Prawn Jalfrezi (S) (D)', 1695),
    ('Chicken Vindaloo (D)', 1155),
    ('Chicken Karahi (med spicy)(D)', 1155),
    ('Chicken Tikka Masala (D) (N)', 1155),
    ('Chicken Korma (N) (D)', 1155),
    ('Butter Chicken (D) (N)', 1155),
    ('Chicken Madras (D)', 1155),
    ('Chicken Saag (D)', 1155),
    ('Chicken Jalfreizi (D)', 1155),
    ('Chicken Dhansak (D)', 1155),
    ('Bombay Chicken (D) (M)', 1155),
    ('Chicken Bhuna (D)', 1155),
    ('Chicken Balti (D)', 1155),
    ('Chilli Chicken Curry (D)', 1155),
    ('Chicken Rogan (D)', 1155),
    ('Lamb Karahi', 1155),
    ('Lamb Dhansak (D)', 1155),
    ('Bombay Lamb (D) (P) (M)', 1155),
    ('Lamb Korma (D) (N)', 1155),
    ('Lamb Tikka Masala (D) (N)', 1155),
    ('Lamb Bhuna (D)', 1155),
    ('Lamb Gosht (D)', 1155),
    ('Lamb Vindaloo (D)', 1155),
    ('Lamb Pasanda (N) (D)', 1155),
    ('Lamb Rogan Josh (D)', 1155),
    ('Lamb Madras (D)', 1155),
    ('Vegetable Dum Biryani (D)', 1095),
    ('Lamb Dum Biryani (D)', 1295),
    ('Mixed Dum Biryani (D) (S)', 1395),
    ('King Prawn Dum Biryani (D) (S)', 1695),
    ('Chicken Tikka Dum Biryani (D)', 1295),
    ('Bombay Aloo (D)', 695),
    ('Daal Makhani (D)', 695),
    ('Saag Aloo (D)', 695),
    ('Palak (D)', 695),
    ('Gobi Sabji (D)', 695),
    ('Aloo Gobhi (D)', 695),
    ('Shahi Baingan (D)', 695),
    ('Bhindi Sabji (D)', 695),
    ('Bombay Mushroom (D)', 695),
    ('Khaybari Channa Masala (D)', 695),
    ('Palak Daal (D)', 695),
    ('Tarka Daal (D)', 695),
    ('Basmati Pilau Rice (D)', 365),
    ('Egg Fried Rice (D) (E)', 695),
    ('Basmati Plain Rice', 335),
    ('Special Mushroom Rice (D)', 395),
    ('Peas Rice (D)', 355),
    ('Plain Naan (E) (G) (D)', 295),
    ('Garlic Naan (E) (G) (D)', 315),
    ('Peshwari Naan (E) (G) (N) (D)', 395),
    ('Kulcha Naan (E) (G) (D)', 395),
    ('Keema Naan (E) (G) (D)', 395),
    ('Tandoori Roti (G) (D)', 275),
    ('Laccha Paratha (G) (D)', 385),
    ('Regular Plain Rice', 295),
    ('Large Plain Rice', 495),
    ('Vegan Tandoori Roti', 215),
    ('Mixed Vegetables Curry', 895),
    ('Bombay Aloo', 595),
    ('Saag Aloo', 615),
    ('Palak', 645),
    ('Gobi Sabji', 615),
    ('Aloo Gobhi', 595),
    ('Zeera Aloo', 595),
    ('Shahi Baingan', 615),
    ('Bhindi Sabji', 655),
    ('Bombay Mushroom', 655),
    ('Khaybari Channa Masala', 615),
    ('Palak Daal', 595),
    ('Tarka Daal', 595),
    ('Homemade Mango Lassi (D)', 425),
    ('Home Made Sweet Lassi (D)', 425),
    ('Home Made Plain Lassi (D)', 425),
    ('Coke 1.25L', 295),
    ('Diet Coke 1.25L', 295),
    ('Mineral Water 1.5L', 255),
    ('Can Of Coke (330ml)', 100),
    ('Plain Poppadums', 150),
    ('Spicy Poppadums', 150),
    ('Homemade Raitha (D)', 150),
    ('Homemade Mint Yogurt (D)', 150),
    ('Mango Chutney', 100),
    ('Onion-Tomato Salad', 150),
    ('Mixed Pickle', 125),
    ('Lime Pickle', 125),
    ('Gulab Jamun (3 pcs) (N)', 265)
  ) as v(name, pence)
  join menu_items m on m.name = v.name
 where l.slug = 'battersea'
on conflict (location_id, item_id) do update
  set is_available = true, price_pence_override = excluded.price_pence_override;

-- 5. Catalogue dishes battersea does NOT sell -------------------------------
-- Switched off here only. Other branches are untouched.
insert into location_menu_items (location_id, item_id, is_available)
select l.id, m.id, false
  from locations l
  join menu_items m on m.name in (
    'Butter Paneer (D)',
    'Bombay Paneer (D)',
    'Paneer Bhurji',
    'Paneer Karahi (Slightly Spicy) (D)',
    'Paneer Green Masala (D) (N)',
    'Cheese Butter Masala',
    'Cobra 620ml',
    'Red House Wine - Merlot',
    'White House Wine - Sauvignon Blanc',
    'Aachari Paneer Tikka',
    'Chips (French Fries)',
    'Chilli Mushroom',
    'Chilli Panner',
    'Vegetable Momo',
    'Veg Hakka Noodles',
    'Veg Manchow Soup',
    'Veg Schezwan Rice',
    'Vegetable Manchurian (Dry)',
    'Vegetable Manchurian (Gravy)',
    'Paneer Manchurian (Dry)',
    'Paneer Manchurian (Gravy)',
    'Chilli Garlic Manchurian',
    'Chinese Bhel',
    'Manchurian Soup',
    'Veg Chilli Garlic Noodles',
    'Veg Fried Rice',
    'Paneer Noodles',
    'Manchurian Noodles',
    'Hot & Sour Soup',
    'Schezwan Paneer',
    'Chicken Shashlik',
    'Chicken Lollipop',
    'Chilli Chicken',
    'Tandoori Lamb Chops',
    'Machli Masala (S) (D) (N)',
    'Madras Fish Curry (S) (G) (D)',
    'Lamb Tikka Masala Large (D) (N)',
    'Lamb Bhuma (D)',
    'King Prawn Biryani',
    'Mixed Biryani',
    'Chicken Dum Biryani (D)',
    'Vegetable Biryani (D)',
    'Chicken Tikka Biryani (D)',
    'Lamb Biryani (D)',
    'Punjabi Channa Masala (D)',
    'Pilau Rice (D)',
    'Plain Rice (V)',
    'Mushroom Rice (D)',
    'Cheese Chili Garlic Naan (D) (G) (E)',
    'Keema Naan (G) (E)',
    'Cheese Naan (D) (G) (E)',
    'Cheese Garlic Naan (D) (G) (E)',
    'Jeera Aloo',
    'Can Of Diet Coke (330ml)',
    'Can Of Sprite (330ml)',
    'Mineral Water',
    'Homemade Plain Lassi (D)',
    'Homemade Sweet Lassi (D)',
    'Popadoms Plain',
    'Popadoms Spicy',
    'Lemonade Can (330ml)',
    'Gulab Jamun(N)'
  )
 where l.slug = 'battersea'
on conflict (location_id, item_id) do update set is_available = false;

commit;

-- Check it landed:
--   select count(*) filter (where is_available) as sells,
--          count(*) filter (where not is_available) as hidden
--     from location_menu_items li
--     join locations l on l.id = li.location_id
--    where l.slug = 'battersea';
