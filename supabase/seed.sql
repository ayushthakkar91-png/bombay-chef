-- Seed the menu from the current site content (mirrors src/data/menu.ts).
-- Run this in the Supabase SQL Editor AFTER 0001_init.sql.
-- Safe to re-run: it clears the menu tables first, then re-inserts.

truncate table menu_items, menu_categories restart identity cascade;

insert into menu_categories (id, title, sort_order) values
  ('starters',   'STARTERS',      0),
  ('tandoor',    'TANDOOR',       1),
  ('curries',    'CURRIES',       2),
  ('biryani',    'BIRYANI',       3),
  ('vegetarian', 'VEGETARIAN',    4),
  ('breads',     'BREADS & RICE', 5),
  ('desserts',   'DESSERTS',      6);

insert into menu_items (category_id, name, price, description, sort_order) values
  ('starters','Vegetable Samosa','£5.95','Pastry parcels freshly made, filled with spiced vegetables and deep fried.',0),
  ('starters','Onion Bhaji','£5.95','Crisp and golden onion slices imbued with exotic spices.',1),
  ('starters','Aachari Paneer Tikka','£10.95','Soft cubes of paneer marinated in a spiced yogurt mixture infused with achari masala.',2),
  ('starters','Lamb Samosa','£5.95','Pastry parcels freshly made filled with minced lamb and deep fried.',3),
  ('starters','Chicken Lollipop','£6.55','Succulent chicken lollipops marinated in aromatic spices.',4),
  ('starters','Chilli Chicken','£9.95','Stir-fried chicken infused with soy sauce, chilli sauce, coriander, onion and pepper.',5),

  ('tandoor','Tandoori Lamb Chops','£12.95','Savour succulent Lamb Chops, marinated in aromatic spices and grilled to perfection.',0),
  ('tandoor','Tandoori Chicken Tikka','£9.95','Tender chicken marinated in aromatic spices, yogurt, and herbs, skewer-grilled to perfection.',1),
  ('tandoor','Tandoori King Prawn','£14.95','Succulent prawns marinated in aromatic spices, skewer-grilled to perfection.',2),
  ('tandoor','Lamb Shish Kebab','£9.45','Lean minced lamb blend with ginger, garlic, green chilli and mixture of spices wrapped around skewers and grilled.',3),
  ('tandoor','Tandoori Mixed Grill','£14.95','A selection of prawn, lamb and chicken, marinated in herbs and spices.',4),

  ('curries','Chicken Tikka Masala','£11.55','A culinary masterpiece featuring succulent chicken cooked in a rich onion-tomato gravy.',0),
  ('curries','Lamb Rogan Josh','£11.55','Tender pieces in a luscious tomato-rich gravy, enhanced with a hint of onion richness.',1),
  ('curries','Chicken Korma','£11.55','Creamy chicken korma in luscious onion base gravy, enriched with cashews, cream, and sweet notes.',2),
  ('curries','Lamb Vindaloo','£11.55','Spicy and tangy Indian lamb dish cooked with potatoes, infused with aromatic spices.',3),
  ('curries','Chicken Madras','£11.55','Spicy and flavoured Indian curry made with tender chicken, aromatic spices, and a touch of heat.',4),
  ('curries','Lamb Bhuna','£11.55','Tender lamb cooked to perfection in a rich onion-tomato gravy, bursting with aromatic spices.',5),

  ('biryani','Chicken Tikka Biryani','£12.95','Succulent marinated chicken meets aromatic basmati rice, creating a delightful fusion of spices.',0),
  ('biryani','Lamb Biryani','£12.95','A fragrant blend of succulent lamb, aromatic basmati rice, and chefs secret spices.',1),
  ('biryani','King Prawn Biryani','£14.95','Spiced prawn cooked with basmati rice.',2),
  ('biryani','Vegetable Biryani','£10.95','A fragrant medley of basmati rice, mixed vegetables, and aromatic spices.',3),

  ('vegetarian','Butter Paneer','£11.95','Succulent Paneer in a rich onion-tomato gravy, finished with a luxurious touch of Cream and Butter.',0),
  ('vegetarian','Bombay Aloo','£7.95','Slices of potatoes cooked with bombay chat masala.',1),
  ('vegetarian','Saag Aloo','£7.95','Fresh potatoes and vibrant spinach, delicately spiced for a delightful vegetarian experience.',2),
  ('vegetarian','Palak Paneer','£10.95','Delicate cubes of cottage cheese entwined with vibrant spinach leaves.',3),
  ('vegetarian','Aloo Gobhi','£7.95','Potatoes & cauliflower cooked together with slices of tomatoes, green peppers & onions.',4),

  ('breads','Plain Naan','£2.95','Wheat bread freshly baked in tandoor.',0),
  ('breads','Garlic Naan','£3.15','Naan bread coated with freshly chopped garlic.',1),
  ('breads','Cheese Chili Garlic Naan','£4.45','Soft naan bread stuffed with melted cheese and topped with chilli and garlic.',2),
  ('breads','Peshwari Naan','£3.95','Naan bread stuffed with sultanas, coconut & cashew nuts.',3),
  ('breads','Pilau Rice','£5.65','Fragrant basmati rice infused with spices.',4),
  ('breads','Mushroom Rice','£5.95','Savour the exquisite blend of aromatic Basmati mushroom rice with sauteed mushrooms.',5),

  ('desserts','Gulab Jamun','£2.95','Soft spongy balls flavoured with cardamom and pistachio nuts in sweet syrup.',0);
