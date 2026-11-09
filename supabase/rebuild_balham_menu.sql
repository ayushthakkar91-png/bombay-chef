-- ============================================================================
-- REBUILD THE MENU FROM THE BALHAM MENU  —  DESTRUCTIVE
-- ============================================================================
-- Source: https://balham.bombaybicyclechef.uk/menu  (scraped 2026-11-09)
-- Replaces the entire menu with Balham's 147 dishes in 15 categories.
-- 52 of them keep an existing photo; the other 95 have none yet.
--
-- WHAT THIS DELETES, AND WHAT SURVIVES
--   Deleted outright (foreign keys cascade from menu_items):
--     * every current menu item and category
--     * item modifier groups and modifiers  — rebuilt below for the rice sizes
--     * item allergens                      — NOT rebuilt; re-enter if you used them
--     * menu_item_ingredients               — recipe/stock links are LOST
--     * location_menu_items                 — per-branch prices and sold-out flags
--     * favourites                          — customers lose their saved dishes
--   Blanked but not deleted:
--     * rewards.item_id  -> null  (a "free dish" reward loses its dish — re-pick it)
--     * order_items.item_id -> null
--   Safe: order history keeps its own copy of each line's name, price and qty,
--   so past orders, receipts and reports still read correctly.
--
-- BEFORE YOU RUN THIS, take a backup:
--   pg_dump "postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres" -F c -f before-menu-rebuild.dump
--
-- It runs as one transaction: if any statement fails, nothing changes.
-- ============================================================================

begin;

-- 1. Clear the old menu ------------------------------------------------------
delete from menu_items;
delete from menu_categories;

-- 2. Categories, in the order the Balham menu lists them ---------------------
insert into menu_categories (id, title, sort_order) values
  ('vegetarian-main-dishes', 'Vegetable Mains', 10),
  ('drinks-wines-beer', 'Wines&Beer', 20),
  ('veg-starters', 'VEG STARTERS', 30),
  ('indo-chinese', 'Indo-Chinese', 40),
  ('non-veg-starters', 'NON VEG STARTERS', 50),
  ('seafood-dishes', 'SEAFOOD DISHES', 60),
  ('chicken-main-dishes', 'CHICKEN MAIN DISHES', 70),
  ('lamb-main-dishes', 'LAMB MAIN DISHES', 80),
  ('biryanis', 'BIRYANIS', 90),
  ('vegetarian-side-dishes', 'VEGETARIAN SIDE DISHES', 100),
  ('rice', 'RICE & BREAD', 110),
  ('bread', 'Bread', 120),
  ('vegan-dishes', 'VEGAN DISHES', 130),
  ('accompaniments', 'Accompaniments', 140),
  ('desserts', 'Desserts', 150);

