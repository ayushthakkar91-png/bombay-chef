"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";

import { getServiceClient } from "@/lib/supabase/clients";
import { requireRole } from "@/lib/auth/dal";
import { priceCart, type PriceResult } from "@/lib/ordering/pricing";
import { checkDelivery } from "@/lib/ordering/delivery";
import { confirmPaidOrder } from "@/lib/ordering/confirm";
import { recordOrderEvent } from "@/lib/ordering/events";
import { dispatchDue } from "@/lib/notifications/outbox";
import { dispatchTelegramDue } from "@/lib/notifications/telegram-dispatch";
import type { CartLineInput } from "@/lib/ordering/types";
import type { Fulfilment } from "@/lib/ordering/constants";
import { EMAIL_RE } from "@/lib/patterns";

/**
 * Orders taken over the phone, typed in by staff.
 *
 * A phone order IS an order. It goes through the same pricing as the website
 * (priceCart — there is no second price list), the same confirmation
 * (confirmPaidOrder — same payments row, same daily number, same Telegram
 * alert), and prints on the same ticket. What differs: who typed it, how it is
 * paid, and that none of the website's bot checks, rate limits or opening-hours
 * gates apply — a member of staff on the phone is the gate.
 */

export type PhoneOrderInput = {
  locationId: string;
  locationSlug: string;
  fulfilment: Fulfilment;
  lines: CartLineInput[];
  contact: { name: string; phone: string; email?: string };
  deliveryAddress?: { line1: string; line2?: string; city: string; postcode: string };
  notes?: string;
  /** cash at the door or counter; card taken on the shop's own terminal. */
  payment: "cash" | "terminal";
  /** One per attempt from the browser, so a double-click cannot place two. */
  idempotencyKey: string;
};

export type PhoneOrderResult =
  | { ok: true; code: string; dailySeq: number | null; totalPence: number }
  | { ok: false; error: string };

/** Live totals while staff build the order. Staff-gated, no opening-hours gate. */
export async function pricePhoneOrder(input: {
  locationId: string;
  locationSlug: string;
  fulfilment: Fulfilment;
  lines: CartLineInput[];
  postcode?: string | null;
}): Promise<PriceResult> {
  await requireRole("staff", input.locationId);
  const fee = await deliveryFeeFor(input.locationSlug, input.fulfilment, input.postcode);
  if (fee.error) return { ok: false, error: fee.error };
  return priceCart(input.locationId, input.fulfilment, input.lines, null, null, fee.pence);
}

/**
 * What we already know about this phone number, from their last order —
 * the name and address so staff do not retype them while the caller waits.
 */
export async function lookupPhoneCustomer(phone: string): Promise<{
  name: string;
  email: string | null;
  address: { line1: string; line2: string; city: string; postcode: string } | null;
  orders: number;
} | null> {
  await requireRole("staff");
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 7) return null;
  const supabase = getServiceClient();
  if (!supabase) return null;

  // Match on the last 9 digits so "07771 976993", "+44 7771976993" and
  // "0044 7771 976993" all find the same person.
  const tail = digits.slice(-9);
  const { data, count } = await supabase
    .from("orders")
    .select("contact_name, contact_email, delivery_address, placed_at", { count: "exact" })
    .ilike("contact_phone", `%${tail}`)
    .not("placed_at", "is", null)
    .order("placed_at", { ascending: false })
    .limit(1);
  const last = data?.[0];
  if (!last) return null;
  const a = (last.delivery_address as Record<string, string> | null) ?? null;
  return {
    name: (last.contact_name as string) ?? "",
    email: (last.contact_email as string | null) ?? null,
    address: a?.line1 ? { line1: a.line1, line2: a.line2 ?? "", city: a.city ?? "London", postcode: a.postcode ?? "" } : null,
    orders: count ?? 0,
  };
}

