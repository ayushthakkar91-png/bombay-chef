"use client";

import { useEffect, useRef, useState } from "react";

import type { OrderingMenu, OrderMenuItem } from "@/lib/repositories/ordering-menu";
import type { CartLine } from "@/lib/ordering/types";
import { useOrder } from "./OrderProvider";

/**
 * Reconnect a saved basket to the current menu.
 *
 * A basket lives in the browser indefinitely, so it outlives the menu it was
 * built from. A rebuild deletes and recreates rows, so the dish and the option
 * are still on sale under the same names with the same prices — only their ids
 * changed. The basket still points at the old ids, the server cannot price it,
 * and the customer could not check out at all.
 *
 * None of which is the customer's doing, so they should not pay for it with a
 * lost basket. Lines are REPAIRED by name: the dish is found by name, each
 * option by name within that dish, and the line re-pointed at the ids the menu
 * has today.
 *
 * This is not a guess about money. Matching is on exact names within the same
 * dish, and the server prices every order from the database regardless — a
 * repaired line is charged at today's price, not the one saved in the browser.
 * Only something genuinely off the menu is removed, and then we say so.
 */

type Resolved = { itemId: string; modifiers: { id: string; name: string; pricePence: number }[] } | null;

/** The same dish and options as this line, as the menu has them now. */
export function resolveLine(line: CartLine, byId: Map<string, OrderMenuItem>, byName: Map<string, OrderMenuItem>): Resolved {
  const item = byId.get(line.itemId) ?? byName.get(line.name.trim().toLowerCase());
  if (!item) return null;

  const options = new Map<string, { id: string; name: string; pricePence: number }>();
  const optionsByName = new Map<string, { id: string; name: string; pricePence: number }>();
  for (const group of item.modifierGroups) {
    for (const o of group.options) {
      const entry = { id: o.id, name: o.name, pricePence: o.priceDeltaPence };
      options.set(o.id, entry);
      optionsByName.set(o.name.trim().toLowerCase(), entry);
    }
  }

  const modifiers: { id: string; name: string; pricePence: number }[] = [];
  for (const m of line.modifiers) {
    const found = options.get(m.id) ?? optionsByName.get(m.name.trim().toLowerCase());
    if (!found) return null; // that option really is gone
    modifiers.push(found);
  }

  return { itemId: item.id, modifiers };
}

export function useBasketReconcile(menu: OrderingMenu): { removed: string[]; dismiss: () => void } {
  const { lines, removeLine, addLine } = useOrder();
  const [removed, setRemoved] = useState<string[]>([]);
  // Once per mount. Re-running as the basket changes would fight the customer
  // while they are adding things.
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;

    // After paint: pruning during the effect body is a synchronous setState in
    // an effect, which cascades a render before the first has been shown.
    const run = requestAnimationFrame(() => {
      const byId = new Map<string, OrderMenuItem>();
      const byName = new Map<string, OrderMenuItem>();
      for (const cat of menu.categories) {
        for (const item of cat.items) {
          byId.set(item.id, item);
          byName.set(item.name.trim().toLowerCase(), item);
        }
      }

      const gone: string[] = [];

      for (const line of lines) {
        const next = resolveLine(line, byId, byName);

        if (!next) {
          gone.push(line.name);
          removeLine(line.key);
          continue;
        }

        const sameItem = next.itemId === line.itemId;
        const sameMods =
          next.modifiers.length === line.modifiers.length &&
          next.modifiers.every((m, i) => m.id === line.modifiers[i].id);
        if (sameItem && sameMods) continue; // already current

        // Re-point at today's ids, keeping quantity and any note. Silent: from
        // the customer's side nothing changed, because nothing they chose did.
        removeLine(line.key);
        addLine({
          itemId: next.itemId,
          name: line.name,
          basePence: line.basePence,
          modifiers: next.modifiers,
          notes: line.notes,
          qty: line.qty,
        });
      }

      if (gone.length > 0) setRemoved(gone);
    });

    return () => cancelAnimationFrame(run);
    // `lines`, `removeLine` and `addLine` change identity as the cart does;
    // this runs once on mount by design, guarded above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menu]);

  return { removed, dismiss: () => setRemoved([]) };
}
