"use server";

import { getServiceClient } from "@/lib/supabase/clients";
import { priceCart, type PriceResult } from "@/lib/ordering/pricing";
import { checkDelivery, type DeliveryCheck } from "@/lib/ordering/delivery";
import { isStripeConfigured, createCheckoutSession } from "@/lib/stripe/client";
import { planRedemption } from "@/lib/giftcards/service";
import { confirmPaidOrder } from "@/lib/ordering/confirm";
import type { CartLineInput } from "@/lib/ordering/types";
import type { Fulfilment } from "@/lib/ordering/constants";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}

async function locationIdFromSlug(slug: string): Promise<string | null> {
  const supabase = getServiceClient();
  if (!supabase) return null;
  const { data } = await supabase.from("locations").select("id").eq("slug", slug).eq("is_active", true).maybeSingle();
  return data ? (data.id as string) : null;
}

/** Postcode → delivery availability + fee/min/ETA. */
export async function checkDeliveryAction(locationSlug: string, postcode: string): Promise<DeliveryCheck> {
  return checkDelivery(locationSlug, postcode);
}

/** Live, server-authoritative cart totals for the basket + checkout review. */
export async function priceCartAction(input: {
  locationSlug: string;
  fulfilment: Fulfilment;
  lines: CartLineInput[];
  promoCode?: string | null;
}): Promise<PriceResult> {
  const locationId = await locationIdFromSlug(input.locationSlug);
  if (!locationId) return { ok: false, error: "That location isn't available." };
  return priceCart(locationId, input.fulfilment, input.lines, input.promoCode);
}

export type CheckoutInput = {
  locationSlug: string;
  fulfilment: Fulfilment;
  lines: CartLineInput[];
  promoCode?: string | null;
  contact: { name: string; email: string; phone: string };
  deliveryAddress?: { line1: string; line2?: string; city: string; postcode: string };
  notes?: string;
  marketingOptIn?: boolean;
  giftCardCode?: string | null;
};

export type CheckoutResult = { ok: true; url: string } | { ok: false; error: string };

/** Validate a gift card code at checkout and return its balance. */
export async function checkGiftCard(code: string): Promise<{ ok: boolean; balancePence?: number; error?: string }> {
  if (!code?.trim()) return { ok: false };
  const plan = await planRedemption(code, 1_000_000);
  if ("error" in plan) return { ok: false, error: plan.error };
  return { ok: true, balancePence: plan.balancePence };
}

/**
 * Create a pending order + items from a server-priced cart and open a Stripe
 * hosted Checkout session. The order is only marked paid by the webhook — never
 * trust the client redirect. Card data never touches us (PCI SAQ A).
 */
export async function createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
  const name = input.contact?.name?.trim();
  const email = input.contact?.email?.trim();
  if (!name) return { ok: false, error: "Please enter your name." };
  if (!EMAIL_RE.test(email ?? "")) return { ok: false, error: "Please enter a valid email." };
  if (!input.contact?.phone?.trim()) return { ok: false, error: "Please enter a phone number." };

  if (!isStripeConfigured()) {
    return { ok: false, error: "Online payments aren't configured yet." };
  }

  const supabase = getServiceClient();
  if (!supabase) return { ok: false, error: "Ordering is temporarily unavailable." };

  const locationId = await locationIdFromSlug(input.locationSlug);
  if (!locationId) return { ok: false, error: "That location isn't available." };

  // Delivery must be to a served postcode.
  if (input.fulfilment === "delivery") {
    if (!input.deliveryAddress?.postcode || !input.deliveryAddress.line1 || !input.deliveryAddress.city) {
      return { ok: false, error: "Please enter your full delivery address." };
    }
    const check = await checkDelivery(input.locationSlug, input.deliveryAddress.postcode);
    if (!check.served) return { ok: false, error: check.error ?? "We don't deliver to that postcode." };
  }

  // Authoritative pricing.
  const price = await priceCart(locationId, input.fulfilment, input.lines, input.promoCode);
  if (!price.ok) return { ok: false, error: price.error };

  // Gift card redemption (partial balance). Applied after promo + delivery.
  let giftCardId: string | null = null;
  let giftRedeem = 0;
  if (input.giftCardCode?.trim()) {
    const plan = await planRedemption(input.giftCardCode, price.totalPence);
    if ("error" in plan) return { ok: false, error: plan.error };
    giftCardId = plan.giftCardId;
    giftRedeem = plan.redeemPence;
  }
  let chargePence = price.totalPence - giftRedeem;
  // Stripe's GBP minimum is 30p; if a tiny remainder is left, keep a little on the card.
  if (chargePence > 0 && chargePence < 30) {
    giftRedeem = Math.max(0, giftRedeem - (30 - chargePence));
    chargePence = price.totalPence - giftRedeem;
  }

  // Create the pending order.
  const { data: order, error } = await supabase
    .from("orders")
    .insert({
      location_id: locationId,
      fulfilment: input.fulfilment,
      status: "pending_payment",
      subtotal_pence: price.subtotalPence,
      discount_pence: price.discountPence,
      delivery_fee_pence: price.deliveryFeePence,
      total_pence: price.totalPence,
      promo_code: price.promoApplied,
      gift_card_id: giftCardId,
      gift_card_pence: giftRedeem,
      prep_time_min: price.etaMin,
      delivery_address: input.fulfilment === "delivery" ? input.deliveryAddress : null,
      contact_name: name,
      contact_email: email,
      contact_phone: input.contact.phone.trim(),
      notes: input.notes?.trim() || null,
      marketing_opt_in: Boolean(input.marketingOptIn),
    })
    .select("id, code, track_token")
    .single();

  if (error || !order) return { ok: false, error: "We couldn't start your order — please try again." };

  const orderId = order.id as string;

  await supabase.from("order_items").insert(
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

  // Fully covered by the gift card → no card payment; confirm immediately.
  if (chargePence <= 0) {
    await confirmPaidOrder(orderId, { method: "gift_card", amountPence: giftRedeem, paymentIntent: null });
    return { ok: true, url: `${siteUrl()}/order/track/${order.track_token as string}?paid=1` };
  }

  try {
    const session = await createCheckoutSession({
      amountPence: chargePence,
      orderCode: order.code as string,
      description: price.lines.map((l) => `${l.qty}× ${l.name}`).join(", "),
      successUrl: `${siteUrl()}/order/track/${order.track_token as string}?paid=1`,
      cancelUrl: `${siteUrl()}/order/checkout?canceled=1`,
      customerEmail: email,
      metadata: { order_id: orderId, code: order.code as string },
    });
    return { ok: true, url: session.url };
  } catch {
    return { ok: false, error: "We couldn't reach the payment provider — please try again." };
  }
}
