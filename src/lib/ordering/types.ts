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
  /**
   * The option NAMES the customer picked, in the same order as modifierIds.
   *
   * Only used to recover when an id no longer exists: a menu rebuild deletes
   * and recreates rows, so a basket saved in a browser points at ids that are
   * gone while the dish and the option are still on sale under the same names.
   * The server then re-finds the option by name on that dish and prices it at
   * today's price.
   *
   * Carries no price and grants nothing — a name is only ever matched against
   * options that belong to the dish being ordered, and the amount charged
   * always comes from the database.
   */
  modifierNames?: string[];
  qty: number;
  notes?: string;
};
