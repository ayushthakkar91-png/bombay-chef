"use server";

import { requireRole } from "@/lib/auth/dal";
import { getServiceClient } from "@/lib/supabase/clients";
import { markPrinted } from "@/lib/pos/orders";
import { LIVE_STATUSES } from "@/lib/ordering/constants";

/**
 * Printing from a PC instead of the Sunmi terminal.
 *
 * Same contract as the terminal: take paid orders that have not been printed,
 * print them, mark them printed. Because both write `printed_at` through
 * markPrinted(), a kitchen can run one, the other, or both without printing a
 * ticket twice.
 */

export type PrintTicket = {
  id: string;
  code: string;
  fulfilment: "collection" | "delivery";
  placedAt: string;
  contactName: string | null;
  contactPhone: string | null;
  address: string | null;
  notes: string | null;
  /** Paid by card already, or cash to collect on handover. */
  cash: boolean;
  subtotalPence: number;
  deliveryFeePence: number;
  discountPence: number;
  promoCode: string | null;
  totalPence: number;
  items: { name: string; qty: number; notes: string | null; modifiers: string[] }[];
};

type ModifierRow = { name?: string };

/** Orders waiting for paper, oldest first — the order they should be cooked in. */
export async function listPrintQueue(locationId: string): Promise<PrintTicket[]> {
  await requireRole("staff", locationId);

  const supabase = getServiceClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("orders")
    .select(
      "id, code, fulfilment, placed_at, created_at, contact_name, contact_phone, delivery_address, notes, " +
        "subtotal_pence, delivery_fee_pence, discount_pence, promo_code, total_pence, " +
        "order_items(name, qty, notes, modifiers), payments(method, status)",
    )
    .eq("location_id", locationId)
    .in("status", LIVE_STATUSES)
    .is("printed_at", null)
    .order("created_at", { ascending: true })
    .limit(20);

  // Cast as the repositories do: a select built by concatenation defeats
  // supabase-js's string-literal row inference.
  return ((data as Record<string, unknown>[] | null) ?? []).map((r) => {
    const a = (r.delivery_address as Record<string, string> | null) ?? null;
    const pays = (Array.isArray(r.payments) ? r.payments : r.payments ? [r.payments] : []) as {
      method?: string | null;
      status?: string | null;
    }[];

    return {
      id: r.id as string,
      code: r.code as string,
      fulfilment: r.fulfilment as "collection" | "delivery",
      placedAt: (r.placed_at as string) ?? (r.created_at as string),
      contactName: (r.contact_name as string | null) ?? null,
      contactPhone: (r.contact_phone as string | null) ?? null,
      address: a ? [a.line1, a.line2, a.city, a.postcode].filter(Boolean).join(", ") : null,
      notes: (r.notes as string | null) ?? null,
      cash: pays.some((p) => p.method === "cash"),
      subtotalPence: (r.subtotal_pence as number) ?? 0,
      deliveryFeePence: (r.delivery_fee_pence as number) ?? 0,
      discountPence: (r.discount_pence as number) ?? 0,
      promoCode: (r.promo_code as string | null) ?? null,
      totalPence: (r.total_pence as number) ?? 0,
      items: ((r.order_items as Record<string, unknown>[] | null) ?? []).map((i) => ({
        name: i.name as string,
        qty: (i.qty as number) ?? 1,
        notes: (i.notes as string | null) ?? null,
        modifiers: (((i.modifiers as ModifierRow[] | null) ?? []).map((m) => m.name ?? "").filter(Boolean)),
      })),
    };
  });
}

/**
 * Record that paper came out.
 *
 * Called only after the browser's print dialog has returned, never before —
 * marking first would lose the ticket if printing failed, and an unprinted
 * order is recoverable where a wrongly-marked one is not.
 */
export async function markTicketPrinted(orderId: string, locationId: string): Promise<{ ok: boolean }> {
  await requireRole("staff", locationId);
  return { ok: await markPrinted(orderId, locationId) };
}
