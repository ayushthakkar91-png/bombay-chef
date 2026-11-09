import { NextResponse } from "next/server";
import { after } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { verifyWebhook } from "@/lib/stripe/client";
import { getServiceClient } from "@/lib/supabase/clients";
import { confirmPaidOrder } from "@/lib/ordering/confirm";
import { confirmGiftCardPurchase } from "@/lib/giftcards/service";
import { recordOrderEvent } from "@/lib/ordering/events";
import { dispatchTelegramDue } from "@/lib/notifications/telegram-dispatch";
import { dispatchFcmDue } from "@/lib/notifications/fcm-dispatch";

export const dynamic = "force-dynamic";

/**
 * POST /api/webhooks/stripe — the primary place a Stripe payment is finalised.
 * Verifies the signature, dedupes the event (Stripe retries deliver the same
 * event id), verifies the amount/currency against the order, then dispatches:
 * an order checkout → confirmPaidOrder; a gift-card purchase → activate the card.
 *
 * No-missed-orders rules:
 *  - An event is only kept as "processed" once it has been handled successfully.
 *    If handling fails (DB error, crash), the claim is released and we answer 500,
 *    so Stripe RETRIES (for up to 3 days) instead of the payment being dropped.
 *  - A failure to record the event id (e.g. database down) is NOT treated as a
 *    duplicate — it also answers 500 so Stripe retries.
 * Everything downstream is idempotent (atomic status claim), so retries are safe.
 * src/lib/ordering/reconcile.ts is the second line of defence if a webhook never arrives.
 */
export async function POST(request: Request) {
  const payload = await request.text();
  const event = verifyWebhook(payload, request.headers.get("stripe-signature"));
  if (!event) return NextResponse.json({ error: "Invalid signature." }, { status: 400 });

  const supabase = getServiceClient();
  if (!supabase) return NextResponse.json({ error: "Not configured." }, { status: 503 });

  const eventId = event.id as string | undefined;
  const eventType = event.type as string;

  // Claim the event id. A unique violation means this exact event was already
  // handled successfully → acknowledge. Any other error → 500 so Stripe retries.
  if (eventId) {
    const { error: claimError } = await supabase
      .from("stripe_webhook_events")
      .insert({ stripe_event_id: eventId, event_type: eventType });
    if (claimError) {
      if (claimError.code === "23505") return NextResponse.json({ received: true, duplicate: true });
      console.error(`[stripe-webhook] could not record event ${eventId}: ${claimError.message}`);
      return NextResponse.json({ error: "Temporarily unavailable." }, { status: 500 });
    }
  }

  const releaseClaim = async () => {
    if (!eventId) return;
    await supabase.from("stripe_webhook_events").delete().eq("stripe_event_id", eventId);
  };

  try {
    const handled = await handleEvent(supabase, eventType, event);
    if (!handled) {
      await releaseClaim();
      return NextResponse.json({ error: "Not processed — will retry." }, { status: 500 });
    }
  } catch (err) {
    console.error(`[stripe-webhook] ${eventType} ${eventId ?? ""} failed: ${err instanceof Error ? err.message : String(err)}`);
    await releaseClaim();
    return NextResponse.json({ error: "Not processed — will retry." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

/** Returns true when the event is fully handled (or needs no retry), false to ask Stripe to retry. */
async function handleEvent(supabase: SupabaseClient, eventType: string, event: Record<string, unknown>): Promise<boolean> {
  const object = (event.data as { object: Record<string, unknown> })?.object ?? {};
  const metadata = (object.metadata as Record<string, string> | null) ?? {};

  if (eventType === "checkout.session.completed") {
    const paymentIntent = (object.payment_intent as string) ?? null;
    const amountTotal = (object.amount_total as number) ?? 0;
    const currency = ((object.currency as string) ?? "").toLowerCase();

    if (metadata.order_id) {
      // Amount/currency verification (defence-in-depth; the session was created
      // from the server total, but never confirm on an unexpected charge).
      const { data: order, error } = await supabase
        .from("orders")
        .select("total_pence, gift_card_pence, status")
        .eq("id", metadata.order_id)
        .maybeSingle();
      if (error) throw new Error(`order lookup failed: ${error.message}`);
      const expected = order ? (order.total_pence as number) - ((order.gift_card_pence as number) ?? 0) : null;

      if (!order) {
        // Retrying can't create the order — record it for investigation and ack.
        await recordOrderEvent(metadata.order_id, "PAYMENT_AMOUNT_MISMATCH", { reason: "order_not_found", amountTotal });
        return true;
      }
      if (currency !== "gbp" || expected == null || amountTotal !== expected) {
        // Do NOT confirm on a mismatch — flag for investigation.
        await recordOrderEvent(metadata.order_id, "PAYMENT_AMOUNT_MISMATCH", { expected, amountTotal, currency });
        return true;
      }

      const confirmed = await confirmPaidOrder(metadata.order_id, { paymentIntent, amountPence: amountTotal, method: "card" });
      if (confirmed) {
        after(async () => { await Promise.allSettled([dispatchTelegramDue(), dispatchFcmDue()]); });
        return true;
      }
      // Not confirmed by us: fine if it's already past pending_payment (a retry or
      // the reconcile path confirmed it). If it's STILL pending, something failed —
      // ask Stripe to retry.
      const { data: after_ } = await supabase.from("orders").select("status").eq("id", metadata.order_id).maybeSingle();
      return Boolean(after_ && after_.status !== "pending_payment");
    }

    if (metadata.gift_card_id) {
      await confirmGiftCardPurchase(metadata.gift_card_id, paymentIntent);
    }
    return true;
  }

  if (eventType === "payment_intent.payment_failed") {
    if (metadata.order_id) {
      await recordOrderEvent(metadata.order_id, "PAYMENT_FAILED", {
        code: (object.last_payment_error as Record<string, unknown> | null)?.code ?? null,
      });
    }
    return true;
  }

  if (eventType === "charge.refunded") {
    if (metadata.order_id) {
      await recordOrderEvent(metadata.order_id, "PAYMENT_REFUNDED", { amountRefunded: (object.amount_refunded as number) ?? null });
    }
    return true;
  }

  return true; // event types we don't act on
}
