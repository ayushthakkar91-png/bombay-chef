-- Bombay Bicycle Chef — Balham online-ordering menu
-- Mirrors the live Balham menu at balham.bombaybicyclechef.uk (items, prices, photos).
-- Idempotent / re-runnable. Run in the Supabase SQL editor AFTER seed.sql +
-- seed_ordering.sql. Scope: Balham only (all changes via location_menu_items).
--   * adds source-only items to the shared catalog (routed to keep public /menu clean)
--   * self-hosted images -> /menu-images/balham/<handle>.webp
--   * Balham price overrides = exact .uk pence; hides catalog items not on the .uk menu
begin;

-- 1. New catalog items (only those absent from the current menu) ----------------
insert into menu_items (category_id, name, price, price_pence, description, image_url, sort_order)
select 'vegetarian-main-dishes','Butter Paneer (D)','£11.95',1195,'Featuring succulent Paneer in a rich onion-tomato gravy, blended with cashew nuts, and finished with a luxurious touch of Cream and Butter. contains nuts and dairy',null,900
where not exists (select 1 from menu_items where category_id='vegetarian-main-dishes' and name='Butter Paneer (D)');
insert into menu_items (category_id, name, price, price_pence, description, image_url, sort_order)
select 'vegetarian-main-dishes','Cheese Butter Masala','£11.95',1195,'A rich and creamy dish made with soft paneer and cheese cubes, cooked in a buttery chopped tomato and onion gravy, blended with aromatic spices and finished with fresh cream for a smooth, flavourful taste',null,900
where not exists (select 1 from menu_items where category_id='vegetarian-main-dishes' and name='Cheese Butter Masala');
insert into menu_items (category_id, name, price, price_pence, description, image_url, sort_order)
select 'vegetarian-main-dishes','Shahi Paneer (D)','£11.95',1195,'Paneer cubes cooked in onion-tomato gravy and cream, delivering a mild and flavourful taste.',null,900
where not exists (select 1 from menu_items where category_id='vegetarian-main-dishes' and name='Shahi Paneer (D)');
insert into menu_items (category_id, name, price, price_pence, description, image_url, sort_order)
select 'drinks-beers','Cobra 620ml','£7.95',795,null,null,900
where not exists (select 1 from menu_items where category_id='drinks-beers' and name='Cobra 620ml');
insert into menu_items (category_id, name, price, price_pence, description, image_url, sort_order)
select 'drinks-red-wine','Red House Wine - Merlot','£12.95',1295,'75cl',null,900
where not exists (select 1 from menu_items where category_id='drinks-red-wine' and name='Red House Wine - Merlot');
insert into menu_items (category_id, name, price, price_pence, description, image_url, sort_order)
select 'drinks-white-wine','White House Wine - Sauvignon Blanc','£12.95',1295,'75cl',null,900
where not exists (select 1 from menu_items where category_id='drinks-white-wine' and name='White House Wine - Sauvignon Blanc');
insert into menu_items (category_id, name, price, price_pence, description, image_url, sort_order)
select 'veg-starters','Aachari Paneer Tikka','£10.95',1095,'Soft cubes of paneer are marinated in a spiced yogurt mixture infused with achari masala a blend of mustard seeds, fennel, nigella, fenugreek, and cumin seeds along with ginger-garlic paste, chili, and aromatic spices. The paneer is then skewered with onions and bell peppers and grilled or roasted until lightly charred on the outside while remaining soft and creamy inside. Contains Dairy, mustard and fennel seeds.',null,900
where not exists (select 1 from menu_items where category_id='veg-starters' and name='Aachari Paneer Tikka');
insert into menu_items (category_id, name, price, price_pence, description, image_url, sort_order)
select 'lamb-main-dishes','Bombay Lamb (D) (P) (M)','£11.55',1155,'Tender lamb cooked with curry sauce, ginger, garlic, coriander, onions, green chili and fresh tomatoes. (Extra Hot)',null,900
where not exists (select 1 from menu_items where category_id='lamb-main-dishes' and name='Bombay Lamb (D) (P) (M)');
insert into menu_items (category_id, name, price, price_pence, description, image_url, sort_order)
select 'lamb-main-dishes','Lamb Gosht (D)','£11.55',1155,'Tender lamb simmered in a fragrant onion-tomato gravy, with vibrant fresh spinach.',null,900
where not exists (select 1 from menu_items where category_id='lamb-main-dishes' and name='Lamb Gosht (D)');
insert into menu_items (category_id, name, price, price_pence, description, image_url, sort_order)
select 'breads','Cheese Chili Garlic Naan (D) (G) (E)','£4.45',445,'Soft naan bread stuffed with melted cheese and topped with chilli and garlic for a flavourful kick. Contains dairy, gluten and egg',null,900
where not exists (select 1 from menu_items where category_id='breads' and name='Cheese Chili Garlic Naan (D) (G) (E)');
insert into menu_items (category_id, name, price, price_pence, description, image_url, sort_order)
select 'breads','Cheese Garlic Naan (D) (G) (E)','£4.25',425,'Soft tandoor-baked naan stuffed with melted cheese and topped with flavorful garlic. Contains dairy, gluten and egg',null,900
where not exists (select 1 from menu_items where category_id='breads' and name='Cheese Garlic Naan (D) (G) (E)');
insert into menu_items (category_id, name, price, price_pence, description, image_url, sort_order)
select 'drinks-soft','Can Of Coke (330ml)','£1.75',175,null,null,900
where not exists (select 1 from menu_items where category_id='drinks-soft' and name='Can Of Coke (330ml)');
insert into menu_items (category_id, name, price, price_pence, description, image_url, sort_order)
select 'drinks-soft','Can Of Diet Coke (330ml)','£1.75',175,null,null,900
where not exists (select 1 from menu_items where category_id='drinks-soft' and name='Can Of Diet Coke (330ml)');
insert into menu_items (category_id, name, price, price_pence, description, image_url, sort_order)
select 'drinks-soft','Can Of Sprite (330ml)','£1.75',175,null,null,900
where not exists (select 1 from menu_items where category_id='drinks-soft' and name='Can Of Sprite (330ml)');
insert into menu_items (category_id, name, price, price_pence, description, image_url, sort_order)
select 'drinks-soft','Diet Coke 1.25L','£2.95',295,null,null,900
where not exists (select 1 from menu_items where category_id='drinks-soft' and name='Diet Coke 1.25L');
insert into menu_items (category_id, name, price, price_pence, description, image_url, sort_order)
select 'drinks-soft','Mineral Water','£2.55',255,null,null,900
where not exists (select 1 from menu_items where category_id='drinks-soft' and name='Mineral Water');
insert into menu_items (category_id, name, price, price_pence, description, image_url, sort_order)
select 'drinks-soft','Homemade Plain Lassi (D)','£4.25',425,null,null,900
where not exists (select 1 from menu_items where category_id='drinks-soft' and name='Homemade Plain Lassi (D)');
insert into menu_items (category_id, name, price, price_pence, description, image_url, sort_order)
select 'drinks-soft','Homemade Sweet Lassi  (D)','£4.25',425,null,null,900
where not exists (select 1 from menu_items where category_id='drinks-soft' and name='Homemade Sweet Lassi  (D)');
insert into menu_items (category_id, name, price, price_pence, description, image_url, sort_order)
select 'drinks-soft','Homemade Mango Lassi  (D)','£4.25',425,null,null,900
where not exists (select 1 from menu_items where category_id='drinks-soft' and name='Homemade Mango Lassi  (D)');
insert into menu_items (category_id, name, price, price_pence, description, image_url, sort_order)
select 'veg-starters','Popadoms Plain','£1.50',150,null,'/menu-images/balham/popadoms_plain.webp',900
where not exists (select 1 from menu_items where category_id='veg-starters' and name='Popadoms Plain');
insert into menu_items (category_id, name, price, price_pence, description, image_url, sort_order)
select 'veg-starters','Popadoms Spicy','£1.50',150,'Two in a portion','/menu-images/balham/popadoms_spicy.webp',900
where not exists (select 1 from menu_items where category_id='veg-starters' and name='Popadoms Spicy');
insert into menu_items (category_id, name, price, price_pence, description, image_url, sort_order)
select 'yoghurt-pickle','Homemade Raitha (D)','£1.50',150,null,null,900
where not exists (select 1 from menu_items where category_id='yoghurt-pickle' and name='Homemade Raitha (D)');
insert into menu_items (category_id, name, price, price_pence, description, image_url, sort_order)
select 'yoghurt-pickle','Homemade Mint Yogurt (D)','£1.50',150,null,'/menu-images/balham/homemade_mint_yogurt_d.webp',900
where not exists (select 1 from menu_items where category_id='yoghurt-pickle' and name='Homemade Mint Yogurt (D)');
insert into menu_items (category_id, name, price, price_pence, description, image_url, sort_order)
select 'yoghurt-pickle','Mango Chutney','£1.00',100,null,'/menu-images/balham/mango_chutney.webp',900
where not exists (select 1 from menu_items where category_id='yoghurt-pickle' and name='Mango Chutney');
insert into menu_items (category_id, name, price, price_pence, description, image_url, sort_order)
select 'yoghurt-pickle','Onion-Tomato Salad','£1.50',150,'Freshly chopped onions and tomatoes, drizzled with lemon juice and fresh coriander.',null,900
where not exists (select 1 from menu_items where category_id='yoghurt-pickle' and name='Onion-Tomato Salad');
insert into menu_items (category_id, name, price, price_pence, description, image_url, sort_order)
select 'drinks-soft','Lemonade Can (330ml)','£1.75',175,null,'/menu-images/balham/lemonade_can_330ml.webp',900
where not exists (select 1 from menu_items where category_id='drinks-soft' and name='Lemonade Can (330ml)');

