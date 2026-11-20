"use client";

import type { OrderingMenu } from "@/lib/repositories/ordering-menu";
import { useBasketReconcile } from "./useBasketReconcile";

/**
 * Tells the customer which saved dishes the menu no longer has.
 *
 * Shown at the top of the ordering pages, once, when a basket built against
 * an older menu is loaded. Says what went and why, rather than leaving the
 * basket quietly shorter than it was.
 */
export function BasketNotice({ menu }: { menu: OrderingMenu }) {
  const { removed, dismiss } = useBasketReconcile(menu);
  if (removed.length === 0) return null;

  const names = [...new Set(removed)];
  return (
    <div
      role="status"
      className="mx-auto mb-4 flex max-w-[1200px] flex-wrap items-center gap-x-3 gap-y-1 border border-[#B08A3E]/40 bg-[#FBF7EE] px-4 py-3 font-sans text-[13.5px] text-[#2B221D]"
    >
      {/* Only shown for something genuinely off the menu. A dish that merely
          changed id is repaired without a word, because from the customer's
          side nothing they chose has changed. */}
      <span>
        Sorry — <strong>{names.join(", ")}</strong>{" "}
        {names.length === 1 ? "is no longer on our menu" : "are no longer on our menu"}, so{" "}
        {names.length === 1 ? "it has" : "they have"} been taken out of your basket. Everything else is still there.
      </span>
      <button
        type="button"
        onClick={dismiss}
        className="ml-auto text-[#5A524B] underline underline-offset-2 hover:text-[#2B221D]"
      >
        Got it
      </button>
    </div>
  );
}
