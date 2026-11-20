import { describe, it, expect } from "vitest";

import { resolveLine } from "./useBasketReconcile";
import type { OrderMenuItem } from "@/lib/repositories/ordering-menu";
import type { CartLine } from "@/lib/ordering/types";

/** Plain Rice as the menu has it TODAY, after a rebuild gave it new ids. */
const rice: OrderMenuItem = {
  id: "item-new",
  name: "Plain Rice (V)",
  description: null,
  pricePence: 335,
  imageUrl: null,
  spiceLevel: null,
  dietary: [],
  allergens: [],
  modifierGroups: [
    {
      id: "grp-new",
      name: "Size",
      minSelect: 1,
      maxSelect: 1,
      options: [
        { id: "opt-reg-new", name: "Regular", priceDeltaPence: 0, isDefault: true },
        { id: "opt-lrg-new", name: "Large", priceDeltaPence: 200, isDefault: false },
      ],
    },
  ],
};

const menu = (items: OrderMenuItem[]) => {
  const byId = new Map(items.map((i) => [i.id, i]));
  const byName = new Map(items.map((i) => [i.name.trim().toLowerCase(), i]));
  return { byId, byName };
};

/** A basket saved BEFORE that rebuild: same dish, same option, dead ids. */
const savedLine: CartLine = {
  key: "k1",
  itemId: "item-old",
  name: "Plain Rice (V)",
  basePence: 335,
  qty: 2,
  modifiers: [{ id: "opt-reg-old", name: "Regular", pricePence: 0 }],
  notes: undefined,
};

describe("reconnecting a saved basket to the current menu", () => {
  const { byId, byName } = menu([rice]);

  it("repairs a line whose ids changed in a menu rebuild", () => {
    // The customer could not check out at all: the dish and the option were
    // both still on sale, under the same names, at the same price.
    const got = resolveLine(savedLine, byId, byName);
    expect(got).not.toBeNull();
    expect(got!.itemId).toBe("item-new");
    expect(got!.modifiers).toEqual([{ id: "opt-reg-new", name: "Regular", pricePence: 0 }]);
  });

  it("leaves a line that is already current completely alone", () => {
    const current: CartLine = {
      ...savedLine,
      itemId: "item-new",
      modifiers: [{ id: "opt-reg-new", name: "Regular", pricePence: 0 }],
    };
    const got = resolveLine(current, byId, byName);
    expect(got!.itemId).toBe("item-new");
    expect(got!.modifiers[0].id).toBe("opt-reg-new");
  });

  it("prefers the id when it still exists, rather than matching on name", () => {
    // Two dishes could share a name across a rebuild; an id that still
    // resolves is the better answer and is taken first.
    const twin: OrderMenuItem = { ...rice, id: "item-twin" };
    const m = menu([twin, rice]);
    const line: CartLine = { ...savedLine, itemId: "item-twin" };
    expect(resolveLine(line, m.byId, m.byName)!.itemId).toBe("item-twin");
  });

  it("gives up on a dish that is genuinely off the menu", () => {
    const line: CartLine = { ...savedLine, itemId: "gone", name: "Discontinued Curry" };
    expect(resolveLine(line, byId, byName)).toBeNull();
  });

  it("gives up when an option is genuinely gone, rather than picking another", () => {
    // "Family size" was withdrawn. Substituting Regular or Large would charge
    // the customer for something they did not choose.
    const line: CartLine = {
      ...savedLine,
      modifiers: [{ id: "opt-family", name: "Family size", pricePence: 400 }],
    };
    expect(resolveLine(line, byId, byName)).toBeNull();
  });

  it("carries today's price, not the one saved in the browser", () => {
    // Large went up to £2.50 since this basket was saved. The repaired line
    // takes the menu's price; the server prices from the database regardless.
    const dearer: OrderMenuItem = {
      ...rice,
      modifierGroups: [
        { ...rice.modifierGroups[0], options: [{ id: "opt-lrg-new", name: "Large", priceDeltaPence: 250, isDefault: false }] },
      ],
    };
    const m = menu([dearer]);
    const line: CartLine = { ...savedLine, modifiers: [{ id: "opt-lrg-old", name: "Large", pricePence: 200 }] };
    expect(resolveLine(line, m.byId, m.byName)!.modifiers[0].pricePence).toBe(250);
  });

  it("matches names case-insensitively and ignoring stray spaces", () => {
    const line: CartLine = {
      ...savedLine,
      name: "  plain rice (v) ",
      modifiers: [{ id: "opt-x", name: "REGULAR", pricePence: 0 }],
    };
    expect(resolveLine(line, byId, byName)!.modifiers[0].id).toBe("opt-reg-new");
  });
});
