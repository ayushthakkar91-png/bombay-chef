-- Balham menu audit — READ ONLY, changes nothing.
-- Source: https://balham.bombaybicyclechef.uk/menu scraped 2026-11-09 (147 items).
-- Paste into the Supabase SQL editor and read the four result sets.
-- Names compare case/punctuation-insensitively: the catalog spells items
-- differently from the .uk site ("POTATO CHIPS (FRENCH FRIES)" vs "Chips (French Fries)").

with live(name, category, pence) as (values
  ('Butter Paneer (D)', 'Vegetable Mains', 1195),
  ('Bombay Paneer (D)', 'Vegetable Mains', 1195),
  ('Paneer Bhurji', 'Vegetable Mains', 1195),
  ('Paneer Karahi (Slightly Spicy) (D)', 'Vegetable Mains', 1195),
  ('Palak Paneer (D)', 'Vegetable Mains', 1095),
  ('Mutter Paneer (D)', 'Vegetable Mains', 1095),
  ('Paneer Green Masala (D) (N)', 'Vegetable Mains', 1195),
  ('Cheese Butter Masala', 'Vegetable Mains', 1195),
  ('Paneer Masala (N) (D)', 'Vegetable Mains', 1195),
  ('Mixed Vegetable Korma (D) (N)', 'Vegetable Mains', 1055),
  ('Shahi Paneer (D)', 'Vegetable Mains', 1195),
  ('Mixed Vegetables Curry (D)', 'Vegetable Mains', 1055),
  ('Cobra 620ml', 'Wines&Beer', 795),
  ('Red House Wine - Merlot', 'Wines&Beer', 1295),
  ('White House Wine - Sauvignon Blanc', 'Wines&Beer', 1295),
  ('Aachari Paneer Tikka', 'VEG STARTERS', 1095),
  ('Chips (French Fries)', 'VEG STARTERS', 345),
  ('Chilli Mushroom', 'VEG STARTERS', 655),
  ('Paneer Shashlik', 'VEG STARTERS', 995),
  ('Chilli Panner', 'VEG STARTERS', 995),
  ('Onion Bhaji (E)', 'VEG STARTERS', 595),
  ('Vegetable Momo', 'VEG STARTERS', 995),
  ('Vegetable Pakora', 'VEG STARTERS', 595),
  ('Vegetable Samosa (G)', 'VEG STARTERS', 595),
  ('Veg Hakka Noodles', 'Indo-Chinese', 995),
  ('Veg Manchow Soup', 'Indo-Chinese', 645),
  ('Veg Schezwan Rice', 'Indo-Chinese', 495),
  ('Vegetable Manchurian (Dry)', 'Indo-Chinese', 995),
  ('Vegetable Manchurian (Gravy)', 'Indo-Chinese', 995),
  ('Paneer Manchurian (Dry)', 'Indo-Chinese', 1095),
  ('Paneer Manchurian (Gravy)', 'Indo-Chinese', 1095),
  ('Chilli Garlic Manchurian', 'Indo-Chinese', 995),
  ('Chinese Bhel', 'Indo-Chinese', 895),
  ('Manchurian Soup', 'Indo-Chinese', 645),
  ('Veg Chilli Garlic Noodles', 'Indo-Chinese', 995),
  ('Veg Fried Rice', 'Indo-Chinese', 495),
  ('Paneer Noodles', 'Indo-Chinese', 995),
  ('Manchurian Noodles', 'Indo-Chinese', 995),
  ('Hot & Sour Soup', 'Indo-Chinese', 595),
  ('Schezwan Paneer', 'Indo-Chinese', 1095),
  ('Lamb Samosa', 'NON VEG STARTERS', 595),
  ('Chicken Shashlik', 'NON VEG STARTERS', 1095),
  ('Chicken Pakora', 'NON VEG STARTERS', 595),
  ('Chicken Lollipop', 'NON VEG STARTERS', 655),
  ('Chilli Chicken', 'NON VEG STARTERS', 995),
  ('Tandoori Chicken Tikka (d)', 'NON VEG STARTERS', 995),
  ('Tandoori Lamb Tikka (d)', 'NON VEG STARTERS', 995),
  ('Tandoori Lamb Chops', 'NON VEG STARTERS', 1295),
  ('Tandoori King Prawn', 'NON VEG STARTERS', 1495),
  ('Lamb Shish Kebab (d)', 'NON VEG STARTERS', 945),
  ('Tandoori Mixed Grill (s) (d)', 'NON VEG STARTERS', 1495),
  ('Tandoori Half Chicken', 'NON VEG STARTERS', 1095),
  ('King Prawn Masala (N) (S) (D)', 'SEAFOOD DISHES', 1595),
  ('King Prawn Bhuna (S) (D)', 'SEAFOOD DISHES', 1595),
  ('King Prawn Pathiya (S) (D)', 'SEAFOOD DISHES', 1595),
  ('King Prawn Dhansak (S) (D)', 'SEAFOOD DISHES', 1595),
  ('King Prawn Jalfrezi (S) (D)', 'SEAFOOD DISHES', 1595),
  ('Machli Masala (S) (D) (N)', 'SEAFOOD DISHES', 1395),
  ('Madras Fish Curry (S) (G) (D)', 'SEAFOOD DISHES', 1395),
  ('Chicken Vindaloo (D)', 'CHICKEN MAIN DISHES', 1155),
  ('Chicken Karahi (med spicy)(D)', 'CHICKEN MAIN DISHES', 1155),
  ('Chicken Tikka Masala (D) (N)', 'CHICKEN MAIN DISHES', 1155),
  ('Chicken Korma (N) (D)', 'CHICKEN MAIN DISHES', 1155),
  ('Butter Chicken (D) (N)', 'CHICKEN MAIN DISHES', 1155),
  ('Chicken Madras (D)', 'CHICKEN MAIN DISHES', 1155),
  ('Chicken Saag (D)', 'CHICKEN MAIN DISHES', 1155),
  ('Chicken Jalfreizi (D)', 'CHICKEN MAIN DISHES', 1155),
  ('Chicken Dhansak (D)', 'CHICKEN MAIN DISHES', 1155),
  ('Bombay Chicken (D) (M)', 'CHICKEN MAIN DISHES', 1155),
  ('Chicken Bhuna (D)', 'CHICKEN MAIN DISHES', 1155),
  ('Chicken Balti (D)', 'CHICKEN MAIN DISHES', 1155),
  ('Chicken Rogan (D)', 'CHICKEN MAIN DISHES', 1155),
  ('Lamb Dhansak (D)', 'LAMB MAIN DISHES', 1155),
  ('Bombay Lamb (D) (P) (M)', 'LAMB MAIN DISHES', 1155),
  ('Lamb Korma (D) (N)', 'LAMB MAIN DISHES', 1155),
  ('Lamb Tikka Masala Large (D) (N)', 'LAMB MAIN DISHES', 1155),
  ('Lamb Bhuma (D)', 'LAMB MAIN DISHES', 1155),
  ('Lamb Gosht (D)', 'LAMB MAIN DISHES', 1155),
  ('Lamb Vindaloo (D)', 'LAMB MAIN DISHES', 1155),
  ('Lamb Pasanda (N) (D)', 'LAMB MAIN DISHES', 1155),
  ('Lamb Rogan Josh (D)', 'LAMB MAIN DISHES', 1155),
  ('Lamb Madras (D)', 'LAMB MAIN DISHES', 1155),
  ('King Prawn Biryani', 'BIRYANIS', 1495),
  ('Mixed Biryani', 'BIRYANIS', 1495),
  ('Chicken Dum Biryani (D)', 'BIRYANIS', 995),
  ('Vegetable Biryani (D)', 'BIRYANIS', 1095),
  ('Chicken Tikka Biryani (D)', 'BIRYANIS', 1295),
  ('Lamb Biryani (D)', 'BIRYANIS', 1295),
  ('Palak Daal', 'VEGETARIAN SIDE DISHES', 795),
  ('Bombay Aloo (D)', 'VEGETARIAN SIDE DISHES', 795),
  ('Daal Makhani (D)', 'VEGETARIAN SIDE DISHES', 895),
  ('Saag Aloo (D)', 'VEGETARIAN SIDE DISHES', 795),
  ('Palak (D)', 'VEGETARIAN SIDE DISHES', 795),
  ('Gobi Sabji (D)', 'VEGETARIAN SIDE DISHES', 795),
  ('Aloo Gobhi (D)', 'VEGETARIAN SIDE DISHES', 795),
  ('Shahi Baingan (D)', 'VEGETARIAN SIDE DISHES', 795),
  ('Bhindi Sabji (D)', 'VEGETARIAN SIDE DISHES', 795),
  ('Bombay Mushroom (D)', 'VEGETARIAN SIDE DISHES', 795),
  ('Punjabi Channa Masala (D)', 'VEGETARIAN SIDE DISHES', 795),
  ('Tarka Daal (D)', 'VEGETARIAN SIDE DISHES', 795),
  ('Pilau Rice (D)', 'RICE & BREAD', 365),
  ('Egg Fried Rice (D) (E)', 'RICE & BREAD', 695),
  ('Plain Rice (V)', 'RICE & BREAD', 335),
  ('Mushroom Rice (D)', 'RICE & BREAD', 395),
  ('Peas Rice (D)', 'RICE & BREAD', 355),
  ('Cheese Chili Garlic Naan (D) (G) (E)', 'Bread', 445),
  ('Keema Naan (G) (E)', 'Bread', 395),
  ('Cheese Naan (D) (G) (E)', 'Bread', 415),
  ('Cheese Garlic Naan (D) (G) (E)', 'Bread', 425),
  ('Plain Naan (E) (G) (D)', 'Bread', 295),
  ('Garlic Naan (E) (G) (D)', 'Bread', 315),
  ('Peshwari Naan (E) (G) (N) (D)', 'Bread', 395),
  ('Tandoori Roti (G) (D)', 'Bread', 275),
  ('Laccha Paratha (G) (D)', 'Bread', 385),
  ('Regular Plain Rice', 'VEGAN DISHES', 335),
  ('Large Plain Rice', 'VEGAN DISHES', 535),
  ('Vegan Tandoori Roti', 'VEGAN DISHES', 295),
  ('Mixed Vegetables Curry', 'VEGAN DISHES', 1095),
  ('Bombay Aloo', 'VEGAN DISHES', 795),
  ('Saag Aloo', 'VEGAN DISHES', 795),
  ('Palak', 'VEGAN DISHES', 795),
  ('Gobi Sabji', 'VEGAN DISHES', 795),
  ('Aloo Gobhi', 'VEGAN DISHES', 795),
  ('Jeera Aloo', 'VEGAN DISHES', 795),
  ('Shahi Baingan', 'VEGAN DISHES', 795),
  ('Bhindi Sabji', 'VEGAN DISHES', 795),
  ('Bombay Mushroom', 'VEGAN DISHES', 795),
  ('Palak Daal', 'VEGAN DISHES', 795),
  ('Tarka Daal', 'VEGAN DISHES', 795),
  ('Can Of Coke (330ml)', 'Accompaniments', 175),
  ('Can Of Diet Coke (330ml)', 'Accompaniments', 175),
  ('Can Of Sprite (330ml)', 'Accompaniments', 175),
  ('Diet Coke 1.25L', 'Accompaniments', 295),
  ('Mineral Water', 'Accompaniments', 255),
  ('Homemade Plain Lassi (D)', 'Accompaniments', 425),
  ('Homemade Sweet Lassi (D)', 'Accompaniments', 425),
  ('Homemade Mango Lassi (D)', 'Accompaniments', 425),
  ('Popadoms Plain', 'Accompaniments', 150),
  ('Popadoms Spicy', 'Accompaniments', 150),
  ('Homemade Raitha (D)', 'Accompaniments', 150),
  ('Homemade Mint Yogurt (D)', 'Accompaniments', 150),
  ('Mango Chutney', 'Accompaniments', 100),
  ('Onion-Tomato Salad', 'Accompaniments', 150),
  ('Mixed Pickle', 'Accompaniments', 100),
  ('Lime Pickle', 'Accompaniments', 100),
  ('Lemonade Can (330ml)', 'Accompaniments', 175),
  ('Gulab Jamun(N)', 'Desserts', 295)
),
loc as (select id from locations where slug = 'balham'),
db as (
  select
    mi.id,
    mi.name,
    mi.category_id,
    mi.image_url,
    coalesce(lmi.price_pence_override, mi.price_pence) as effective_pence,
    coalesce(lmi.is_available, mi.is_available)        as effective_available
  from menu_items mi
  left join location_menu_items lmi
    on lmi.item_id = mi.id and lmi.location_id = (select id from loc)
),
l as (select *, upper(regexp_replace(name, '[^a-zA-Z0-9]', '', 'g')) as key from live),
d as (select *, upper(regexp_replace(name, '[^a-zA-Z0-9]', '', 'g')) as key from db)