-- 2. Attach source photos to existing catalog items --------------------------
update menu_items set image_url='/menu-images/balham/chips_french_fries.webp' where category_id='veg-starters' and name='POTATO CHIPS (FRENCH FRIES)' and (image_url is null or image_url='');
update menu_items set image_url='/menu-images/balham/onion_bhaji_e.webp' where category_id='veg-starters' and name='ONION BHAJI (2 PCS) (E)' and (image_url is null or image_url='');
update menu_items set image_url='/menu-images/balham/vegetable_pakora.webp' where category_id='veg-starters' and name='MIX VEG PAKORA' and (image_url is null or image_url='');
update menu_items set image_url='/menu-images/balham/vegetable_samosa_g.webp' where category_id='veg-starters' and name='VEG SAMOSA (2 PCS) (G)' and (image_url is null or image_url='');
update menu_items set image_url='/menu-images/balham/chilli_chicken.webp' where category_id='non-veg-starters' and name='CHILLI CHICKEN (🌶)' and (image_url is null or image_url='');
update menu_items set image_url='/menu-images/balham/tandoori_mixed_grill_s_d.webp' where category_id='tandoori-main-course' and name='TANDOORI MIXED GRILLED (D S 🌶)' and (image_url is null or image_url='');
update menu_items set image_url='/menu-images/balham/king_prawn_masala_n_s_d.webp' where category_id='seafood-main-dishes' and name='KING PRAWN MASALA (N D S)' and (image_url is null or image_url='');
update menu_items set image_url='/menu-images/balham/king_prawn_bhuna_s_d.webp' where category_id='seafood-main-dishes' and name='KING PRAWN BHUNA (D S 🌶)' and (image_url is null or image_url='');
update menu_items set image_url='/menu-images/balham/king_prawn_pathiya_s_d.webp' where category_id='seafood-main-dishes' and name='KING PRAWN PATHIYA (D S 🌶)' and (image_url is null or image_url='');
update menu_items set image_url='/menu-images/balham/king_prawn_dhansak_s_d.webp' where category_id='seafood-main-dishes' and name='KING PRAWN DHANSAK (D S 🌶)' and (image_url is null or image_url='');
update menu_items set image_url='/menu-images/balham/king_prawn_jalfrezi_s_d.webp' where category_id='seafood-main-dishes' and name='KING PRAWN JALFREZI (D S 🌶🌶🌶)' and (image_url is null or image_url='');
update menu_items set image_url='/menu-images/balham/machli_masala_s_d_n.webp' where category_id='seafood-main-dishes' and name='MACHLI MASALA (D G S N)' and (image_url is null or image_url='');
update menu_items set image_url='/menu-images/balham/madras_fish_curry_s_g_d.webp' where category_id='seafood-main-dishes' and name='MADRAS FISH CURRY (D G S 🌶🌶🌶)' and (image_url is null or image_url='');
update menu_items set image_url='/menu-images/balham/chicken_tikka_masala_d_n.webp' where category_id='chicken-main-dishes' and name='CHICKEN TIKKA MASALA (N D)' and (image_url is null or image_url='');
update menu_items set image_url='/menu-images/balham/chicken_korma_n_d.webp' where category_id='chicken-main-dishes' and name='CHICKEN KORMA (N D)' and (image_url is null or image_url='');
update menu_items set image_url='/menu-images/balham/butter_chicken_d_n.webp' where category_id='chicken-main-dishes' and name='BUTTER CHICKEN (N D)' and (image_url is null or image_url='');
update menu_items set image_url='/menu-images/balham/chicken_madras_d.webp' where category_id='chicken-main-dishes' and name='CHICKEN MADRAS (D 🌶🌶🌶)' and (image_url is null or image_url='');
update menu_items set image_url='/menu-images/balham/chicken_saag_d.webp' where category_id='chicken-main-dishes' and name='CHICKEN SAAG (D 🌶)' and (image_url is null or image_url='');
update menu_items set image_url='/menu-images/balham/chicken_jalfreizi_d.webp' where category_id='chicken-main-dishes' and name='CHICKEN JALFRAZO (D 🌶🌶🌶)' and (image_url is null or image_url='');
update menu_items set image_url='/menu-images/balham/chicken_dhansak_d.webp' where category_id='chicken-main-dishes' and name='CHICKEN DHANSAK (D 🌶)' and (image_url is null or image_url='');
update menu_items set image_url='/menu-images/balham/bombay_chicken_d_m.webp' where category_id='chicken-main-dishes' and name='BOMBAY CHICKEN (D P M 🌶🌶🌶)' and (image_url is null or image_url='');
update menu_items set image_url='/menu-images/balham/chicken_balti_d.webp' where category_id='chicken-main-dishes' and name='CHICKEN BALTI (D P 🌶)' and (image_url is null or image_url='');
update menu_items set image_url='/menu-images/balham/chicken_rogan_d.webp' where category_id='chicken-main-dishes' and name='CHICKEN ROGAN (D)' and (image_url is null or image_url='');
update menu_items set image_url='/menu-images/balham/lamb_korma_d_n.webp' where category_id='lamb-main-dishes' and name='LAMB KORMA (N D)' and (image_url is null or image_url='');
update menu_items set image_url='/menu-images/balham/lamb_vindaloo_d.webp' where category_id='lamb-main-dishes' and name='LAMB VINDALOO (D P 🌶🌶🌶)' and (image_url is null or image_url='');
update menu_items set image_url='/menu-images/balham/lamb_pasanda_n_d.webp' where category_id='lamb-main-dishes' and name='LAMB PASANDA (N D)' and (image_url is null or image_url='');
update menu_items set image_url='/menu-images/balham/lamb_rogan_josh_d.webp' where category_id='lamb-main-dishes' and name='LAMB ROGAN JOSH (D 🌶)' and (image_url is null or image_url='');
update menu_items set image_url='/menu-images/balham/lamb_madras_d.webp' where category_id='lamb-main-dishes' and name='LAMB MADRAS (D 🌶🌶🌶)' and (image_url is null or image_url='');
update menu_items set image_url='/menu-images/balham/vegetable_biryani_d.webp' where category_id='biryanis' and name='VEGETABLE BIRYANI (D)' and (image_url is null or image_url='');
update menu_items set image_url='/menu-images/balham/lamb_biryani_d.webp' where category_id='biryanis' and name='LAMB BIRYANI (D)' and (image_url is null or image_url='');
update menu_items set image_url='/menu-images/balham/bombay_aloo_d.webp' where category_id='vegetarian-side-dishes' and name='BOMBAY ALOO (V)' and (image_url is null or image_url='');
update menu_items set image_url='/menu-images/balham/saag_aloo_d.webp' where category_id='vegetarian-side-dishes' and name='SAAG ALOO (V)' and (image_url is null or image_url='');
update menu_items set image_url='/menu-images/balham/palak_d.webp' where category_id='vegetarian-side-dishes' and name='PALAK (V)' and (image_url is null or image_url='');
update menu_items set image_url='/menu-images/balham/gobi_sabji_d.webp' where category_id='vegetarian-side-dishes' and name='GOBI SABJI (V)' and (image_url is null or image_url='');
update menu_items set image_url='/menu-images/balham/aloo_gobhi_d.webp' where category_id='vegetarian-side-dishes' and name='ALOO GOBI (V)' and (image_url is null or image_url='');
update menu_items set image_url='/menu-images/balham/shahi_baingan_d.webp' where category_id='vegetarian-side-dishes' and name='SHAHI BAINGAN (V)' and (image_url is null or image_url='');
update menu_items set image_url='/menu-images/balham/bhindi_sabji_d.webp' where category_id='vegetarian-side-dishes' and name='BHINDI SABJI (V)' and (image_url is null or image_url='');
update menu_items set image_url='/menu-images/balham/bombay_mushroom_d.webp' where category_id='vegetarian-side-dishes' and name='BOMBAY MUSHROOM (V)' and (image_url is null or image_url='');
update menu_items set image_url='/menu-images/balham/tarka_daal_d.webp' where category_id='vegetarian-side-dishes' and name='TARKA DAAL (V)' and (image_url is null or image_url='');
update menu_items set image_url='/menu-images/balham/peas_rice_d.webp' where category_id='rice' and name='PEAS RICE (D) (Small/Large)' and (image_url is null or image_url='');
update menu_items set image_url='/menu-images/balham/plain_naan_e_g_d.webp' where category_id='breads' and name='PLAIN NAAN (D G E)' and (image_url is null or image_url='');
update menu_items set image_url='/menu-images/balham/garlic_naan_e_g_d.webp' where category_id='breads' and name='GARLIC NAAN (D G E)' and (image_url is null or image_url='');
update menu_items set image_url='/menu-images/balham/peshwari_naan_e_g_n_d.webp' where category_id='breads' and name='PESHAWARI NAAN (D G E N)' and (image_url is null or image_url='');
update menu_items set image_url='/menu-images/balham/tandoori_roti_g_d.webp' where category_id='breads' and name='TANDOORI ROTI (G)' and (image_url is null or image_url='');
update menu_items set image_url='/menu-images/balham/laccha_paratha_g_d.webp' where category_id='breads' and name='LACHHA PARATHA (D G)' and (image_url is null or image_url='');
update menu_items set image_url='/menu-images/balham/mixed_pickle.webp' where category_id='yoghurt-pickle' and name='MIXED PICKLE' and (image_url is null or image_url='');
update menu_items set image_url='/menu-images/balham/lime_pickle.webp' where category_id='yoghurt-pickle' and name='LIME PICKLE' and (image_url is null or image_url='');

