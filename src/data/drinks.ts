import type { MenuCategory } from "@/data/menu";

// Drinks live in the database (Supabase) just like food, so they're editable
// from the admin panel. This array is the seed/fallback source — it mirrors the
// `drinks-*` categories and is used by DrinksMenu when the DB isn't connected.
// Category ids are prefixed `drinks-` so the food menu (FullMenu) can exclude them.
export const DRINKS_DATA: MenuCategory[] = [
  {
    id: "drinks-beers",
    title: "Beers & Ciders",
    items: [
      { name: "Bombay Bicycle (Draught)", price: "Half Pint £4.45 / Pint £8.95" },
      { name: "Cobra (Draught)", price: "Half Pint £4.00 / Pint £7.50" },
      { name: "Cobra (Bottle)", description: "660ml", price: "£6.95" },
      { name: "Bombay Bicycle (Bottle)", description: "330ml", price: "£4.95" },
      { name: "Cobra Zero (Bottle)", description: "330ml", price: "£4.95" },
      { name: "Heineken Zero (Bottle)", description: "330ml", price: "£4.95" },
      { name: "Corona (Bottle)", description: "330ml", price: "£5.00" },
      { name: "Thatchers Ciders (Bottle)", description: "550ml", price: "£7.00" },
    ],
  },
  {
    id: "drinks-white-wine",
    title: "White Wines",
    items: [
      { name: "1. Pinot Grigio, Il Caggio (Italy)", description: "Stylish and crisp aromas of gooseberries and powerful fruit flavours, linked with a clean finish.", price: "175ml £6.50 / 250ml £8.50 / Bottle £23.00" },
      { name: "2. Sauvignon Blanc, Wonder Creek (Chile)", description: "Pale lemon colour, elegant floral nose, subtle flavours of pear & citrus fruit & hint of elderflower.", price: "175ml £7.00 / 250ml £9.50 / Bottle £27.00" },
      { name: "3. Chardonnay, Flarestone (Australia)", description: "Fresh, ripe Chardonnay flavours of melon & peaches. A rich, creamy texture with a rounded crisp finish.", price: "Bottle £27.00" },
      { name: "4. Chenin Blanc, Dudley's Stone (South Africa)", description: "Lively prominent fruity guava & green herb flavours with a hint of lime.", price: "Bottle £27.00" },
      { name: "5. Sauvignon Blanc, Marlborough, Honu (New Zealand)", description: "Crisp & refreshing, traditional citrus notes. Fresh lemon, lime & tropical fruit flavours.", price: "Bottle £33.00" },
      { name: "6. Chablis, Domaine de Varoux (France)", description: "Pale straw yellow, good depth of fruit and acidity, very well balanced with a long finish.", price: "Bottle £39.00" },
    ],
  },
  {
    id: "drinks-rose-wine",
    title: "Rosé Wines",
    items: [
      { name: "7. White Zinfandel Ocean Heights (California)", description: "Fresh and elegant rose wine features aromas of ripe strawberry and flavours of juicy cranberry and cherry.", price: "175ml £6.50 / 250ml £8.50 / Bottle £23.00" },
      { name: "8. Pinot Grigio Rosé, Il Caggio (Italy)", description: "A delicate pink wine full of fresh summer fruit aromas & flavours.", price: "175ml £7.00 / 250ml £9.50 / Bottle £27.00" },
    ],
  },
  {
    id: "drinks-red-wine",
    title: "Red Wines",
    items: [
      { name: "9. Merlot, Wonder Creek (Chile)", description: "Fresh & fruity with aromas of plums, prunes & blackberries. Smooth mid length finish.", price: "175ml £6.50 / 250ml £8.50 / Bottle £23.00" },
      { name: "10. Shiraz, Flarestone (Australia)", description: "Fruity with rounded tannins, delicious acidity, long, delightful mature fruits finish.", price: "175ml £7.00 / 250ml £9.50 / Bottle £27.00" },
      { name: "11. Malbec, El Tesoro, Black Label (Argentina)", description: "A soft, round, easy drinking red with ripe plums & blackberries on the palate.", price: "Bottle £28.00" },
      { name: "12. Rioja Joven, Escena (Spain)", description: "A blend of Tempranillo, Mazuelo and Graciano grapes. Mature, graceful wine with a long, velvety style.", price: "Bottle £29.00" },
      { name: "13. Pinot Noir, Marlborough, Rapaura Springs (New Zealand)", description: "Complex and intense aromas of strawberries, cherries, and cloves with a touch of green tea.", price: "Bottle £37.00" },
      { name: "14. Châteauneuf-du-Pape, Barton-et-Guestier (France)", description: "Fresh & fruity with aromas of plums, prunes & blackberries. Juicy palate, smooth finish.", price: "Bottle £49.00" },
    ],
  },
  {
    id: "drinks-sparkling",
    title: "Sparkling Wines & Champagnes",
    items: [
      { name: "15. Prosecco, R&R (Italy)", description: "Intense fruity bouquet with a hint of golden apples. Very dry, fresh, light in body.", price: "200ml £11.00 / Bottle £35.00" },
      { name: "16. Champagne, Moet & Chandon (France)", description: "Intense aromas of fresh red summer berries with floral notes and a light peppery touch.", price: "Bottle £65.95" },
      { name: "17. Champagne, Laurent-Perrier Rose (France)", description: "Apple-like and zesty on the nose with scents of dried flowers, softer, rounder fruit notes.", price: "Bottle £108.95" },
    ],
  },
  {
    id: "drinks-single-malts",
    title: "Single Malts & Blends",
    items: [
      { name: "Oban 14 yrs (Single Malt)", price: "£9.00" },
      { name: "Amrut (Single Malt)", price: "£7.00" },
      { name: "Rampur (Single Malt)", price: "£7.00" },
      { name: "Indri (Single Malt)", price: "£7.00" },
      { name: "J.W. Blue Label (Blended Scotch)", price: "£14.00" },
      { name: "J.W Black Label (Blended Scotch)", price: "£5.00" },
      { name: "Chivas Regal (Blended Scotch)", price: "£5.00" },
      { name: "Haig Club Single Grain (Blended Scotch)", price: "£5.00" },
      { name: "Talisker 10 yrs (Islay)", price: "£5.00" },
      { name: "Macallan Fine oak 10yrs (Speyside)", price: "£5.00" },
      { name: "Glenfiddich 12 yrs (Speyside)", price: "£5.00" },
    ],
  },
  {
    id: "drinks-spirits",
    title: "Spirits",
    items: [
      { name: "Grey Goose (Vodka)", price: "£5.50" },
      { name: "Smirnoff (Vodka)", price: "£4.50" },
      { name: "Ciroc Flavour (Vodka)", price: "£5.00" },
      { name: "Au Vodka (Vodka)", price: "£5.00" },
      { name: "Tanqueray (Gin)", price: "£4.50" },
      { name: "Bombay Sapphire (Gin)", price: "£4.50" },
      { name: "Hendricks (Gin)", price: "£4.50" },
      { name: "Gordon Gin (Gin)", price: "£4.50" },
      { name: "Martell (Cognac)", price: "£5.00" },
      { name: "Remy Martin XO (Cognac)", price: "£14.00" },
      { name: "Old Monk (Rum)", price: "£4.50" },
      { name: "Captain Morgan Dark (Rum)", price: "£4.50" },
      { name: "Cenote Blanco (Tequila)", price: "£4.00" },
    ],
  },
  {
    id: "drinks-whiskey",
    title: "Whiskey",
    items: [
      { name: "Jack Daniels (Bourbon)", price: "£5.00" },
      { name: "Jameson (Irish Whiskey)", price: "£5.00" },
    ],
  },
  {
    id: "drinks-liqueurs",
    title: "Liqueurs",
    items: [
      { name: "Disaronno Amaretto", price: "£4.00" },
      { name: "Sambuca", price: "£4.00" },
      { name: "Malibu", price: "£4.00" },
      { name: "Baileys", price: "£4.00" },
      { name: "Jägermeister", price: "£4.00" },
    ],
  },
  {
    id: "drinks-soft",
    title: "Soft Drinks",
    items: [
      { name: "Lassi (sweet, salt & mango)", price: "£4.75" },
      { name: "Orange Juice", price: "£3.50" },
      { name: "Mango Juice", price: "£3.50" },
      { name: "Apple Juice", price: "£3.50" },
      { name: "Coke / Diet Coke / Sprite", description: "300ml Bottle", price: "£3.50" },
      { name: "Mixers (Tonic, Ginger Ale, soda)", description: "250ml", price: "£3.50" },
      { name: "Still / Sparkling Water Bottle", description: "330ml", price: "£2.50" },
      { name: "Still / Sparkling Water Bottle", description: "750ml", price: "£3.50" },
    ],
  },
];
