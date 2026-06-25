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
    id: "veg-starters",
    title: "VEG. STARTERS",
    items: [
      { name: "PLAIN & SPICY POPPADUMS (G)", price: "£1.95" },
      { name: "MASALA POPPADUMS (G)", price: "£3.95" },
      { name: "POTATO CHIPS (FRENCH FRIES)", price: "£4.95", description: "Thin & crispy potato chips" },
      { name: "ONION BHAJI (2 PCS) (E)", price: "£6.95", description: "Onion slices mixed with homemade spices and deep fried" },
      { name: "VEG SAMOSA (2 PCS) (G)", price: "£6.95", description: "Pastry parcels freshly made, filled with spiced vegetable and deep fried" },
      { name: "MIX VEG PAKORA", price: "£6.95", description: "Vegetables mixed with fresh ginger, garlic, coriander and deep fried" },
      { name: "CHILLI CHIPS (🌶)", price: "£7.45", description: "Stir fried potato chips in hot spiced sauce" },
      { name: "CHILLI MUSHROOM (🌶)", price: "£7.95", description: "Fried mushroom cooked in a spiced sauce with onion, pepper, and chili" },
      { name: "CHILLI PANEER (D)", price: "£10.95", description: "Cubes of homemade cottage cheeses cooked in tomatoes sauce, onions, and peppers" },
      { name: "SPIRAL POTATO", price: "£5.95", description: "A spiral potato is a skewer of spiral-cut potato, deep-fried to crispy perfection, seasoned, and served hot." },
      { name: "VEGETABLE MOMO", price: "£9.95", description: "Hand-made dumpling filled with mix vegetables, onions, ginger, and garlic, served with a chutney" },
      { name: "PANEER SHASHLIK (D 🌶)", price: "£11.95", description: "Homemade cottage cheese grilled with slice of onion, capsicum and tomato." },
      { name: "HARA BHARA KEBAB (D)", price: "£7.95", description: "Crispy deep fried patties made with spinach, green peas, chick peas potatos and aromatic spices blended with gram flour for a rich flavour and perfect texture. Served with mint chutney." }
    ]
  },
  {
    id: "non-veg-starters",
    title: "NON-VEG. STARTERS",
    items: [
      { name: "CHICKEN MOMO (G)", price: "£9.95", description: "Hand-made dumping filled mince chicken, onions, ginger and garlic, served with a chutney." },
      { name: "CHICKEN TIKKA (D 🌶)", price: "£10.95", description: "Diced chicken breast marinated in yogurt, herbs and spices, cooked in clay oven." },
      { name: "CHILLI CHICKEN (🌶)", price: "£10.95", description: "Battered chicken chunks fired and cooked in a spiced sauce with onion, pepper, and chilli." },
      { name: "CHICKEN LOLLIPOP (🌶)", price: "£7.95", description: "Spiced chicken nibblet deep fried with secret sauce" },
      { name: "CHICKEN PAKORA (D)", price: "£7.45", description: "Slice chicken marinated with spices and fresh criander and deep fried." },
      { name: "LAMB TIKKA (D 🌶)", price: "£11.95", description: "Cubes of lamb marinated in yogurt, herbs and medium hot spices," },
      { name: "LAMB SHISH KEBAB (D 🌶)", price: "£10.95", description: "Lean minced lamb blend with ginger, garlic, green chilli, and mixture of spices wrapped around skewers and grilled." },
      { name: "LAMB CHOPS (D)", price: "£14.95", description: "Lamb chops cooked in tandoor mixed with ginger, garlic, green chilli, and mixture of spices." },
      { name: "LAMB SAMOSA (2 PCS) (G)", price: "£6.95", description: "Pastry parcels freshly made, filled with minced lamb and deep fried" }
    ]
  },
  {
    id: "tandoori-main-course",
    title: "TANDOORI MAIN COURSE",
    items: [
      { name: "TANDOORI KING PRAWN (D S)", price: "£16.95", description: "Succulent king prawns marinated in mild northern spices and gently cooked in clay oven." },
      { name: "CHICKEN SHASHLIK (D 🌶)", price: "£11.95", description: "Marinated chicken cubes grilled with slice of onion, capsicum and tomato" },
      { name: "TANDOORI MIXED GRILLED (D S 🌶)", price: "£16.95", description: "A selection of prawn, marinated in herbs and spices." },
      { name: "TANDOORI SALMON (D S)", price: "£14.95", description: "Succulent salmon marinated in mild northern spices and gently cooked in clay oven." },
      { name: "TANDOORI CHICKEN (D)", price: "HALF £10.95 / FULL £16.95", description: "Chicken on the bone, prepared with mild tandoori spices and grilled in clay oven" },
      { name: "BOMBAY SPECIAL PLATTER (D S)", price: "£20.95", description: "Choose any 5 items from following : (Chicken Tikka, Lamb Tikka, Paneer Tikka, Tandoori Chicken, Lamb Chops, Lamb Shish Kebab)" }
    ]
  },
  {
    id: "seafood-main-dishes",
    title: "SEAFOOD MAIN DISHES",
    items: [
      { name: "KING PRAWN MASALA (N D S)", price: "£15.95", description: "Marinated king prawn, grilled in clay oven, cooked in masala sauce" },
      { name: "KING PRAWN BHUNA (D S 🌶)", price: "£15.95", description: "King prawn sautéed with aromatic spices, cooked with herbs & fresh tomatoes." },
      { name: "KING PRAWN SAAG (D S 🌶)", price: "£15.95", description: "King prawn cooked with fresh spinach" },
      { name: "KING PRAWN PATHIYA (D S 🌶)", price: "£15.95", description: "Marinated king prawn cooked in a delicious sweet & sour sauce with curry leaves" },
      { name: "KING PRAWN DHANSAK (D S 🌶)", price: "£15.95", description: "King prawn cooked with lentils in a delicious hot, sweet & sour sauce." },
      { name: "KING PRAWN JALFREZI (D S 🌶🌶🌶)", price: "£15.95", description: "Marinated king prawn grilled in clay oven & cooked in tomato sauce with tamarind, curry leaves, mixed peppers, green chillies, and hints of chopped garlic." },
      { name: "MACHLI MASALA (D G S N)", price: "£14.95", description: "Tender fillet of fish deep fried & cooked together with traditional masala sauce." },
      { name: "MADRAS FISH CURRY (D G S 🌶🌶🌶)", price: "£14.95", description: "Chunks of boneless cod fish cooked with spicy tamarind sauce, garnished with garlic and curry leaves." }
    ]
  },
  {
    id: "chicken-main-dishes",
    title: "CHICKEN MAIN DISHES",
    items: [
      { name: "CHICKEN KORMA (N D)", price: "£13.95", description: "Tandoor chicken tikka breast cooked in gravy sauce and cashew nuts" },
      { name: "CHICKEN TIKKA MASALA (N D)", price: "£13.95", description: "Marinated chicken breast cooked in clay oven and served in a rich masala sauce." },
      { name: "BUTTER CHICKEN (N D)", price: "£13.95", description: "Grilled chicken breast cooked in mild creamy sauce with cashew nuts." },
      { name: "CHICKEN GREEN MASALA (N D)", price: "£13.95", description: "Tender chicken breast served in a rich green masala sauce containing mint, coriander, green pepper and pistachio" },
      { name: "CHICKEN BHUNA (D 🌶)", price: "£13.95", description: "Tender chicken breast cooked in tomato, onion, capsicum & homemade masala." },
      { name: "CHICKEN ROGAN (D)", price: "£13.95", description: "Tandoori chicken breast cooked in a traditional Rogan sauce with lots of fresh tomatoes." },
      { name: "CHICKEN BALTI (D P 🌶)", price: "£13.95", description: "Tender chicken breast cooked with onions, fresh tomatoes with special Balti sauce." },
      { name: "CHICKEN SAAG (D 🌶)", price: "£13.95", description: "Tender chicken breast cooked with fresh spinach leaves" },
      { name: "CHICKEN DHANSAK (D 🌶)", price: "£13.95", description: "Tandoori chicken breast cooked with yellow lentilsmin a sweet and sour sauce." },
      { name: "BOMBAY CHICKEN (D P M 🌶🌶🌶)", price: "£13.95", description: "Must try - suitable for spicy curry lovers Cubes of supreme breast chicken cooked with gravy of ginger, garlic, coriander, onions, green chilli, and fresh tomatoes." },
      { name: "CHICKEN MADURAI (D 🌶🌶🌶)", price: "£13.95", description: "Supreme breast of chicken marinated in herbs and spices, grilled in clay oven and cooked together in a rich tomato sauce and green chilli." },
      { name: "CHICKEN MADRAS (D 🌶🌶🌶)", price: "£13.95", description: "Tandoorn chicken breast cooked in a gravy sauce with onions, green chilli, and peppers." },
      { name: "CHICKEN JALFRAZO (D 🌶🌶🌶)", price: "£13.95", description: "Tandoori chicken breast cooked with lots of chopped garlic" },
      { name: "CHICKEN VINDALOO (D 🌶🌶🌶)", price: "£13.95", description: "(Very hot)- tandoori chicken breast cooked with potato, capsicum, onion, and curry leaves" },
      { name: "KARAHI CHICKEN (D)", price: "£13.95", description: "Tender chicken breast cooked with capsicum and onion in karahi sauce" },
      { name: "CHEF SPECIAL CHICKEN CURRY (D SY N)", price: "£13.95", description: "Rich and flavorful chicken curry with special chef sauce/twist with soya beans." }
    ]
  },
  {
    id: "lamb-main-dishes",
    title: "LAMB MAIN DISHES",
    items: [
      { name: "LAMB KORMA (N D)", price: "£14.95", description: "Tander cubes of lamb cooked in classic korma sauce" },
      { name: "LAMB TIKKA MASALA (N D)", price: "£14.95", description: "Lamb cooked with onions and capsicum in a rich masala sauce" },
      { name: "LAMB PASANDA (N D)", price: "£14.95", description: "Marinated lamb slices, cooked in sweet and sour creamy sauce with cashew nuts" },
      { name: "LAMB BHUNA (D 🌶)", price: "£14.95", description: "Tender lamb cooked in thick tomato sauce, onion, and ginger" },
      { name: "LAMB SAAG (D 🌶)", price: "£14.95", description: "Tender lamb gently cooked with fresh spinach leaves." },
      { name: "LAMB ROGAN JOSH (D 🌶)", price: "£14.95", description: "Tender lamb in a traditional Rogan Josh sauce with lots of fresh tomatoes" },
      { name: "LAMB MADRAS (D 🌶🌶🌶)", price: "£14.95", description: "Tender lamb cooked with onions, garlic, green chilli and tomatoes" },
      { name: "LAMB VINDALOO (D P 🌶🌶🌶)", price: "£14.95", description: "Tander lamb cooked with potato, capsicum, onion, curry leaves, fresh tomatoes and vindaloo sauce" },
      { name: "LAMB MADURAI (D 🌶🌶🌶)", price: "£14.95", description: "Slices of spicy tandoori lamb cooked in spicy tomato sauce with fresh chilli, green pepper, onion, and curry leaves" },
      { name: "LAMB DHANSAK (D)", price: "£14.95", description: "Tender lamb cooked with yellow lentils in a sweet and sour sauce." },
      { name: "CHEF SPECIAL LAMB CURRY (N D SY)", price: "£14.95", description: "Rich and flavorful lamb curry with special chef sauce/twist with soya beans." },
      { name: "LAMB GREEN MASALA (N D)", price: "£14.95", description: "Tender lamb served in a rich green masala sauce containing mint coriander, green pepper and pistachio" }
    ]
  },
  {
    id: "vegetarian-main-dishes",
    title: "VEGETARIAN MAIN DISHES",
    items: [
      { name: "SHAHI TANDOORI PANEER (D)", price: "£11.95", description: "Homemade cottage cheese, marinated with spices, tenderly cooked with onion, tomato and capsicum in clay oven and mix with our own made sauce." },
      { name: "PANEER MASALA (D)", price: "£11.95", description: "Cubes of homemade cottage cheese cooked with onions, capsicum in rich masala sauce." },
      { name: "MUTTER PANEER (D 🌶)", price: "£11.95", description: "Cubes of homemade cottage cheese cooked with fresh green peas. onion & tomato sauce" },
      { name: "PALAK PANEER (D)", price: "£11.95", description: "Cubes of homemade cottage cheese cooked with fresh green spinach and spices" },
      { name: "MIX VEG CURRY (V 🌶)", price: "£11.95", description: "Fresh mixed vegetables cooked with our own spices" },
      { name: "MIX VEG KORMA (N D)", price: "£11.95", description: "Mixed vegetables cooked in a mild korma sauce." },
      { name: "BOMBAY PANEER (D 🌶🌶🌶)", price: "£11.95", description: "Paneer cubes cooked with gravy of ginger, garlic, coriander, onions, green chilli and fresh tomatoes" },
      { name: "PANEER KARAHI (D 🌶)", price: "£11.95", description: "Tender paneer cubes cooked with capsicum and onion in karaahi sauce." },
      { name: "PANEER BHURJI (D 🌶)", price: "£11.95", description: "Grated paneer cooked to perfection in a rich onion-tomato, ginger garlic gravy brushing with aromatic spice." },
      { name: "PANEER GREEN MASALA (D N)", price: "£11.95", description: "Tender paneer cubes in a rich green masala sauce, contains with mint, coriander, green pepper and cashew." }
    ]
  },
  {
    id: "vegetarian-side-dishes",
    title: "VEGETARIAN SIDE DISHES",
    items: [
      { name: "BOMBAY ALOO (V)", price: "£8.95", description: "Slices of potatoes cooked with butter & Bombay chat masala." },
      { name: "SAAG ALOO (V)", price: "£8.95", description: "Slices of potatoes cooked with fresh spinach leaves." },
      { name: "PALAK (V)", price: "£8.95", description: "Fresh spinach leaves cooked with cumin, garlic & ginger." },
      { name: "GOBI SABJI (V)", price: "£8.95", description: "Fresh cauliflower cooked with tomato, ginger & garlic" },
      { name: "ALOO GOBI (V)", price: "£8.95", description: "Potatoes & cauliflower cooked together with slices of tomatoes, green peppers & onions." },
      { name: "ZEERA ALOO (V)", price: "£8.95", description: "Cumin & coriander flavoured dry sauteed potatoes." },
      { name: "SHAHI BAINGAN (V)", price: "£8.95", description: "Fresh aubergine cooked with onion, garlic & ginger." },
      { name: "BHINDI SABJI (V)", price: "£8.95", description: "Fresh okra cooked with tomato, cumin, mustard seeds, sauteed with ginger & garlic." },
      { name: "BOMBAY MUSHROOM (V)", price: "£8.95", description: "Fresh mushrooms cooked with onion, tomatoes, green peppers & light spices." },
      { name: "KHAYBARI CHANNA MASALA (V)", price: "£8.95", description: "Chickpeas cooked with fresh tomatoes, onion, green pepper, ginger & our special Channa masala." },
      { name: "DAL MAKHANI (D V)", price: "£8.95", description: "Whole black lentins slow - cooked with butter,cream & spices. Reach & Creamy." },
      { name: "PALAK DAAL (V)", price: "£8.95", description: "Cumin flavoured mix lentils cooked with garlic, ginger & spinach leaves." },
      { name: "TARKA DAAL (V)", price: "£8.95", description: "Assorted lentils cooked with butter & fried garlic." }
    ]
  },
  {
    id: "biryanis",
    title: "BIRYANIS",
    items: [
      { name: "CHICKEN DUM BIRYANI (D)", price: "£12.95", description: "A style of Biryani from Hyderabad, India. Originating in the kitchen of Nizam of Hyderabad serve with cucumber raita. Base ingredients are basmati rice, chicken, yogurt (dahi), fried onions, & ghee. Spices include cinnamon, cloves, cardamom, bay leaves, cumin powder, lemon, mint, mace flower & star anise." },
      { name: "VEGETABLE BIRYANI (D)", price: "£11.95", description: "Fresh mixed vegetables cooked with basmati rice." },
      { name: "LAMB BIRYANI (D)", price: "£14.95", description: "Tender lamb cooked with basmati rice." },
      { name: "KING PRAWN BIRYANI (D S)", price: "£15.95", description: "Spiced prawn cooked with basmati rice." },
      { name: "MIXED BIRYANI (D S)", price: "£14.95", description: "Basmati rice Mixed with chicken, lamb, and king prawn." },
      { name: "CHICKEN TIKKA BIRYANI (D)", price: "£13.95", description: "Chicken breast cooked with basmati rice." }
    ]
  },
  {
    id: "rice",
    title: "RICE",
    items: [
      { name: "PILAU RICE (D) (Small/Large)", price: "£4.95 / £5.95", description: "Basmati rice cooked in herbs." },
      { name: "PLAIN RICE (V) (Small/Large)", price: "£3.95 / £5.75", description: "Steamed basmati rice." },
      { name: "SPECIAL MUSHROOM RICE (D) (Small/Large)", price: "£4.55 / £6.15", description: "Pilau rice fried with mushroom." },
      { name: "PEAS RICE (D) (Small/Large)", price: "£4.45 / £5.95", description: "Steamed basmati rice fried with green peas." },
      { name: "EGG FRIED RICE (D E)", price: "£6.95", description: "Basmati rice cooked in herbs with scrambled eggs & green peas." },
      { name: "JEERA RICE (Small/Large)", price: "£4.45 / £5.95", description: "basmati rice cooked with cumin seeds." }
    ]
  },
  {
    id: "breads",
    title: "BREADS",
    items: [
      { name: "PLAIN NAAN (D G E)", price: "£3.15", description: "Whole wheat bread freshly baked in our clay oven." },
      { name: "GARLIC NAAN (D G E)", price: "£3.55", description: "Naan bread coated with freshly chopped garlic." },
      { name: "CHILLI NAAN (D G E 🌶)", price: "£3.55", description: "Naan bread coated with freshly chopped chili." },
      { name: "CHILLI GARLIC NAAN (D G E 🌶)", price: "£3.75", description: "Naan bread coated with freshly chopped chili & garlic." },
      { name: "PESHAWARI NAAN (D G E N)", price: "£4.45", description: "Naan bread stuffed with sultanas, coconut & cashew nuts." },
      { name: "CHEESY NAAN (D G E)", price: "£4.45", description: "Whole wheat bread freshly baked with cheese in clay oven." },
      { name: "KULCHA NAAN (D G E)", price: "£4.45", description: "Naan bread stuffed with mild spicy vegetables." },
      { name: "KEEMA NAAN (D G E)", price: "£4.45", description: "Naan bread stuffed with spiced lamb mincemeat." },
      { name: "TANDOORI ROTI (G)", price: "£2.95", description: "Whole wheat bread freshly baked in tandoor." },
      { name: "LACHHA PARATHA (D G)", price: "£4.45", description: "Whole wheat dough stretched, brushed with butter & baked in tandoor." }
    ]
  },
  {
    id: "yoghurt-pickle",
    title: "YOGHURT / PICKLE",
    items: [
      { name: "RAITA (D)", price: "£2.95" },
      { name: "PLAIN YOGURT (D)", price: "£1.95" },
      { name: "MINT YOGURT (D)", price: "£1.75" },
      { name: "MIXED PICKLE", price: "£1.75" },
      { name: "LIME PICKLE", price: "£1.75" }
    ]
  },
  {
    id: "desserts",
    title: "DESSERTS",
    items: [
      { name: "GULAB JAMUN (2 PCS)", price: "£3.95" },
      { name: "KULFI (D)", price: "£3.95" }
    ]
  },
  {
    id: "indo-chinese-mains",
    title: "INDO CHINESE - MAINS",
    items: [
      { name: "VEGETABLE MANCHURIAN (GRAVY)", price: "£10.95", description: "Crispy vegetable balls tossed in spiced gravy with soya sauce, garlic & chilli." },
      { name: "VEGETABLE MANCHURIAN (DRY)", price: "£9.95", description: "Crispy vegetable balls tossed in chinese sauce, garlic, chilli & soya sauce served without gravy" },
      { name: "PANEER MANCHURIAN (DRY)", price: "£10.95", description: "Crispy paneer cubes & manchurian balls stir-fried in spicy indo-chinese sauce with garlic, soya sauce & chilli sauce without gravy" },
      { name: "PANEER MANCHURIAN (GRAVY)", price: "£10.95", description: "Crispy paneer cubes & manchurian balls stir-fried in indo-chinese sauce with garlic, soya sauce & chilli" },
      { name: "CHILLI GARLIC MANCHURIAN", price: "£10.95", description: "Crispy manchurian balls coated in a fried indo-chinese chilli garlic sauce with bold flavours of soya, ginger & spices." },
      { name: "SCHEZWAN PANEER", price: "£11.95", description: "Schezwan paneer is a spicy and flavourful Indo-Chinese dish featuring soft paneer cubes tossed in a tangy, fiery Schezwan sauce" },
      { name: "VEG FRIED RICE", price: "£4.95 / £6.95", description: "Steamed rice stir fried with assorted vegetables seasoned with soya sauce & other spices." },
      { name: "PANEER RICE", price: "£4.95 / £6.95", description: "Flavourful rice dish with sauteed paneer cubes & vegetables." },
      { name: "VEG SCHEZWAN RICE", price: "£4.95 / £6.95", description: "Steamed rice mixed with vegetables & schezwan sauce." },
      { name: "CHINESE BHEL", price: "£9.95", description: "Crispy fired noodles tossed with fresh vegetables & a tangy, spicy sauce." }
    ]
  },
  {
    id: "indo-chinese-soup",
    title: "INDO CHINESE - SOUP",
    items: [
      { name: "HOT & SOUR SOUP", price: "£5.95", description: "A tangy & spicy broth filled with vegetable & deep flavour of soya & chilli." },
      { name: "MANCHOW SOUP", price: "£6.95", description: "A spicy indo chinese soup featuring crispy fried noodles, mixed vegetable & a savory blend of soya sauce & spices." },
      { name: "MANCHURIAN SOUP", price: "£6.95", description: "A broth with vegetable balls simmered in a (rangy & spicy sauce) with garlic & soya sauce. (secret sauce)" },
      { name: "CHICKEN SOUP", price: "£7.95", description: "A tangy & spicy broth filled with chicken & deep flavour of soya & chilli." },
      { name: "CHICKEN MANCHOW SOUP", price: "£7.95", description: "A spicy indo chinese soup featuring crsipy fried noodles, mixed chicken & a savory blend of soya sauce & spices." }
    ]
  },
  {
    id: "indo-chinese-noodles",
    title: "INDO CHINESE - NOODLES",
    items: [
      { name: "MANCHURIAN NOODLES", price: "£9.95", description: "A spicy indo chinese dish combing stir-fried noodles & vegetable balls with a savoury sauce." },
      { name: "MUSHROOM NOODLES", price: "£9.95", description: "Stir-fried noodles tossed with a medley of mushroom & flavourful seasoning." },
      { name: "PANEER NOODLES", price: "£9.95", description: "Stir-fried noodles tossed with flavourful paneer cubes vegetables & savoury sauce." },
      { name: "VEG HAKKA NOODLES", price: "£9.95", description: "A special noodles made with vegetables like cabbage, carrot peppers & onion with soya sauce & other spices." },
      { name: "CHILLI GARLIC NOODLES", price: "£9.95", description: "Stir-fried noodles tossed with a Variety of vegetables garlic & chilli sauce for bold flavour." },
      { name: "CHICKEN SCHEZWAN NOODLES", price: "£10.95", description: "A special noodles made with chicken, cabbage, carrot, peppers and onion with schezwan, soya & chilli sauce." },
      { name: "CHICKEN NOODLES", price: "£10.95", description: "A special noodles made with chicken & vegetable with soya and chilli sauce." },
      { name: "KING PRAWN NOODLES", price: "£13.95", description: "Stir-fried noodles with prawn, vegetables, soya sauce, garlic and chilli sauce." }
    ]
  }
];