-- 1. On the .uk menu but missing from the catalog, or hidden at Balham.
select '1_missing_or_hidden' as issue, l.name as live_name, l.category,
       (l.pence / 100.0)::numeric(10,2) as live_price,
       null::text as db_name, null::numeric as db_price, null::text as db_image
from l left join d on d.key = l.key
where d.id is null or d.effective_available is false

union all

-- 2. In both, but the Balham price does not match the .uk price.
select '2_price_mismatch', l.name, l.category,
       (l.pence / 100.0)::numeric(10,2),
       d.name, (d.effective_pence / 100.0)::numeric(10,2), d.image_url
from l join d on d.key = l.key
where d.effective_pence is distinct from l.pence

union all

-- 3. Orderable at Balham but NOT on the .uk menu — customers could order
--    something the kitchen no longer sells.
select '3_extra_in_db', null, d.category_id, null, d.name,
       (d.effective_pence / 100.0)::numeric(10,2), d.image_url
from d left join l on l.key = d.key
where l.key is null and d.effective_available is true

union all

-- 4. Matched and orderable, but has no photo.
select '4_no_photo', l.name, l.category,
       (l.pence / 100.0)::numeric(10,2),
       d.name, (d.effective_pence / 100.0)::numeric(10,2), d.image_url
from l join d on d.key = l.key
where d.effective_available is true and (d.image_url is null or d.image_url = '')

order by issue, live_name nulls last, db_name;
