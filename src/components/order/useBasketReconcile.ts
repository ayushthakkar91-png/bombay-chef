"use client";

import { useEffect, useRef, useState } from "react";

import type { OrderingMenu } from "@/lib/repositories/ordering-menu";
import type { CartLine } from "@/lib/ordering/types";
import { useOrder } from "./OrderProvider";

/**
 * Drop basket lines the menu no longer has.
 *
 * A basket lives in the browser indefinitely, so it outlives the menu it was
 * built from. A dish withdrawn, or an option deleted and recreated with a new
 * id — which is what a menu rebuild does — leaves a line pointing at something
 * gone. The server then refuses to price the basket, and the customer finds
 * out at CHECKOUT, after the address and with the card in hand, from a message
 * that cannot tell them which of six dishes is at fault.
 *
 * Checked here instead, against the menu already on the page, when the page
 * loads. The customer is told once, at the top of the journey, and can carry
 * on with the rest of their basket.
 *
 * Nothing is guessed. The dead line is removed, not matched to a
 * similar-looking option by name — a wrong guess means charging somebody for
 * an option they did not pick, and that argument happens at the door.
 */
export function useBasketReconcile(menu: OrderingMenu): { removed: string[]; dismiss: () => void } {
  const { lines, removeLine } = useOrder();
  const [removed, setRemoved] = useState<string[]>([]);
  // Once per mount. Re-running as the basket changes would fight the customer
  // while they are adding things.
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;

    // After paint. Pruning during the effect body is a synchronous setState
    // in an effect, which cascades a render before the first has been shown.
    const run = requestAnimationFrame(() => {
    const items = new Map<string, Set<string>>();
    for (const cat of menu.categories) {
      for (const item of cat.items) {
        const optionIds = new Set<string>();
        for (const group of item.modifierGroups) for (const o of group.options) optionIds.add(o.id);
        items.set(item.id, optionIds);
      }
    }

    const stale = lines.filter((l: CartLine) => {
      const options = items.get(l.itemId);
      if (!options) return true; // the dish itself is gone
      return l.modifiers.some((m) => !options.has(m.id)); // an option is gone
    });

      if (stale.length === 0) return;
      for (const l of stale) removeLine(l.key);
      setRemoved(stale.map((l) => l.name));
    });
    return () => cancelAnimationFrame(run);
    // `lines` and `removeLine` change identity as the cart does; this runs once
    // on mount by design, guarded above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menu]);

  return { removed, dismiss: () => setRemoved([]) };
}