-- 3. Dishes ------------------------------------------------------------------
insert into menu_items (category_id, name, price, price_pence, description, image_url, sort_order, dietary) values
  ('vegetarian-main-dishes', 'Butter Paneer (D)', '£11.95', 1195, 'Featuring succulent Paneer in a rich onion-tomato gravy, blended with cashew nuts, and finished with a luxurious touch of Cream and Butter. contains nuts and dairy', null, 10, '{}'::text[]),
  ('vegetarian-main-dishes', 'Bombay Paneer (D)', '£11.95', 1195, 'A fiery Paneer curry crafted with chopped onions, tomatoes, coriander and potent spices, delivering intense heat and bold flavours for those craving a spicy culinary adventure. (Very Hot) Contains dairy, peanuts & mustard', null, 20, '{}'::text[]),
  ('vegetarian-main-dishes', 'Paneer Bhurji', '£11.95', 1195, 'Succulent Paneer cooked to perfection in a rich onion-tomato, ginger-garlic gravy, bursting with aromatic spices. Contains: Dairy', null, 30, '{}'::text[]),
  ('vegetarian-main-dishes', 'Paneer Karahi (Slightly Spicy) (D)', '£11.95', 1195, 'A tantalizing blend of tender Paneer, aromatic spices, and vibrant herbs, cooked to perfection in a slightly spicy, rich, and aromatic curry. contains Dairy', null, 40, '{}'::text[]),
  ('vegetarian-main-dishes', 'Palak Paneer (D)', '£10.95', 1095, 'Delicate cubes of cottage cheese entwined with vibrant spinach leaves..', null, 50, '{}'::text[]),
  ('vegetarian-main-dishes', 'Mutter Paneer (D)', '£10.95', 1095, 'Succulent paneer and green peas simmered in a luscious onion-tomato gravy.', null, 60, '{}'::text[]),
  ('vegetarian-main-dishes', 'Paneer Green Masala (D) (N)', '£11.95', 1195, 'Tender Paneer in a rich green masala sauce contains with mint, coriander, green pepper and Cashew. contains dairy and nuts.', null, 70, '{}'::text[]),
  ('vegetarian-main-dishes', 'Cheese Butter Masala', '£11.95', 1195, 'A rich and creamy dish made with soft paneer and cheese cubes, cooked in a buttery chopped tomato and onion gravy, blended with aromatic spices and finished with fresh cream for a smooth, flavourful taste', null, 80, '{}'::text[]),
  ('vegetarian-main-dishes', 'Paneer Masala (N) (D)', '£11.95', 1195, 'Paneer cubes in rich onion-tomato gravy, with cream, cashew, and aromatic spices.', null, 90, '{}'::text[]),
  ('vegetarian-main-dishes', 'Mixed Vegetable Korma (D) (N)', '£10.55', 1055, 'Mixed vegetable, simmered in a onion gravy with cream, cashews, and a hint of sweetness.', null, 100, '{}'::text[]),
  ('vegetarian-main-dishes', 'Shahi Paneer (D)', '£11.95', 1195, 'Paneer cubes cooked in onion-tomato gravy and cream, delivering a mild and flavourful taste.', null, 110, '{}'::text[]),
  ('vegetarian-main-dishes', 'Mixed Vegetables Curry (D)', '£10.55', 1055, 'Fresh vegetables cooked in onion-tomato gravy, crafting a mild and flavourful taste.', null, 120, '{}'::text[]),
  ('drinks-wines-beer', 'Cobra 620ml', '£7.95', 795, null, null, 130, '{}'::text[]),
  ('drinks-wines-beer', 'Red House Wine - Merlot', '£12.95', 1295, '75cl', null, 140, '{}'::text[]),
  ('drinks-wines-beer', 'White House Wine - Sauvignon Blanc', '£12.95', 1295, '75cl', null, 150, '{}'::text[]),
  ('veg-starters', 'Aachari Paneer Tikka', '£10.95', 1095, 'Soft cubes of paneer are marinated in a spiced yogurt mixture infused with achari masala a blend of mustard seeds, fennel, nigella, fenugreek, and cumin seeds along with ginger-garlic paste, chili, and aromatic spices. The paneer is then skewered with onions and bell peppers and grilled or roasted until lightly charred on the outside while remaining soft and creamy inside. Contains Dairy, mustard and fennel seeds.', null, 160, '{}'::text[]),
  ('veg-starters', 'Chips (French Fries)', '£3.45', 345, 'Crispy golden fries, perfectly salted, served hot and fresh.', '/menu-images/balham/chips_french_fries.webp', 170, '{}'::text[]),
  ('veg-starters', 'Chilli Mushroom', '£6.55', 655, 'A tantalizing fusion of succulent mushrooms, vibrant bell peppers, and aromatic spices.', null, 180, '{}'::text[]),
  ('veg-starters', 'Paneer Shashlik', '£9.95', 995, 'Marinated cottage cheese cubes, skewer-grilled to perfection, infused with aromatic spices.', null, 190, '{}'::text[]),
  ('veg-starters', 'Chilli Panner', '£9.95', 995, 'Succulent cottage cheese cubes tossed in spicy, tangy sauce with bell peppers and onions.', null, 200, '{}'::text[]),
  ('veg-starters', 'Onion Bhaji (E)', '£5.95', 595, 'Crisp and golden onion slices imbued with exotic spices, deep-fried to perfection (Three in a portion).', '/menu-images/balham/onion_bhaji_e.webp', 210, '{}'::text[]),
  ('veg-starters', 'Vegetable Momo', '£9.95', 995, 'Steamed dumplings stuffed with a lightly spiced vegetable filling, served with a pickle sauce that contains sesame seeds and nuts', null, 220, '{}'::text[]),
  ('veg-starters', 'Vegetable Pakora', '£5.95', 595, 'Crispy fritters bursting with mixed veggies, spices, and deep-fried perfection.', '/menu-images/balham/vegetable_pakora.webp', 230, '{}'::text[]),
  ('veg-starters', 'Vegetable Samosa (G)', '£5.95', 595, 'Pastry parcels freshly made, filled with spiced vegetables and deep fried (Three in a portion).', '/menu-images/balham/vegetable_samosa_g.webp', 240, '{}'::text[]),
  ('indo-chinese', 'Veg Hakka Noodles', '£9.95', 995, 'Veg Hakka Noodles are a popular Indo-Chinese dish made with boiled noodles stir-fried with a colourful assortment of vegetables like cabbage, carrots, bell peppers, and onions, seasoned with soy sauce and other spices for a delicious and savoury taste.Con', null, 250, '{}'::text[]),
  ('indo-chinese', 'Veg Manchow Soup', '£6.45', 645, 'Veg Manchow Soup is a spicy and tangy Indo-Chinese soup with finely chopped vegetables, noodles garnished with crispy fried noodles for texture. Contains Soya', null, 260, '{}'::text[]),
  ('indo-chinese', 'Veg Schezwan Rice', '£4.95', 495, 'Veg Schezwan Rice is a spicy Indo-Chinese rice dish made with cooked rice stir-fried with mixed vegetables and Schezwan sauce, offering a fiery and flavourful taste experience. Contains Dairy and Soya', null, 270, '{}'::text[]),
  ('indo-chinese', 'Vegetable Manchurian (Dry)', '£9.95', 995, 'Vegetable Manchurian Dry is a popular Indo-Chinese appetizer where mixed vegetable balls are deep-fried until crispy, then tossed in a tangy and spicy Manchurian sauce with bell peppers, onions, and garnished with spring onions. Contains Soya', null, 280, '{}'::text[]),
  ('indo-chinese', 'Vegetable Manchurian (Gravy)', '£9.95', 995, 'Vegetable Manchurian Gravy is a flavourful Indo-Chinese dish featuring deep-fried vegetable balls in a rich, tangy gravy made with soy sauce, garlic, ginger, and other seasonings, complemented with bell peppers, onions, and garnished with fresh spring oni', null, 290, '{}'::text[]),
  ('indo-chinese', 'Paneer Manchurian (Dry)', '£10.95', 1095, 'Paneer Manchurian Dry is a popular Indo-Chinese appetizer featuring crispy, stir-fried paneer cubes tossed in a spicy and tangy Manchurian sauce with bell peppers and onions. Contains Dairy a', null, 300, '{}'::text[]),
  ('indo-chinese', 'Paneer Manchurian (Gravy)', '£10.95', 1095, 'Paneer Manchurian Gravy is a delicious Indo-Chinese dish with soft paneer cubes simmered in a rich, spicy, and tangy gravy made with soy sauce, garlic, ginger, and vegetables.', null, 310, '{}'::text[]),
  ('indo-chinese', 'Chilli Garlic Manchurian', '£9.95', 995, 'Vegetable Balls cook with extra chilli and garlic. Contains Soya', null, 320, '{}'::text[]),
  ('indo-chinese', 'Chinese Bhel', '£8.95', 895, 'A fusion of chop suey and bhel. Contains soya and Egg', null, 330, '{}'::text[]),
  ('indo-chinese', 'Manchurian Soup', '£6.45', 645, 'Manchurian soup is a tangy and spicy Indo-Chinese soup featuring a flavourful broth with vegetables and Manchurian dumplings. Contains Soya', null, 340, '{}'::text[]),
  ('indo-chinese', 'Veg Chilli Garlic Noodles', '£9.95', 995, 'Veg Chilli Garlic Noodles are a spicy Indo-Chinese dish featuring stir-fried noodles tossed with a variety of vegetables, garlic, and chili sauce for a bold, flavourful kick. Contains Egg and Soya', null, 350, '{}'::text[]),
  ('indo-chinese', 'Veg Fried Rice', '£4.95', 495, 'Veg Fried Rice is a classic Indo- Chinese dish made with steamed rice stir-fried with assorted vegetables seasoned with soy sauce and other spices for a savoury flavour. Contains Dairy and Soya.', null, 360, '{}'::text[]),
  ('indo-chinese', 'Paneer Noodles', '£9.95', 995, 'Paneer noodles are a delightful Indo-Chinese fusion dish featuring stir-fried noodles tossed with flavourful paneer cubes, vegetables, and a blend of savoury sauces. Contains Dairy and Soya', null, 370, '{}'::text[]),
  ('indo-chinese', 'Manchurian Noodles', '£9.95', 995, 'Manchurian noodles are a spicy Indo-Chinese dish combining stir-fried noodles with a tangy, savoury Manchurian sauce and vegetable balls. Contains Soya and Egg', null, 380, '{}'::text[]),
  ('indo-chinese', 'Hot & Sour Soup', '£5.95', 595, 'Hot and sour soup is a flavourful Chinese soup characterized by its spicy and tangy broth, filled with a variety of vegetables and mushrooms. Contains Soya', null, 390, '{}'::text[]),
  ('indo-chinese', 'Schezwan Paneer', '£10.95', 1095, 'Spicy paneer tossed in a bold Schezwan sauce with mixed vegetables and aromatic spices. Contains celery and milk; may contain gluten, tree nuts, sesame seeds, soy, and mustard', null, 400, '{}'::text[]),
  ('non-veg-starters', 'Lamb Samosa', '£5.95', 595, 'Pastry parcels freshly made filled with minced lamb and deep fried (Three in a portion).', null, 410, '{}'::text[]),
  ('non-veg-starters', 'Chicken Shashlik', '£10.95', 1095, 'Marinated chicken cubes grilled with slice of onion, capsicum and tomato', null, 420, '{}'::text[]),
  ('non-veg-starters', 'Chicken Pakora', '£5.95', 595, 'Crispy and spiced chicken pakora, deep-fried to perfection.', null, 430, '{}'::text[]),
  ('non-veg-starters', 'Chicken Lollipop', '£6.55', 655, 'Succulent chicken lollipops marinated in aromatic spices, deep-fried to perfection.', null, 440, '{}'::text[]),
  ('non-veg-starters', 'Chilli Chicken', '£9.95', 995, 'Stir-fried chicken infused with soy sauce, chilli sauce, coriander, onion and pepper.', '/menu-images/balham/chilli_chicken.webp', 450, '{}'::text[]),
  ('non-veg-starters', 'Tandoori Chicken Tikka (d)', '£9.95', 995, 'Tender chicken marinated in aromatic spices, yogurt, and herbs, skewer-grilled to perfection.', null, 460, '{}'::text[]),
  ('non-veg-starters', 'Tandoori Lamb Tikka (d)', '£9.95', 995, 'Succulent tandoori Lamb Tikka, marinated in aromatic spices, grilled to perfection.', null, 470, '{}'::text[]),
  ('non-veg-starters', 'Tandoori Lamb Chops', '£12.95', 1295, 'Savour succulent Lamb Chops, marinated in aromatic spices and grilled to perfection.', null, 480, '{}'::text[]),
  ('non-veg-starters', 'Tandoori King Prawn', '£14.95', 1495, 'Succulent prawns marinated in aromatic spices, skewer-grilled to perfection, a royal start to your feast.', null, 490, '{}'::text[]),
  ('non-veg-starters', 'Lamb Shish Kebab (d)', '£9.45', 945, 'Lean minced lamb blend with ginger, garlic, green chilli and mixture of spices wrapped around skewers and grilled.', null, 500, '{}'::text[]),
  ('non-veg-starters', 'Tandoori Mixed Grill (s) (d)', '£14.95', 1495, 'A selection of prawn, lamb and chicken, marinated in herbs and spices. (Serves for two)', '/menu-images/balham/tandoori_mixed_grill_s_d.webp', 510, '{}'::text[]),
  ('non-veg-starters', 'Tandoori Half Chicken', '£10.95', 1095, 'Made by marinating chicken in a mixture of yogurt, spices, and lemon juice, and then grilling it. It is flavourful, aromatic, and slightly spicy, and is a great option for those who enjoy bold, complex flavours.', null, 520, '{}'::text[]),
  ('seafood-dishes', 'King Prawn Masala (N) (S) (D)', '£15.95', 1595, 'Marinated king prawn, grilled in clay oven, and cooked in masala sauce.', '/menu-images/balham/king_prawn_masala_n_s_d.webp', 530, '{}'::text[]),
  ('seafood-dishes', 'King Prawn Bhuna (S) (D)', '£15.95', 1595, 'King prawn sauteed with aromatic spices,cooked with herbs & fresh tomatoes.', '/menu-images/balham/king_prawn_bhuna_s_d.webp', 540, '{}'::text[]),
  ('seafood-dishes', 'King Prawn Pathiya (S) (D)', '£15.95', 1595, 'Marinated king prawn cooked in a delicious sweet & sour sauce with curry leaves.', '/menu-images/balham/king_prawn_pathiya_s_d.webp', 550, '{}'::text[]),
  ('seafood-dishes', 'King Prawn Dhansak (S) (D)', '£15.95', 1595, 'King prawn cooked with lentils in a delicious hot, sweet & sour sauce.', '/menu-images/balham/king_prawn_dhansak_s_d.webp', 560, '{}'::text[]),
  ('seafood-dishes', 'King Prawn Jalfrezi (S) (D)', '£15.95', 1595, 'King prawn cooked with vibrant spices, peppers, garlic & tomatoes, bursting with spiced flavour.', '/menu-images/balham/king_prawn_jalfrezi_s_d.webp', 570, '{}'::text[]),
  ('seafood-dishes', 'Machli Masala (S) (D) (N)', '£13.95', 1395, 'Tender fillet of fish deep fried & cooked together with traditional masala sauce.', '/menu-images/balham/machli_masala_s_d_n.webp', 580, '{}'::text[]),
  ('seafood-dishes', 'Madras Fish Curry (S) (G) (D)', '£13.95', 1395, 'Boneless cod fish cooked with spicy tamarind sauce, garnished with garlic and curry leaves.', '/menu-images/balham/madras_fish_curry_s_g_d.webp', 590, '{}'::text[]),
  ('chicken-main-dishes', 'Chicken Vindaloo (D)', '£11.55', 1155, '(Very hot) - Tender chicken cooked with potato,', null, 600, '{}'::text[]),
  ('chicken-main-dishes', 'Chicken Karahi (med spicy)(D)', '£11.55', 1155, 'A tantalizing blend of tender chicken, aromatic spices, and vibrant herbs, cooked to perfection in a slightly spicy, rich, and aromatic curry.', null, 610, '{}'::text[]),
  ('chicken-main-dishes', 'Chicken Tikka Masala (D) (N)', '£11.55', 1155, 'Savour our exquisite Chicken Masala, a culinary masterpiece featuring succulent chicken cooked in a rich onion-tomato gravy, adorned with cashews, and finished with a luscious touch of cream. Contains Nut and dairy.', '/menu-images/balham/chicken_tikka_masala_d_n.webp', 620, '{}'::text[]),
  ('chicken-main-dishes', 'Chicken Korma (N) (D)', '£11.55', 1155, 'Creamy chicken korma in luscious onion base gravy, enriched with cashews, cream, and sweet notes of a delightful dining experience.', '/menu-images/balham/chicken_korma_n_d.webp', 630, '{}'::text[]),
  ('chicken-main-dishes', 'Butter Chicken (D) (N)', '£11.55', 1155, 'Indulge in our signature Butter Chicken, featuring succulent chicken in a rich onion-tomato gravy, blended with cashew nuts, and finished with a luxurious touch of cream.', '/menu-images/balham/butter_chicken_d_n.webp', 640, '{}'::text[]),
  ('chicken-main-dishes', 'Chicken Madras (D)', '£11.55', 1155, 'Spicy and flavoured Indian curry made with tender chicken, aromatic spices, and a touch of heat. Perfectly balanced.', '/menu-images/balham/chicken_madras_d.webp', 650, '{}'::text[]),
  ('chicken-main-dishes', 'Chicken Saag (D)', '£11.55', 1155, 'Tandoori chicken breast cooked with fresh spinadh leaves.', '/menu-images/balham/chicken_saag_d.webp', 660, '{}'::text[]),
  ('chicken-main-dishes', 'Chicken Jalfreizi (D)', '£11.55', 1155, 'Fiery and aromatic Indian dish with tender chicken, and ginger-garlic infusion for intense spice lovers.', '/menu-images/balham/chicken_jalfreizi_d.webp', 670, '{}'::text[]),
  ('chicken-main-dishes', 'Chicken Dhansak (D)', '£11.55', 1155, 'Tender chicken in zesty onion-tomato gravy with yellow lentils, crafting a delightful sweet & sour flavour. Contains diary.', '/menu-images/balham/chicken_dhansak_d.webp', 680, '{}'::text[]),
  ('chicken-main-dishes', 'Bombay Chicken (D) (M)', '£11.55', 1155, 'A fiery chicken curry crafted with chopped onions, tomatoes, coriander and potent spices, delivering intense heat and bold flavours for those craving a spicy culinary adventure.', '/menu-images/balham/bombay_chicken_d_m.webp', 690, '{}'::text[]),
  ('chicken-main-dishes', 'Chicken Bhuna (D)', '£11.55', 1155, 'Succulent chicken cooked to a perfection in a rich onion-tomato gravy, bursting with aromatic spices.', null, 700, '{}'::text[]),
  ('chicken-main-dishes', 'Chicken Balti (D)', '£11.55', 1155, 'Harmoniously balanced with equal parts tomato-onion gravy, enriched with an array of aromatic spices for a delightful culinary experience.', '/menu-images/balham/chicken_balti_d.webp', 710, '{}'::text[]),
  ('chicken-main-dishes', 'Chicken Rogan (D)', '£11.55', 1155, 'Tandoori chicken breast cooked in a traditional Rogan sauce with lots of fresh tomatoes.', '/menu-images/balham/chicken_rogan_d.webp', 720, '{}'::text[]),
  ('lamb-main-dishes', 'Lamb Dhansak (D)', '£11.55', 1155, 'Tender lamb cooked with yellow lentils in a sweet and sour sauce.', null, 730, '{}'::text[]),
  ('lamb-main-dishes', 'Bombay Lamb (D) (P) (M)', '£11.55', 1155, 'Tender lamb cooked with curry sauce, ginger, garlic, coriander, onions, green chili and fresh tomatoes. (Extra Hot)', null, 740, '{}'::text[]),
  ('lamb-main-dishes', 'Lamb Korma (D) (N)', '£11.55', 1155, 'Creamy lamb korma in luscious onion based gravy, enriched with cashews, cream, and sweet notes for a delightful dining experience.', '/menu-images/balham/lamb_korma_d_n.webp', 750, '{}'::text[]),
  ('lamb-main-dishes', 'Lamb Tikka Masala Large (D) (N)', '£11.55', 1155, 'Tender lamb infused with aromatic spices, simmered in a rich onion-tomato gravy, enriched with cashews and cream.', null, 760, '{}'::text[]),
  ('lamb-main-dishes', 'Lamb Bhuma (D)', '£11.55', 1155, 'Tender lamb cooked to perfection in a rich onion-tomato gravy, bursting with aromatic spices.', null, 770, '{}'::text[]),
  ('lamb-main-dishes', 'Lamb Gosht (D)', '£11.55', 1155, 'Tender lamb simmered in a fragrant onion-tomato gravy, with vibrant fresh spinach.', null, 780, '{}'::text[]),
  ('lamb-main-dishes', 'Lamb Vindaloo (D)', '£11.55', 1155, 'Spicy and tangy Indian lamb dish cooked with potatoes, infused with aromatic spices, perfect for adventurous taste buds.', '/menu-images/balham/lamb_vindaloo_d.webp', 790, '{}'::text[]),
  ('lamb-main-dishes', 'Lamb Pasanda (N) (D)', '£11.55', 1155, 'Tender lamb in an aromatic onion gravy, enriched with cashews and cream, offering a delightful balance of sweet and sour flavours.', '/menu-images/balham/lamb_pasanda_n_d.webp', 800, '{}'::text[]),
  ('lamb-main-dishes', 'Lamb Rogan Josh (D)', '£11.55', 1155, 'Tender pieces in a luscious tomato-rich gravy, enhanced with a hint of onion richness, creating a flavourful and heavy culinary delight.', '/menu-images/balham/lamb_rogan_josh_d.webp', 810, '{}'::text[]),
  ('lamb-main-dishes', 'Lamb Madras (D)', '£11.55', 1155, 'Spicy and flavourful Indian curry made with tender lamb, aromatic spices, and a touch of heat. Perfectly balanced.', '/menu-images/balham/lamb_madras_d.webp', 820, '{}'::text[]),
  ('biryanis', 'King Prawn Biryani', '£14.95', 1495, 'Spiced prawn cooked with basmati rice.', null, 830, '{}'::text[]),
  ('biryanis', 'Mixed Biryani', '£14.95', 1495, 'Basmati rice mixed with chicken, lamb and king prawn', null, 840, '{}'::text[]),
  ('biryanis', 'Chicken Dum Biryani (D)', '£9.95', 995, 'Savour the essence of Hyderabad with our Hyderabad-style Biryani, a regal blend of basmati rice, marinated chicken, yogurt, and aromatic spices. Paired perfectly with cucumber raita.', null, 850, '{}'::text[]),
  ('biryanis', 'Vegetable Biryani (D)', '£10.95', 1095, 'A fragrant medley of basmati rice, mixed vegetables, and aromatic spices. Served with vegetable gravy.', '/menu-images/balham/vegetable_biryani_d.webp', 860, '{}'::text[]),
  ('biryanis', 'Chicken Tikka Biryani (D)', '£12.95', 1295, 'Indulge in the rich flavours of our Chicken Tikka Biryani, where succulent marinated chicken meets aromatic basmati rice, creating a delightful fusion of spices. Served with vegetable gravy.', null, 870, '{}'::text[]),
  ('biryanis', 'Lamb Biryani (D)', '£12.95', 1295, 'Savour our exquisite Lamb Biryani, a fragrant blend of succulent lamb, aromatic basmati rice, and chefs secret spices, creating a symphony of flavours in every bite. Served with vegetable gravy.', '/menu-images/balham/lamb_biryani_d.webp', 880, '{}'::text[]),
  ('vegetarian-side-dishes', 'Palak Daal', '£7.95', 795, 'Cumin, lentils cooked with garlic, ginger & spinach leaves', null, 890, '{}'::text[]),
  ('vegetarian-side-dishes', 'Bombay Aloo (D)', '£7.95', 795, 'Slices of potatoes cooked with bombay chat masala.', '/menu-images/balham/bombay_aloo_d.webp', 900, '{}'::text[]),
  ('vegetarian-side-dishes', 'Daal Makhani (D)', '£8.95', 895, 'Black lentils cooked with butter, cream and simmered on low heat for that unique flavour!', null, 910, '{}'::text[]),
  ('vegetarian-side-dishes', 'Saag Aloo (D)', '£7.95', 795, 'Fresh potatoes and vibrant spinach, delicately spiced for a delightful vegetarian experience.', '/menu-images/balham/saag_aloo_d.webp', 920, '{}'::text[]),
  ('vegetarian-side-dishes', 'Palak (D)', '£7.95', 795, 'Fresh spinach leaves cooked with cumin, garlic & ginger.', '/menu-images/balham/palak_d.webp', 930, '{}'::text[]),
  ('vegetarian-side-dishes', 'Gobi Sabji (D)', '£7.95', 795, 'Fresh cauliflower cooked with tomato, onions and peppers.', '/menu-images/balham/gobi_sabji_d.webp', 940, '{}'::text[]),
  ('vegetarian-side-dishes', 'Aloo Gobhi (D)', '£7.95', 795, 'Potatoes & cauliflower cooked together with slices of tomatoes, green peppers & onions.', '/menu-images/balham/aloo_gobhi_d.webp', 950, '{}'::text[]),
  ('vegetarian-side-dishes', 'Shahi Baingan (D)', '£7.95', 795, 'Fresh aubergines cooked with onions, garlic & ginger.', '/menu-images/balham/shahi_baingan_d.webp', 960, '{}'::text[]),
  ('vegetarian-side-dishes', 'Bhindi Sabji (D)', '£7.95', 795, 'Fresh okra cooked with tomato, cumin, mustard seeds and sauteed with ginger & garlic.', '/menu-images/balham/bhindi_sabji_d.webp', 970, '{}'::text[]),
  ('vegetarian-side-dishes', 'Bombay Mushroom (D)', '£7.95', 795, 'Fresh mushrooms cooked with onion, tomatoes, green peppers & light spices.', '/menu-images/balham/bombay_mushroom_d.webp', 980, '{}'::text[]),
  ('vegetarian-side-dishes', 'Punjabi Channa Masala (D)', '£7.95', 795, 'Chick peas cooked with fresh tomatoes, onion, green pepper, ginger & spices.', null, 990, '{}'::text[]),
  ('vegetarian-side-dishes', 'Tarka Daal (D)', '£7.95', 795, 'Assorted lentils cooked with vegetable oil & fried garlic.', '/menu-images/balham/tarka_daal_d.webp', 1000, '{}'::text[]),
  ('rice', 'Pilau Rice (D)', '£3.65', 365, 'Fragrant basmati rice infused with spices, a perfect companion to savoury dishes.', null, 1010, '{}'::text[]),
  ('rice', 'Egg Fried Rice (D) (E)', '£6.95', 695, 'Savor aromatic Basmati egg fry rice, expertly cooked with green peas for a delightful fusion.', null, 1020, '{}'::text[]),
  ('rice', 'Plain Rice (V)', '£3.35', 335, 'Exquisite Basmati rice, expertly boiled for perfect texture, a delightful addition to your meal', null, 1030, '{}'::text[]),
  ('rice', 'Mushroom Rice (D)', '£3.95', 395, 'Savour the exquisite blend of aromatic Basmati mushroom rice with sauteed mushrooms.', null, 1040, '{}'::text[]),
  ('rice', 'Peas Rice (D)', '£3.55', 355, 'Aromatic Basmati rice infused with vibrant peas, a delectable choice for discerning palates.', '/menu-images/balham/peas_rice_d.webp', 1050, '{}'::text[]),
  ('bread', 'Cheese Chili Garlic Naan (D) (G) (E)', '£4.45', 445, 'Soft naan bread stuffed with melted cheese and topped with chilli and garlic for a flavourful kick. Contains dairy, gluten and egg', null, 1060, '{}'::text[]),
  ('bread', 'Keema Naan (G) (E)', '£3.95', 395, 'Soft tandoor-baked naan stuffed with spiced minced meat for a rich, savoury flavour. Contains gluten and egg', null, 1070, '{}'::text[]),
  ('bread', 'Cheese Naan (D) (G) (E)', '£4.15', 415, 'Soft tandoor-baked naan stuffed with melted cheese for a rich and creamy taste. Contains dairy, gluten and egg', null, 1080, '{}'::text[]),
  ('bread', 'Cheese Garlic Naan (D) (G) (E)', '£4.25', 425, 'Soft tandoor-baked naan stuffed with melted cheese and topped with flavorful garlic. Contains dairy, gluten and egg', null, 1090, '{}'::text[]),
  ('bread', 'Plain Naan (E) (G) (D)', '£2.95', 295, 'Wheat bread freshly baked in tandoor.', '/menu-images/balham/plain_naan_e_g_d.webp', 1100, '{}'::text[]),
  ('bread', 'Garlic Naan (E) (G) (D)', '£3.15', 315, 'Naan bread coated with freshly chopped garlic.', '/menu-images/balham/garlic_naan_e_g_d.webp', 1110, '{}'::text[]),
  ('bread', 'Peshwari Naan (E) (G) (N) (D)', '£3.95', 395, 'Naan bread stuffed with sultanas, coconut & cashew nuts.', '/menu-images/balham/peshwari_naan_e_g_n_d.webp', 1120, '{}'::text[]),
  ('bread', 'Tandoori Roti (G) (D)', '£2.75', 275, 'Whole wheat bread freshly baked in tandoor.', '/menu-images/balham/tandoori_roti_g_d.webp', 1130, '{}'::text[]),
  ('bread', 'Laccha Paratha (G) (D)', '£3.85', 385, 'Whole wheat dough stretched, brushed with butter & baked in tandoor.', '/menu-images/balham/laccha_paratha_g_d.webp', 1140, '{}'::text[]),
  ('vegan-dishes', 'Regular Plain Rice', '£3.35', 335, null, null, 1150, array['vegan']::text[]),
  ('vegan-dishes', 'Large Plain Rice', '£5.35', 535, null, null, 1160, array['vegan']::text[]),
  ('vegan-dishes', 'Vegan Tandoori Roti', '£2.95', 295, null, null, 1170, array['vegan']::text[]),
  ('vegan-dishes', 'Mixed Vegetables Curry', '£10.95', 1095, 'Fresh mixed vegetables cooked with our own spices.', null, 1180, array['vegan']::text[]),
  ('vegan-dishes', 'Bombay Aloo', '£7.95', 795, 'Slices of potatoes cooked with butter and Bombay chat masala.', null, 1190, array['vegan']::text[]),
  ('vegan-dishes', 'Saag Aloo', '£7.95', 795, 'Slices of potatoes cooked with fresh spinach leaves.', null, 1200, array['vegan']::text[]),
  ('vegan-dishes', 'Palak', '£7.95', 795, 'Fresh spinach leaves cooked with cumin, garlic and ginger.', null, 1210, array['vegan']::text[]),
  ('vegan-dishes', 'Gobi Sabji', '£7.95', 795, 'Fresh cauliflower cooked with tomato, onions and peppers.', null, 1220, array['vegan']::text[]),
  ('vegan-dishes', 'Aloo Gobhi', '£7.95', 795, 'Potatoes and cauliflower cooked together with slices of tomatoes, green peppers and onions.', null, 1230, array['vegan']::text[]),
  ('vegan-dishes', 'Jeera Aloo', '£7.95', 795, 'Cumin and coriander flavoured dry sauteed potatoes.', null, 1240, array['vegan']::text[]),
  ('vegan-dishes', 'Shahi Baingan', '£7.95', 795, 'Fresh aubergines cooked with onions, garlic and ginger.', null, 1250, array['vegan']::text[]),
  ('vegan-dishes', 'Bhindi Sabji', '£7.95', 795, 'Fresh okra cooked with tomato, cumin, mustard seeds, sauteed with ginger and garlic.', null, 1260, array['vegan']::text[]),
  ('vegan-dishes', 'Bombay Mushroom', '£7.95', 795, 'Fresh mushrooms cooked with onions, tomatoes, green peppers and light spices.', null, 1270, array['vegan']::text[]),
  ('vegan-dishes', 'Palak Daal', '£7.95', 795, 'Cumin flavoured mix lentils cooked with garlic, ginger and spinach leaves.', null, 1280, array['vegan']::text[]),
  ('vegan-dishes', 'Tarka Daal', '£7.95', 795, 'Assorted lentils cooked with butter and fried garlic.', null, 1290, array['vegan']::text[]),
  ('accompaniments', 'Can Of Coke (330ml)', '£1.75', 175, null, null, 1300, '{}'::text[]),
  ('accompaniments', 'Can Of Diet Coke (330ml)', '£1.75', 175, null, null, 1310, '{}'::text[]),
  ('accompaniments', 'Can Of Sprite (330ml)', '£1.75', 175, null, null, 1320, '{}'::text[]),
  ('accompaniments', 'Diet Coke 1.25L', '£2.95', 295, null, null, 1330, '{}'::text[]),
  ('accompaniments', 'Mineral Water', '£2.55', 255, null, null, 1340, '{}'::text[]),
  ('accompaniments', 'Homemade Plain Lassi (D)', '£4.25', 425, null, null, 1350, '{}'::text[]),
  ('accompaniments', 'Homemade Sweet Lassi (D)', '£4.25', 425, null, null, 1360, '{}'::text[]),
  ('accompaniments', 'Homemade Mango Lassi (D)', '£4.25', 425, null, null, 1370, '{}'::text[]),
  ('accompaniments', 'Popadoms Plain', '£1.50', 150, null, '/menu-images/balham/popadoms_plain.webp', 1380, '{}'::text[]),
  ('accompaniments', 'Popadoms Spicy', '£1.50', 150, 'Two in a portion', '/menu-images/balham/popadoms_spicy.webp', 1390, '{}'::text[]),
  ('accompaniments', 'Homemade Raitha (D)', '£1.50', 150, null, null, 1400, '{}'::text[]),
  ('accompaniments', 'Homemade Mint Yogurt (D)', '£1.50', 150, null, '/menu-images/balham/homemade_mint_yogurt_d.webp', 1410, '{}'::text[]),
  ('accompaniments', 'Mango Chutney', '£1.00', 100, null, '/menu-images/balham/mango_chutney.webp', 1420, '{}'::text[]),
  ('accompaniments', 'Onion-Tomato Salad', '£1.50', 150, 'Freshly chopped onions and tomatoes, drizzled with lemon juice and fresh coriander.', null, 1430, '{}'::text[]),
  ('accompaniments', 'Mixed Pickle', '£1.00', 100, null, '/menu-images/balham/mixed_pickle.webp', 1440, '{}'::text[]),
  ('accompaniments', 'Lime Pickle', '£1.00', 100, null, '/menu-images/balham/lime_pickle.webp', 1450, '{}'::text[]),
  ('accompaniments', 'Lemonade Can (330ml)', '£1.75', 175, null, '/menu-images/balham/lemonade_can_330ml.webp', 1460, '{}'::text[]),
  ('desserts', 'Gulab Jamun(N)', '£2.95', 295, 'Soft spongy balls flavoured with cardamom and pistachio nuts in sweet syrup.', null, 1470, '{}'::text[]);

