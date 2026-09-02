import "server-only";

import { getServiceClient } from "@/lib/supabase/clients";
import type { Fulfilment } from "./constants";
import type { CartLineInput } from "./types";

/**
 * Server-authoritative cart pricing. Clients send only item ids, modifier ids,
 * quantities and notes; every price is recomputed here from the database so a
 * tampered client can never change what is charged. Used by checkout and the
 * cart summary. Runs with the service client (public/guest ordering).
 */

export type PricedLine = {
  itemId: string;
  name: string;
  unitPence: number;
  qty: number;
  modifiers: { id: string; name: string; pricePence: number }[];
  lineTotalPence: number;
  notes?: string;
};

export type PriceResult =
  | {
      ok: true;
      locationId: string;
      fulfilment: Fulfilment;
      lines: PricedLine[];
      subtotalPence: number;
      discountPence: number;
      deliveryFeePence: number;
      totalPence: number;
      prepTimeMin: number;
      etaMin: number;
      minOrderPence: number;
      promoApplied: string | null;
      promoId: string | null;
    }
  | { ok: false; error: string };

const MAX_QTY = 50;

type LocationConfig = {
  id: string;
  delivery_enabled: boolean;
  collection_enabled: boolean;
  delivery_fee_pence: number;
  min_order_pence: number;
  prep_time_min: number;
  delivery_time_min: number;
  free_delivery_over_pence: number | null;
};

export async function priceCart(
  locationId: string,
  fulfilment: Fulfilment,
  lines: CartLineInput[],
  promoCode?: string | null,
  customerId?: string | null,
): Promise<PriceResult> {
  const supabase = getServiceClient();
  if (!supabase) return { ok: false, error: "Ordering is temporarily unavailable." };
  if (!lines.length) return { ok: false, error: "Your basket is empty." };

  const { data: loc } = await supabase
    .from("locations")
    .select("id, delivery_enabled, collection_enabled, delivery_fee_pence, min_order_pence, prep_time_min, delivery_time_min, free_delivery_over_pence")
    .eq("id", locationId)
    .eq("is_active", true)
    .maybeSingle();
  if (!loc) return { ok: false, error: "That location isn't available." };
  const config = loc as LocationConfig;

  if (fulfilment === "delivery" && !config.delivery_enabled) return { ok: false, error: "Delivery isn't available here." };
  if (fulfilment === "collection" && !config.collection_enabled) return { ok: false, error: "Collection isn't available here." };

  const itemIds = [...new Set(lines.map((l) => l.itemId))];
  const modifierIds = [...new Set(lines.flatMap((l) => l.modifierIds))];

  const [{ data: items }, { data: overrides }, { data: mods }] = await Promise.all([
    supabase.from("menu_items").select("id, name, price_pence, is_available").in("id", itemIds),
    supabase.from("location_menu_items").select("item_id, is_available, price_pence_override").eq("location_id", locationId).in("item_id", itemIds),
    modifierIds.length
      ? supabase.from("item_modifiers").select("id, item_id, name, price_delta_pence, is_available").in("id", modifierIds)
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
  ]);

  const itemMap = new Map((items ?? []).map((i) => [i.id as string, i]));
  const overrideMap = new Map((overrides ?? []).map((o) => [o.item_id as string, o]));
  const modMap = new Map((mods ?? []).map((m) => [m.id as string, m]));

  const priced: PricedLine[] = [];
  for (const line of lines) {
    const item = itemMap.get(line.itemId);
    if (!item) return { ok: false, error: "An item in your basket is no longer available." };

    const override = overrideMap.get(line.itemId);
    const available = item.is_available !== false && (override?.is_available ?? true) !== false;
    if (!available) return { ok: false, error: `“${item.name}” is no longer available.` };

    const basePence = (override?.price_pence_override as number | null) ?? (item.price_pence as number | null);
    if (basePence == null) return { ok: false, error: `“${item.name}” can't be ordered online yet.` };

    const qty = Math.max(1, Math.min(MAX_QTY, Math.trunc(line.qty)));
    const chosen: { id: string; name: string; pricePence: number }[] = [];
    for (const mid of line.modifierIds) {
      const m = modMap.get(mid);
      if (!m || m.item_id !== line.itemId || m.is_available === false) {
        return { ok: false, error: "A selected option is no longer available." };
      }
      chosen.push({ id: m.id as string, name: m.name as string, pricePence: (m.price_delta_pence as number) ?? 0 });
    }

    const unitPence = basePence + chosen.reduce((s, m) => s + m.pricePence, 0);
    priced.push({
      itemId: line.itemId,
      name: item.name as string,
      unitPence,
      qty,
      modifiers: chosen,
      lineTotalPence: unitPence * qty,
      notes: line.notes?.slice(0, 200),
    });
  }

  const subtotalPence = priced.reduce((s, l) => s + l.lineTotalPence, 0);

  if (fulfilment === "delivery" && subtotalPence < config.min_order_pence) {
    return { ok: false, error: `The minimum delivery order is £${(config.min_order_pence / 100).toFixed(2)}.` };
  }

  let deliveryFeePence = fulfilment === "delivery" ? config.delivery_fee_pence : 0;
  // Free delivery once the subtotal reaches the branch's threshold (if set).
  if (
    fulfilment === "delivery" &&
    config.free_delivery_over_pence != null &&
    subtotalPence >= config.free_delivery_over_pence
  ) {
    deliveryFeePence = 0;
  }

  // Promo
  let discountPence = 0;
  let promoApplied: string | null = null;
  let promoId: string | null = null;
  if (promoCode?.trim()) {
    const result = await applyPromo(promoCode.trim(), subtotalPence, deliveryFeePence, locationId, customerId ?? null);
    if (result.error) return { ok: false, error: result.error };
    discountPence = result.discountPence;
    if (result.freesDelivery) deliveryFeePence = 0;
    promoApplied = result.code;
    promoId = result.promoId;
  }

  const totalPence = Math.max(0, subtotalPence - discountPence + deliveryFeePence);
  const etaMin = fulfilment === "delivery" ? config.prep_time_min + config.delivery_time_min : config.prep_time_min;

  return {
    ok: true,
    locationId,
    fulfilment,
    lines: priced,
    subtotalPence,
    discountPence,
    deliveryFeePence,
    totalPence,
    prepTimeMin: config.prep_time_min,
    etaMin,
    minOrderPence: config.min_order_pence,
    promoApplied,
    promoId,
  };
}