-- 3. Rice size options (Regular / Large) -------------------------------------
do $$
declare rid uuid; gid uuid;
begin
  select id into rid from menu_items where category_id='rice' and name='PILAU RICE (D) (Small/Large)' limit 1;
  if rid is not null and not exists (select 1 from item_modifier_groups where item_id=rid and name='Size') then
    insert into item_modifier_groups (item_id,name,min_select,max_select,sort_order) values (rid,'Size',1,1,0) returning id into gid;
    insert into item_modifiers (group_id,name,price_delta_pence,is_default,sort_order) values
      (gid,'Regular',0,true,0),(gid,'Large',200,false,1);
  end if;
  select id into rid from menu_items where category_id='rice' and name='PLAIN RICE (V) (Small/Large)' limit 1;
  if rid is not null and not exists (select 1 from item_modifier_groups where item_id=rid and name='Size') then
    insert into item_modifier_groups (item_id,name,min_select,max_select,sort_order) values (rid,'Size',1,1,0) returning id into gid;
    insert into item_modifiers (group_id,name,price_delta_pence,is_default,sort_order) values
      (gid,'Regular',0,true,0),(gid,'Large',200,false,1);
  end if;
  select id into rid from menu_items where category_id='rice' and name='SPECIAL MUSHROOM RICE (D) (Small/Large)' limit 1;
  if rid is not null and not exists (select 1 from item_modifier_groups where item_id=rid and name='Size') then
    insert into item_modifier_groups (item_id,name,min_select,max_select,sort_order) values (rid,'Size',1,1,0) returning id into gid;
    insert into item_modifiers (group_id,name,price_delta_pence,is_default,sort_order) values
      (gid,'Regular',0,true,0),(gid,'Large',200,false,1);
  end if;
  select id into rid from menu_items where category_id='rice' and name='PEAS RICE (D) (Small/Large)' limit 1;
  if rid is not null and not exists (select 1 from item_modifier_groups where item_id=rid and name='Size') then
    insert into item_modifier_groups (item_id,name,min_select,max_select,sort_order) values (rid,'Size',1,1,0) returning id into gid;
    insert into item_modifiers (group_id,name,price_delta_pence,is_default,sort_order) values
      (gid,'Regular',0,true,0),(gid,'Large',200,false,1);
  end if;