-- 4. Rice sizes (Regular / Large) --------------------------------------------
do $$
declare rid uuid; gid uuid;
begin
  -- Pilau Rice (D): Regular £3.65 / Large £5.65
  select id into rid from menu_items where name = 'Pilau Rice (D)' limit 1;
  if rid is not null then
    insert into item_modifier_groups (item_id, name, min_select, max_select, sort_order)
      values (rid, 'Size', 1, 1, 0) returning id into gid;
    insert into item_modifiers (group_id, name, price_delta_pence, is_default, sort_order) values
      (gid, 'Regular', 0, true, 0), (gid, 'Large', 200, false, 1);
  end if;

  -- Plain Rice (V): Regular £3.35 / Large £5.35
  select id into rid from menu_items where name = 'Plain Rice (V)' limit 1;
  if rid is not null then
    insert into item_modifier_groups (item_id, name, min_select, max_select, sort_order)
      values (rid, 'Size', 1, 1, 0) returning id into gid;
    insert into item_modifiers (group_id, name, price_delta_pence, is_default, sort_order) values
      (gid, 'Regular', 0, true, 0), (gid, 'Large', 200, false, 1);
  end if;

  -- Mushroom Rice (D): Regular £3.95 / Large £5.95
  select id into rid from menu_items where name = 'Mushroom Rice (D)' limit 1;
  if rid is not null then
    insert into item_modifier_groups (item_id, name, min_select, max_select, sort_order)
      values (rid, 'Size', 1, 1, 0) returning id into gid;
    insert into item_modifiers (group_id, name, price_delta_pence, is_default, sort_order) values
      (gid, 'Regular', 0, true, 0), (gid, 'Large', 200, false, 1);
  end if;

  -- Peas Rice (D): Regular £3.55 / Large £5.55
  select id into rid from menu_items where name = 'Peas Rice (D)' limit 1;
  if rid is not null then
    insert into item_modifier_groups (item_id, name, min_select, max_select, sort_order)
      values (rid, 'Size', 1, 1, 0) returning id into gid;
    insert into item_modifiers (group_id, name, price_delta_pence, is_default, sort_order) values
      (gid, 'Regular', 0, true, 0), (gid, 'Large', 200, false, 1);
  end if;
end $$;

commit;

-- ============================================================================
-- CHECK IT WORKED — run these after the commit
-- ============================================================================
-- select count(*) from menu_items;                              -- expect 147
-- select count(*) from menu_categories;                         -- expect 15
-- select count(*) from menu_items where image_url is not null;  -- expect 52
-- select c.title, count(i.id) from menu_categories c
--   left join menu_items i on i.category_id = c.id
--   group by c.title, c.sort_order order by c.sort_order;
