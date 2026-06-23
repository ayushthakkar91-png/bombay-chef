import type { Fulfilment } from "./constants";

/** A chosen modifier on a cart line (snapshot of id/name/price for display). */
export type CartModifier = { id: string; name: string; pricePence: number };

/**
 * A cart line as held in client state. Prices here are display-only — the
 * server recomputes authoritative prices from the database at checkout
 * (`priceCart`), keyed by `itemId` + modifier ids. `key` distinguishes the same
 * dish with different modifier/notes combinations.
 */
export type CartLine = {
  key: string;
  itemId: string;
  name: string;
  basePence: number;
  modifiers: CartModifier[];
  qty: number;
  notes?: string;
};

export type CartState = {
  locationSlug: string | null;
  fulfilment: Fulfilment;
  postcode: string | null;
  lines: CartLine[];
  promoCode: string | null;
};

/** Wire shape sent to the server for pricing/checkout (no trusted prices). */
export type CartLineInput = {
  itemId: string;
  modifierIds: string[];
  qty: number;
  notes?: string;
};