export async function placePhoneOrder(input: PhoneOrderInput): Promise<PhoneOrderResult> {
  const ctx = await requireRole("staff", input.locationId);
  const supabase = getServiceClient();
  if (!supabase) return { ok: false, error: "Database not connected." };

  // ---- What was typed --------------------------------------------------
  const name = input.contact.name.trim();
  const phone = input.contact.phone.trim();
  const email = input.contact.email?.trim() ?? "";
  if (!name) return { ok: false, error: "Who is the order for? A name is needed on the ticket." };
  if (phone.replace(/\D/g, "").length < 7) return { ok: false, error: "A phone number is needed, in case the driver has to call." };
  if (email && !EMAIL_RE.test(email)) return { ok: false, error: "That email address does not look right. Leave it blank if they did not give one." };
  if (!input.lines.length) return { ok: false, error: "Nothing in the order yet." };
  if (!/^[0-9a-f-]{20,}$/i.test(input.idempotencyKey)) return { ok: false, error: "Please refresh the page and try again." };

  const address = input.fulfilment === "delivery" ? input.deliveryAddress : undefined;
  if (input.fulfilment === "delivery") {
    if (!address?.line1?.trim() || !address.postcode?.trim()) {
      return { ok: false, error: "A delivery needs a first line of address and a postcode." };
    }
  }

  // ---- The same arithmetic as the website -------------------------------
  const fee = await deliveryFeeFor(input.locationSlug, input.fulfilment, address?.postcode);
  if (fee.error) return { ok: false, error: fee.error };
  const price = await priceCart(input.locationId, input.fulfilment, input.lines, null, null, fee.pence);
  if (!price.ok) return { ok: false, error: price.error };

  // ---- A double-click places one order, not two ------------------------
  const { data: existing } = await supabase
    .from("orders")
    .select("code, daily_seq, total_pence")
    .eq("idempotency_key", input.idempotencyKey)
    .maybeSingle();
  if (existing) {
    return { ok: true, code: existing.code as string, dailySeq: (existing.daily_seq as number | null) ?? null, totalPence: existing.total_pence as number };
  }

  // ---- The order itself ---------------------------------------------------
  const { data: order, error } = await supabase
    .from("orders")
    .insert({
      location_id: input.locationId,
      customer_id: null,
      idempotency_key: input.idempotencyKey,
      fulfilment: input.fulfilment,
      status: "pending_payment",
      source: "phone",
      taken_by: ctx.userId,
      taken_by_name: ctx.fullName ?? ctx.email ?? "staff",
      // Cash is collected at the door or counter. A card on the shop's own
      // terminal is paid before the kitchen sees it, which is all the ticket
      // needs to know — the payments row records that it was the terminal.
      payment_method: input.payment === "cash" ? "cash" : "card",
      subtotal_pence: price.subtotalPence,
      discount_pence: price.discountPence,
      delivery_fee_pence: price.deliveryFeePence,
      total_pence: price.totalPence,
      promo_code: null,
      gift_card_id: null,
      gift_card_pence: 0,
      prep_time_min: price.etaMin,
      scheduled_for: null,
      delivery_address: address ? { line1: address.line1.trim(), line2: address.line2?.trim() ?? "", city: address.city?.trim() || "London", postcode: address.postcode.trim().toUpperCase() } : null,
      contact_name: name,
      contact_email: email || null,
      contact_phone: phone,
      notes: input.notes?.trim() || null,
      marketing_opt_in: false,
    })
    .select("id, code")
    .single();

  if (error || !order) {
    console.error("[phone-order] could not create order", error);
    return { ok: false, error: "The order could not be saved — please try again." };
  }
  const orderId = order.id as string;

  await recordOrderEvent(orderId, "ORDER_CREATED", {
    code: order.code,
    totalPence: price.totalPence,
    fulfilment: input.fulfilment,
    source: "phone",
    takenBy: ctx.fullName ?? ctx.email,
  });

  const { error: itemsError } = await supabase.from("order_items").insert(
    price.lines.map((l) => ({
      order_id: orderId,
      item_id: l.itemId,
      name: l.name,
      unit_price_pence: l.unitPence,
      qty: l.qty,
      modifiers: l.modifiers.map((m) => ({ id: m.id, name: m.name, price_delta_pence: m.pricePence })),
      line_total_pence: l.lineTotalPence,
      notes: l.notes ?? null,
    })),
  );
  if (itemsError) {
    // No ticket for an order with no dishes on it. Cancel rather than leave a
    // blank order in the kitchen's list.
    console.error("[phone-order] could not save order lines", itemsError);
    await supabase.from("orders").update({ status: "cancelled" }).eq("id", orderId);
    return { ok: false, error: "The dishes could not be saved — please try again." };
  }

  // ---- Confirm: same path as a web order --------------------------------
  // Sets status paid (the daily number is assigned here, by trigger), writes
  // the payments row, queues the kitchen's alerts.
  const confirmed = await confirmPaidOrder(orderId, {
    method: input.payment === "cash" ? "cash" : "terminal",
    amountPence: price.totalPence,
    paymentIntent: null,
  });
  if (!confirmed) {
    console.error("[phone-order] could not confirm order", orderId);
    return { ok: false, error: "The order was saved but could not be confirmed. Check Live orders." };
  }

  // Phone orders never touch Stripe, so flush the outbox now rather than wait
  // for a webhook that is not coming.
  after(async () => { await Promise.allSettled([dispatchDue(), dispatchTelegramDue()]); });

  const { data: placed } = await supabase.from("orders").select("daily_seq").eq("id", orderId).maybeSingle();

  revalidatePath("/admin/orders");
  revalidatePath("/admin/orders/live");
  return { ok: true, code: order.code as string, dailySeq: (placed?.daily_seq as number | null) ?? null, totalPence: price.totalPence };
}

/** The distance-tiered delivery fee for a postcode, or an error if we do not deliver there. */
async function deliveryFeeFor(locationSlug: string, fulfilment: Fulfilment, postcode?: string | null): Promise<{ pence: number | null; error?: string }> {
  if (fulfilment !== "delivery") return { pence: null };
  if (!postcode?.trim()) return { pence: null };
  const check = await checkDelivery(locationSlug, postcode);
  if (!check.served) return { pence: null, error: check.error || "We do not deliver to that postcode from this branch." };
  return { pence: check.feePence ?? null };
}
