export type MenuItem = {
  name: string;
  price: string;
  description?: string;
};

export type MenuCategory = {
  id: string;
  title: string;
  items: MenuItem[];
};

export const MENU_DATA: MenuCategory[] = [
  {
    id: "starters",
    title: "STARTERS",
    items: [
      { name: "Vegetable Samosa", price: "£5.95", description: "Pastry parcels freshly made, filled with spiced vegetables and deep fried." },
      { name: "Onion Bhaji", price: "£5.95", description: "Crisp and golden onion slices imbued with exotic spices." },
      { name: "Aachari Paneer Tikka", price: "£10.95", description: "Soft cubes of paneer marinated in a spiced yogurt mixture infused with achari masala." },
      { name: "Lamb Samosa", price: "£5.95", description: "Pastry parcels freshly made filled with minced lamb and deep fried." },
      { name: "Chicken Lollipop", price: "£6.55", description: "Succulent chicken lollipops marinated in aromatic spices." },
      { name: "Chilli Chicken", price: "£9.95", description: "Stir-fried chicken infused with soy sauce, chilli sauce, coriander, onion and pepper." }
    ]
  },
  {
    id: "tandoor",
    title: "TANDOOR",
    items: [
      { name: "Tandoori Lamb Chops", price: "£12.95", description: "Savour succulent Lamb Chops, marinated in aromatic spices and grilled to perfection." },
      { name: "Tandoori Chicken Tikka", price: "£9.95", description: "Tender chicken marinated in aromatic spices, yogurt, and herbs, skewer-grilled to perfection." },
      { name: "Tandoori King Prawn", price: "£14.95", description: "Succulent prawns marinated in aromatic spices, skewer-grilled to perfection." },
      { name: "Lamb Shish Kebab", price: "£9.45", description: "Lean minced lamb blend with ginger, garlic, green chilli and mixture of spices wrapped around skewers and grilled." },
      { name: "Tandoori Mixed Grill", price: "£14.95", description: "A selection of prawn, lamb and chicken, marinated in herbs and spices." }
    ]
  },

  {
    id: "curries",
    title: "CURRIES",
    items: [
      { name: "Chicken Tikka Masala", price: "£11.55", description: "A culinary masterpiece featuring succulent chicken cooked in a rich onion-tomato gravy." },
      { name: "Lamb Rogan Josh", price: "£11.55", description: "Tender pieces in a luscious tomato-rich gravy, enhanced with a hint of onion richness." },
      { name: "Chicken Korma", price: "£11.55", description: "Creamy chicken korma in luscious onion base gravy, enriched with cashews, cream, and sweet notes." },
      { name: "Lamb Vindaloo", price: "£11.55", description: "Spicy and tangy Indian lamb dish cooked with potatoes, infused with aromatic spices." },
      { name: "Chicken Madras", price: "£11.55", description: "Spicy and flavoured Indian curry made with tender chicken, aromatic spices, and a touch of heat." },
      { name: "Lamb Bhuna", price: "£11.55", description: "Tender lamb cooked to perfection in a rich onion-tomato gravy, bursting with aromatic spices." }
    ]
  },
  {
    id: "biryani",
    title: "BIRYANI",
    items: [
      { name: "Chicken Tikka Biryani", price: "£12.95", description: "Succulent marinated chicken meets aromatic basmati rice, creating a delightful fusion of spices." },
      { name: "Lamb Biryani", price: "£12.95", description: "A fragrant blend of succulent lamb, aromatic basmati rice, and chefs secret spices." },
      { name: "King Prawn Biryani", price: "£14.95", description: "Spiced prawn cooked with basmati rice." },
      { name: "Vegetable Biryani", price: "£10.95", description: "A fragrant medley of basmati rice, mixed vegetables, and aromatic spices." }
    ]
  },
  {
    id: "vegetarian",
    title: "VEGETARIAN",
    items: [
      { name: "Butter Paneer", price: "£11.95", description: "Succulent Paneer in a rich onion-tomato gravy, finished with a luxurious touch of Cream and Butter." },
      { name: "Bombay Aloo", price: "£7.95", description: "Slices of potatoes cooked with bombay chat masala." },
      { name: "Saag Aloo", price: "£7.95", description: "Fresh potatoes and vibrant spinach, delicately spiced for a delightful vegetarian experience." },
      { name: "Palak Paneer", price: "£10.95", description: "Delicate cubes of cottage cheese entwined with vibrant spinach leaves." },
      { name: "Aloo Gobhi", price: "£7.95", description: "Potatoes & cauliflower cooked together with slices of tomatoes, green peppers & onions." }
    ]
  },
  {
    id: "breads",
    title: "BREADS & RICE",
    items: [
      { name: "Plain Naan", price: "£2.95", description: "Wheat bread freshly baked in tandoor." },
      { name: "Garlic Naan", price: "£3.15", description: "Naan bread coated with freshly chopped garlic." },
      { name: "Cheese Chili Garlic Naan", price: "£4.45", description: "Soft naan bread stuffed with melted cheese and topped with chilli and garlic." },
      { name: "Peshwari Naan", price: "£3.95", description: "Naan bread stuffed with sultanas, coconut & cashew nuts." },
      { name: "Pilau Rice", price: "£5.65", description: "Fragrant basmati rice infused with spices." },
      { name: "Mushroom Rice", price: "£5.95", description: "Savour the exquisite blend of aromatic Basmati mushroom rice with sauteed mushrooms." }
    ]
  },
  {
    id: "desserts",
    title: "DESSERTS",
    items: [
      { name: "Gulab Jamun", price: "£2.95", description: "Soft spongy balls flavoured with cardamom and pistachio nuts in sweet syrup." }
    ]
  }
];
