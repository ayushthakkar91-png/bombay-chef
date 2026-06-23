"use client";

import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";

import { useOrder } from "@/components/order/OrderProvider";
import type { AccountOrderItem } from "@/lib/repositories/account";

/**
 * Rebuilds the cart from a past order and sends the customer to that location's
 * menu. Items whose dish was removed are skipped; modifiers that predate id
 * storage are dropped (the base dish is still reordered).
 */
export function ReorderButton({ locationSlug, items }: { locationSlug: string; items: AccountOrderItem[] }) {
  const router = useRouter();
  const { setLocation, addLine } = useOrder();

  const reorder = () => {
    setLocation(locationSlug); // clears any existing cart for a clean reorder
    for (const it of items) {
      if (!it.itemId) continue;
      const allModsTotal = it.modifiers.reduce((s, m) => s + m.pricePence, 0);
      const basePence = it.unitPence - allModsTotal;
      const modifiers = it.modifiers
        .filter((m): m is { id: string; name: string; pricePence: number } => Boolean(m.id))
        .map((m) => ({ id: m.id, name: m.name, pricePence: m.pricePence }));
      addLine({ itemId: it.itemId, name: it.name, basePence, modifiers, qty: it.qty, notes: it.notes ?? undefined });
    }
    router.push(`/order/menu?loc=${locationSlug}`);
  };

  if (!locationSlug || items.every((i) => !i.itemId)) return null;

  return (
    <button
      onClick={reorder}
      className="inline-flex items-center justify-center gap-2 h-[48px] px-7 bg-[#B08A3E] text-[#2A211C] text-[12px] tracking-[0.15em] uppercase font-sans hover:bg-[#2A211C] hover:text-[#F6F2EA] transition-colors duration-500"
    >
      <RotateCcw className="h-4 w-4" /> Reorder
    </button>
  );
}