type PromoResult = { discountPence: number; freesDelivery: boolean; code: string | null; promoId: string | null; error?: string };

async function applyPromo(
  code: string,
  subtotalPence: number,
  deliveryFeePence: number,
  locationId: string,
  customerId: string | null,
): Promise<PromoResult> {
  const supabase = getServiceClient();
  if (!supabase) return { discountPence: 0, freesDelivery: false, code: null, promoId: null };

  // Exact, case-insensitive match. Codes are stored/entered uppercase, so
  // uppercasing the input lets us use .eq (not .ilike): a raw user string in an
  // ilike pattern would let `_`/`%` act as wildcards and match codes the user
  // shouldn't be able to guess. .eq treats the input as a literal.
  const { data: promo } = await supabase
    .from("promo_codes")
    .select("id, code, kind, value, min_spend_pence, global_limit, used_count, location_id, customer_id, starts_at, ends_at, is_active")
    .eq("code", code.toUpperCase())
    .maybeSingle();

  const invalid: PromoResult = { discountPence: 0, freesDelivery: false, code: null, promoId: null, error: "That promo code isn't valid." };
  if (!promo || !promo.is_active) return invalid;

  // F4: a personal voucher (customer_id set) is usable ONLY by its owner. Guests
  // (customerId null) can never redeem a personal code. Returning the generic
  // "isn't valid" message avoids leaking which codes are personal.
  if (promo.customer_id && promo.customer_id !== customerId) return invalid;

  const now = Date.now();
  const fail = (error: string): PromoResult => ({ discountPence: 0, freesDelivery: false, code: null, promoId: null, error });
  if (promo.starts_at && new Date(promo.starts_at as string).getTime() > now) return fail("That promo code isn't active yet.");
  if (promo.ends_at && new Date(promo.ends_at as string).getTime() < now) return fail("That promo code has expired.");
  if (promo.location_id && promo.location_id !== locationId) return fail("That code isn't valid for this location.");
  if (promo.global_limit != null && (promo.used_count as number) >= (promo.global_limit as number)) return fail("That promo code has been fully redeemed.");
  if (subtotalPence < (promo.min_spend_pence as number)) {
    return fail(`Spend at least £${((promo.min_spend_pence as number) / 100).toFixed(2)} to use this code.`);
  }

  const promoId = promo.id as string;
  const kind = promo.kind as string;
  const value = promo.value as number;
  if (kind === "free_delivery") return { discountPence: 0, freesDelivery: true, code: promo.code as string, promoId };
  if (kind === "percent") return { discountPence: Math.min(subtotalPence, Math.round((subtotalPence * value) / 100)), freesDelivery: false, code: promo.code as string, promoId };
  // fixed
  return { discountPence: Math.min(subtotalPence, value), freesDelivery: false, code: promo.code as string, promoId };
}