end $$;

-- 4. Balham location scoping -------------------------------------------------
do $$
declare loc uuid;
begin
  select id into loc from locations where slug='balham';
  if loc is null then raise notice 'no balham location'; return; end if;

  -- 4a. Hide catalog items that are NOT on the .uk menu (Balham only).
  insert into location_menu_items (location_id, item_id, is_available)
  select loc, mi.id, false from menu_items mi
  where mi.name not in (
    'BOMBAY PANEER (D 🌶🌶🌶)',
    'PANEER BHURJI (D 🌶)',
    'PANEER KARAHI (D 🌶)',
    'PALAK PANEER (D)',
    'MUTTER PANEER (D 🌶)',
    'PANEER GREEN MASALA (D N)',
    'PANEER MASALA (D)',
    'MIX VEG KORMA (N D)',
    'MIX VEG CURRY (V 🌶)',
    'POTATO CHIPS (FRENCH FRIES)',
    'CHILLI MUSHROOM (🌶)',
    'PANEER SHASHLIK (D 🌶)',
    'CHILLI PANEER (D)',
    'ONION BHAJI (2 PCS) (E)',
    'VEGETABLE MOMO',
    'MIX VEG PAKORA',
    'VEG SAMOSA (2 PCS) (G)',
    'VEG HAKKA NOODLES',
    'MANCHOW SOUP',
    'VEG SCHEZWAN RICE',
    'VEGETABLE MANCHURIAN (GRAVY)',
    'PANEER MANCHURIAN (DRY)',
    'CHILLI GARLIC MANCHURIAN',
    'CHINESE BHEL',
    'MANCHURIAN SOUP',
    'CHILLI GARLIC NOODLES',
    'VEG FRIED RICE',
    'PANEER NOODLES',
    'MANCHURIAN NOODLES',
    'HOT & SOUR SOUP',
    'SCHEZWAN PANEER',
    'LAMB SAMOSA (2 PCS) (G)',
    'CHICKEN SHASHLIK (D 🌶)',
    'CHICKEN PAKORA (D)',
    'CHICKEN LOLLIPOP (🌶)',
    'CHILLI CHICKEN (🌶)',
    'CHICKEN TIKKA (D 🌶)',
    'LAMB TIKKA (D 🌶)',
    'LAMB CHOPS (D)',
    'TANDOORI KING PRAWN (D S)',
    'LAMB SHISH KEBAB (D 🌶)',
    'TANDOORI MIXED GRILLED (D S 🌶)',
    'TANDOORI CHICKEN (D)',
    'KING PRAWN MASALA (N D S)',
    'KING PRAWN BHUNA (D S 🌶)',
    'KING PRAWN PATHIYA (D S 🌶)',
    'KING PRAWN DHANSAK (D S 🌶)',
    'KING PRAWN JALFREZI (D S 🌶🌶🌶)',
    'MACHLI MASALA (D G S N)',
    'MADRAS FISH CURRY (D G S 🌶🌶🌶)',
    'CHICKEN VINDALOO (D 🌶🌶🌶)',
    'KARAHI CHICKEN (D)',
    'CHICKEN TIKKA MASALA (N D)',
    'CHICKEN KORMA (N D)',
    'BUTTER CHICKEN (N D)',
    'CHICKEN MADRAS (D 🌶🌶🌶)',
    'CHICKEN SAAG (D 🌶)',
    'CHICKEN JALFRAZO (D 🌶🌶🌶)',
    'CHICKEN DHANSAK (D 🌶)',
    'BOMBAY CHICKEN (D P M 🌶🌶🌶)',
    'CHICKEN BHUNA (D 🌶)',
    'CHICKEN BALTI (D P 🌶)',
    'CHICKEN ROGAN (D)',
    'LAMB DHANSAK (D)',
    'LAMB KORMA (N D)',
    'LAMB TIKKA MASALA (N D)',
    'LAMB BHUNA (D 🌶)',
    'LAMB VINDALOO (D P 🌶🌶🌶)',
    'LAMB PASANDA (N D)',
    'LAMB ROGAN JOSH (D 🌶)',
    'LAMB MADRAS (D 🌶🌶🌶)',
    'KING PRAWN BIRYANI (D S)',
    'MIXED BIRYANI (D S)',
    'CHICKEN DUM BIRYANI (D)',
    'VEGETABLE BIRYANI (D)',
    'CHICKEN TIKKA BIRYANI (D)',
    'LAMB BIRYANI (D)',
    'PALAK DAAL (V)',
    'BOMBAY ALOO (V)',
    'DAL MAKHANI (D V)',
    'SAAG ALOO (V)',
    'PALAK (V)',
    'GOBI SABJI (V)',
    'ALOO GOBI (V)',
    'SHAHI BAINGAN (V)',
    'BHINDI SABJI (V)',
    'BOMBAY MUSHROOM (V)',
    'KHAYBARI CHANNA MASALA (V)',
    'TARKA DAAL (V)',
    'PILAU RICE (D) (Small/Large)',
    'EGG FRIED RICE (D E)',
    'PLAIN RICE (V) (Small/Large)',
    'SPECIAL MUSHROOM RICE (D) (Small/Large)',
    'PEAS RICE (D) (Small/Large)',
    'KEEMA NAAN (D G E)',
    'CHEESY NAAN (D G E)',
    'PLAIN NAAN (D G E)',
    'GARLIC NAAN (D G E)',
    'PESHAWARI NAAN (D G E N)',
    'TANDOORI ROTI (G)',
    'LACHHA PARATHA (D G)',
    'ZEERA ALOO (V)',
    'MIXED PICKLE',
    'LIME PICKLE',
    'GULAB JAMUN (2 PCS)'
  )
    and mi.name not in (
    'Butter Paneer (D)',
    'Cheese Butter Masala',
    'Shahi Paneer (D)',
    'Cobra 620ml',
    'Red House Wine - Merlot',
    'White House Wine - Sauvignon Blanc',
    'Aachari Paneer Tikka',
    'Bombay Lamb (D) (P) (M)',
    'Lamb Gosht (D)',
    'Cheese Chili Garlic Naan (D) (G) (E)',
    'Cheese Garlic Naan (D) (G) (E)',
    'Can Of Coke (330ml)',
    'Can Of Diet Coke (330ml)',
    'Can Of Sprite (330ml)',
    'Diet Coke 1.25L',
    'Mineral Water',
    'Homemade Plain Lassi (D)',
    'Homemade Sweet Lassi  (D)',
    'Homemade Mango Lassi  (D)',
    'Popadoms Plain',
    'Popadoms Spicy',
    'Homemade Raitha (D)',
    'Homemade Mint Yogurt (D)',
    'Mango Chutney',
    'Onion-Tomato Salad',
    'Lemonade Can (330ml)'
  )
  on conflict (location_id, item_id) do update set is_available=false, price_pence_override=null;

  -- 4b. Make every .uk item available at Balham with the .uk price.
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 1195 from menu_items where category_id='vegetarian-main-dishes' and name='BOMBAY PANEER (D 🌶🌶🌶)'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=1195;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 1195 from menu_items where category_id='vegetarian-main-dishes' and name='PANEER BHURJI (D 🌶)'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=1195;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 1195 from menu_items where category_id='vegetarian-main-dishes' and name='PANEER KARAHI (D 🌶)'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=1195;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 1095 from menu_items where category_id='vegetarian-main-dishes' and name='PALAK PANEER (D)'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=1095;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 1095 from menu_items where category_id='vegetarian-main-dishes' and name='MUTTER PANEER (D 🌶)'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=1095;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 1195 from menu_items where category_id='vegetarian-main-dishes' and name='PANEER GREEN MASALA (D N)'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=1195;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 1195 from menu_items where category_id='vegetarian-main-dishes' and name='PANEER MASALA (D)'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=1195;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 1055 from menu_items where category_id='vegetarian-main-dishes' and name='MIX VEG KORMA (N D)'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=1055;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 1055 from menu_items where category_id='vegetarian-main-dishes' and name='MIX VEG CURRY (V 🌶)'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=1055;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 345 from menu_items where category_id='veg-starters' and name='POTATO CHIPS (FRENCH FRIES)'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=345;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 655 from menu_items where category_id='veg-starters' and name='CHILLI MUSHROOM (🌶)'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=655;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 995 from menu_items where category_id='veg-starters' and name='PANEER SHASHLIK (D 🌶)'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=995;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 995 from menu_items where category_id='veg-starters' and name='CHILLI PANEER (D)'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=995;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 595 from menu_items where category_id='veg-starters' and name='ONION BHAJI (2 PCS) (E)'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=595;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 995 from menu_items where category_id='veg-starters' and name='VEGETABLE MOMO'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=995;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 595 from menu_items where category_id='veg-starters' and name='MIX VEG PAKORA'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=595;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 595 from menu_items where category_id='veg-starters' and name='VEG SAMOSA (2 PCS) (G)'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=595;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 995 from menu_items where category_id='indo-chinese-noodles' and name='VEG HAKKA NOODLES'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=995;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 645 from menu_items where category_id='indo-chinese-soup' and name='MANCHOW SOUP'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=645;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 495 from menu_items where category_id='indo-chinese-mains' and name='VEG SCHEZWAN RICE'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=495;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 995 from menu_items where category_id='indo-chinese-mains' and name='VEGETABLE MANCHURIAN (GRAVY)'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=995;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 1095 from menu_items where category_id='indo-chinese-mains' and name='PANEER MANCHURIAN (DRY)'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=1095;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 995 from menu_items where category_id='indo-chinese-mains' and name='CHILLI GARLIC MANCHURIAN'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=995;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 895 from menu_items where category_id='indo-chinese-mains' and name='CHINESE BHEL'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=895;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 645 from menu_items where category_id='indo-chinese-soup' and name='MANCHURIAN SOUP'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=645;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 995 from menu_items where category_id='indo-chinese-noodles' and name='CHILLI GARLIC NOODLES'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=995;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 495 from menu_items where category_id='indo-chinese-mains' and name='VEG FRIED RICE'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=495;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 995 from menu_items where category_id='indo-chinese-noodles' and name='PANEER NOODLES'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=995;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 995 from menu_items where category_id='indo-chinese-noodles' and name='MANCHURIAN NOODLES'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=995;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 595 from menu_items where category_id='indo-chinese-soup' and name='HOT & SOUR SOUP'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=595;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 1095 from menu_items where category_id='indo-chinese-mains' and name='SCHEZWAN PANEER'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=1095;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 595 from menu_items where category_id='non-veg-starters' and name='LAMB SAMOSA (2 PCS) (G)'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=595;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 1095 from menu_items where category_id='tandoori-main-course' and name='CHICKEN SHASHLIK (D 🌶)'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=1095;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 595 from menu_items where category_id='non-veg-starters' and name='CHICKEN PAKORA (D)'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=595;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 655 from menu_items where category_id='non-veg-starters' and name='CHICKEN LOLLIPOP (🌶)'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=655;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 995 from menu_items where category_id='non-veg-starters' and name='CHILLI CHICKEN (🌶)'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=995;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 995 from menu_items where category_id='non-veg-starters' and name='CHICKEN TIKKA (D 🌶)'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=995;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 995 from menu_items where category_id='non-veg-starters' and name='LAMB TIKKA (D 🌶)'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=995;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 1295 from menu_items where category_id='non-veg-starters' and name='LAMB CHOPS (D)'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=1295;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 1495 from menu_items where category_id='tandoori-main-course' and name='TANDOORI KING PRAWN (D S)'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=1495;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 945 from menu_items where category_id='non-veg-starters' and name='LAMB SHISH KEBAB (D 🌶)'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=945;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 1495 from menu_items where category_id='tandoori-main-course' and name='TANDOORI MIXED GRILLED (D S 🌶)'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=1495;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 1095 from menu_items where category_id='tandoori-main-course' and name='TANDOORI CHICKEN (D)'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=1095;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 1595 from menu_items where category_id='seafood-main-dishes' and name='KING PRAWN MASALA (N D S)'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=1595;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 1595 from menu_items where category_id='seafood-main-dishes' and name='KING PRAWN BHUNA (D S 🌶)'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=1595;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 1595 from menu_items where category_id='seafood-main-dishes' and name='KING PRAWN PATHIYA (D S 🌶)'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=1595;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 1595 from menu_items where category_id='seafood-main-dishes' and name='KING PRAWN DHANSAK (D S 🌶)'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=1595;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 1595 from menu_items where category_id='seafood-main-dishes' and name='KING PRAWN JALFREZI (D S 🌶🌶🌶)'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=1595;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 1395 from menu_items where category_id='seafood-main-dishes' and name='MACHLI MASALA (D G S N)'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=1395;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 1395 from menu_items where category_id='seafood-main-dishes' and name='MADRAS FISH CURRY (D G S 🌶🌶🌶)'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=1395;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 1155 from menu_items where category_id='chicken-main-dishes' and name='CHICKEN VINDALOO (D 🌶🌶🌶)'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=1155;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 1155 from menu_items where category_id='chicken-main-dishes' and name='KARAHI CHICKEN (D)'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=1155;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 1155 from menu_items where category_id='chicken-main-dishes' and name='CHICKEN TIKKA MASALA (N D)'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=1155;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 1155 from menu_items where category_id='chicken-main-dishes' and name='CHICKEN KORMA (N D)'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=1155;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 1155 from menu_items where category_id='chicken-main-dishes' and name='BUTTER CHICKEN (N D)'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=1155;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 1155 from menu_items where category_id='chicken-main-dishes' and name='CHICKEN MADRAS (D 🌶🌶🌶)'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=1155;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 1155 from menu_items where category_id='chicken-main-dishes' and name='CHICKEN SAAG (D 🌶)'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=1155;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 1155 from menu_items where category_id='chicken-main-dishes' and name='CHICKEN JALFRAZO (D 🌶🌶🌶)'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=1155;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 1155 from menu_items where category_id='chicken-main-dishes' and name='CHICKEN DHANSAK (D 🌶)'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=1155;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 1155 from menu_items where category_id='chicken-main-dishes' and name='BOMBAY CHICKEN (D P M 🌶🌶🌶)'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=1155;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 1155 from menu_items where category_id='chicken-main-dishes' and name='CHICKEN BHUNA (D 🌶)'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=1155;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 1155 from menu_items where category_id='chicken-main-dishes' and name='CHICKEN BALTI (D P 🌶)'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=1155;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 1155 from menu_items where category_id='chicken-main-dishes' and name='CHICKEN ROGAN (D)'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=1155;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 1155 from menu_items where category_id='lamb-main-dishes' and name='LAMB DHANSAK (D)'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=1155;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 1155 from menu_items where category_id='lamb-main-dishes' and name='LAMB KORMA (N D)'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=1155;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 1155 from menu_items where category_id='lamb-main-dishes' and name='LAMB TIKKA MASALA (N D)'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=1155;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 1155 from menu_items where category_id='lamb-main-dishes' and name='LAMB BHUNA (D 🌶)'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=1155;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 1155 from menu_items where category_id='lamb-main-dishes' and name='LAMB VINDALOO (D P 🌶🌶🌶)'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=1155;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 1155 from menu_items where category_id='lamb-main-dishes' and name='LAMB PASANDA (N D)'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=1155;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 1155 from menu_items where category_id='lamb-main-dishes' and name='LAMB ROGAN JOSH (D 🌶)'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=1155;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 1155 from menu_items where category_id='lamb-main-dishes' and name='LAMB MADRAS (D 🌶🌶🌶)'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=1155;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 1495 from menu_items where category_id='biryanis' and name='KING PRAWN BIRYANI (D S)'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=1495;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 1495 from menu_items where category_id='biryanis' and name='MIXED BIRYANI (D S)'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=1495;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 995 from menu_items where category_id='biryanis' and name='CHICKEN DUM BIRYANI (D)'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=995;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 1095 from menu_items where category_id='biryanis' and name='VEGETABLE BIRYANI (D)'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=1095;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 1295 from menu_items where category_id='biryanis' and name='CHICKEN TIKKA BIRYANI (D)'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=1295;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 1295 from menu_items where category_id='biryanis' and name='LAMB BIRYANI (D)'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=1295;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 795 from menu_items where category_id='vegetarian-side-dishes' and name='PALAK DAAL (V)'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=795;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 795 from menu_items where category_id='vegetarian-side-dishes' and name='BOMBAY ALOO (V)'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=795;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 895 from menu_items where category_id='vegetarian-side-dishes' and name='DAL MAKHANI (D V)'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=895;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 795 from menu_items where category_id='vegetarian-side-dishes' and name='SAAG ALOO (V)'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=795;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 795 from menu_items where category_id='vegetarian-side-dishes' and name='PALAK (V)'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=795;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 795 from menu_items where category_id='vegetarian-side-dishes' and name='GOBI SABJI (V)'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=795;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 795 from menu_items where category_id='vegetarian-side-dishes' and name='ALOO GOBI (V)'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=795;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 795 from menu_items where category_id='vegetarian-side-dishes' and name='SHAHI BAINGAN (V)'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=795;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 795 from menu_items where category_id='vegetarian-side-dishes' and name='BHINDI SABJI (V)'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=795;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 795 from menu_items where category_id='vegetarian-side-dishes' and name='BOMBAY MUSHROOM (V)'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=795;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 795 from menu_items where category_id='vegetarian-side-dishes' and name='KHAYBARI CHANNA MASALA (V)'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=795;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 795 from menu_items where category_id='vegetarian-side-dishes' and name='TARKA DAAL (V)'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=795;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 365 from menu_items where category_id='rice' and name='PILAU RICE (D) (Small/Large)'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=365;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 695 from menu_items where category_id='rice' and name='EGG FRIED RICE (D E)'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=695;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 335 from menu_items where category_id='rice' and name='PLAIN RICE (V) (Small/Large)'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=335;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 395 from menu_items where category_id='rice' and name='SPECIAL MUSHROOM RICE (D) (Small/Large)'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=395;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 355 from menu_items where category_id='rice' and name='PEAS RICE (D) (Small/Large)'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=355;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 395 from menu_items where category_id='breads' and name='KEEMA NAAN (D G E)'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=395;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 415 from menu_items where category_id='breads' and name='CHEESY NAAN (D G E)'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=415;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 295 from menu_items where category_id='breads' and name='PLAIN NAAN (D G E)'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=295;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 315 from menu_items where category_id='breads' and name='GARLIC NAAN (D G E)'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=315;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 395 from menu_items where category_id='breads' and name='PESHAWARI NAAN (D G E N)'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=395;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 275 from menu_items where category_id='breads' and name='TANDOORI ROTI (G)'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=275;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 385 from menu_items where category_id='breads' and name='LACHHA PARATHA (D G)'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=385;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 795 from menu_items where category_id='vegetarian-side-dishes' and name='ZEERA ALOO (V)'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=795;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 100 from menu_items where category_id='yoghurt-pickle' and name='MIXED PICKLE'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=100;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 100 from menu_items where category_id='yoghurt-pickle' and name='LIME PICKLE'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=100;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 295 from menu_items where category_id='desserts' and name='GULAB JAMUN (2 PCS)'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=295;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 1195 from menu_items where category_id='vegetarian-main-dishes' and name='Butter Paneer (D)'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=1195;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 1195 from menu_items where category_id='vegetarian-main-dishes' and name='Cheese Butter Masala'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=1195;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 1195 from menu_items where category_id='vegetarian-main-dishes' and name='Shahi Paneer (D)'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=1195;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 795 from menu_items where category_id='drinks-beers' and name='Cobra 620ml'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=795;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 1295 from menu_items where category_id='drinks-red-wine' and name='Red House Wine - Merlot'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=1295;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 1295 from menu_items where category_id='drinks-white-wine' and name='White House Wine - Sauvignon Blanc'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=1295;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 1095 from menu_items where category_id='veg-starters' and name='Aachari Paneer Tikka'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=1095;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 1155 from menu_items where category_id='lamb-main-dishes' and name='Bombay Lamb (D) (P) (M)'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=1155;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 1155 from menu_items where category_id='lamb-main-dishes' and name='Lamb Gosht (D)'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=1155;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 445 from menu_items where category_id='breads' and name='Cheese Chili Garlic Naan (D) (G) (E)'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=445;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 425 from menu_items where category_id='breads' and name='Cheese Garlic Naan (D) (G) (E)'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=425;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 175 from menu_items where category_id='drinks-soft' and name='Can Of Coke (330ml)'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=175;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 175 from menu_items where category_id='drinks-soft' and name='Can Of Diet Coke (330ml)'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=175;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 175 from menu_items where category_id='drinks-soft' and name='Can Of Sprite (330ml)'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=175;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 295 from menu_items where category_id='drinks-soft' and name='Diet Coke 1.25L'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=295;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 255 from menu_items where category_id='drinks-soft' and name='Mineral Water'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=255;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 425 from menu_items where category_id='drinks-soft' and name='Homemade Plain Lassi (D)'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=425;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 425 from menu_items where category_id='drinks-soft' and name='Homemade Sweet Lassi  (D)'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=425;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 425 from menu_items where category_id='drinks-soft' and name='Homemade Mango Lassi  (D)'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=425;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 150 from menu_items where category_id='veg-starters' and name='Popadoms Plain'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=150;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 150 from menu_items where category_id='veg-starters' and name='Popadoms Spicy'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=150;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 150 from menu_items where category_id='yoghurt-pickle' and name='Homemade Raitha (D)'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=150;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 150 from menu_items where category_id='yoghurt-pickle' and name='Homemade Mint Yogurt (D)'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=150;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 100 from menu_items where category_id='yoghurt-pickle' and name='Mango Chutney'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=100;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 150 from menu_items where category_id='yoghurt-pickle' and name='Onion-Tomato Salad'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=150;
  insert into location_menu_items (location_id,item_id,is_available,price_pence_override)
  select loc, id, true, 175 from menu_items where category_id='drinks-soft' and name='Lemonade Can (330ml)'
  on conflict (location_id,item_id) do update set is_available=true, price_pence_override=175;
end $$;

commit;
