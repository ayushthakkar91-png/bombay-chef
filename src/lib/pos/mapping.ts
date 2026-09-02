import "server-only";

import { ORDER_TRANSITIONS, type Fulfilment, type OrderStatus } from "@/lib/ordering/constants";

const money = (pence: number | null | undefined) => (pence ?? 0) / 100;

export function bbcStatusToApp(s: OrderStatus): "pending" | "preparing" | "ready" {
  switch (s) {
    case "paid": return "pending";
    case "accepted":
    case "preparing": return "preparing";
    case "ready_for_collection":
    case "out_for_delivery": return "ready";
    default: return "ready";
  }
}

/** Map an app status button to the BBC target status. Returns null if unknown. */
export function appStatusToBbc(appStatus: string, fulfilment: Fulfilment): OrderStatus | null {
  if (appStatus === "preparing") return "accepted"; // ACCEPT button
  if (appStatus === "ready") return fulfilment === "delivery" ? "out_for_delivery" : "ready_for_collection";
  return null;
}

/**
 * Ordered list of statuses to step THROUGH (excluding `from`, including `to`)
 * to walk `from` forward to `to` along the happy path only — a BFS over
 * ORDER_TRANSITIONS that prunes the "cancelled"/"refunded" side-transitions,
 * since the POS must never auto-advance an order into either of those.
 * Returns null if `to` isn't forward-reachable from `from` this way.
 */
export function forwardStatusPath(from: OrderStatus, to: OrderStatus): OrderStatus[] | null {
  if (from === to) return [];
  const seen = new Set<OrderStatus>([from]);
  const queue: OrderStatus[][] = [[from]];
  while (queue.length) {
    const path = queue.shift()!;
    const last = path[path.length - 1];
    for (const next of ORDER_TRANSITIONS[last] ?? []) {
      if (next === "cancelled" || next === "refunded") continue; // never auto-advance into these
      if (seen.has(next)) continue;
      const nextPath = [...path, next];
      if (next === to) return nextPath.slice(1);
      seen.add(next);
      queue.push(nextPath);
    }
  }
  return null;
}

type OrderItemRow = {
  name: string;
  qty: number;
  line_total_pence: number;
  notes: string | null;
  modifiers: { name: string }[] | null;
};

type OrderRow = {
  id: string;
  code: string;
  status: OrderStatus;
  fulfilment: Fulfilment;
  contact_name: string | null;
  total_pence: number;
  subtotal_pence: number;
  delivery_fee_pence: number;
  discount_pence: number;
  promo_code: string | null;
  notes: string | null;
  delivery_address: Record<string, string> | null;
  placed_at: string | null;
  created_at: string;
  printed_at: string | null;
};

/** BBC order → the JSON shape the Kotlin app already parses. Money in pounds. */
export function orderToPosJson(order: OrderRow, items: OrderItemRow[]): Record<string, unknown> {
  const a = order.delivery_address ?? {};
  return {
    _id: order.id,
    orderNumber: order.code,
    customerName: order.contact_name ?? "Guest",
    totalPrice: money(order.total_pence),
    status: bbcStatusToApp(order.status),
    isPrinted: order.printed_at != null,
    paymentStatus: "paid", // POS only ever sees paid orders
    orderType: order.fulfilment, // "collection" | "delivery" — app's isDelivery() matches
    createdAt: order.placed_at ?? order.created_at,
    subtotal: money(order.subtotal_pence),
    deliveryFee: money(order.delivery_fee_pence),
    discount: money(order.discount_pence),
    promoCode: order.promo_code ?? "",
    specialInstructions: order.notes ?? "",
    deliveryAddress: order.fulfilment === "delivery" ? {
      street: [a.line1, a.line2].filter(Boolean).join(", "),
      city: a.city ?? "",
      postalCode: a.postcode ?? "",
      notes: "",
    } : null,
    orderItems: items.map((it) => ({
      quantity: it.qty,
      productName: it.name,
      price: money(it.line_total_pence),
      specialInstructions: it.notes ?? "",
      // BBC modifiers → the app's "selectedToppings" line ("+ a, b" on receipt).
      selectedToppings: (it.modifiers ?? []).map((m) => ({ name: m.name, quantity: 1 })),
    })),
  };
}
