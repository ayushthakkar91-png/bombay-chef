import { NextResponse } from "next/server";
import { after } from "next/server";

import { verifyWebhook } from "@/lib/stripe/client";
import { getServiceClient } from "@/lib/supabase/clients";
import { confirmPaidOrder } from "@/lib/ordering/confirm";
import { confirmGiftCardPurchase } from "@/lib/giftcards/service";
import { recordOrderEvent } from "@/lib/ordering/events";
import { dispatchTelegramDue } from "@/lib/notifications/telegram-dispatch";
import { dispatchFcmDue } from "@/lib/notifications/fcm-dispatch";

export const dynamic = "force-dynamic";

/**
 * POST /api/webhooks/stripe — the ONLY place a Stripe payment is finalised.
 * Verifies the signature, dedupes the event (Stripe retries deliver the same
 * event id), verifies the amount/currency against the order, then dispatches:
 * an order checkout → confirmPaidOrder; a gift-card purchase → activate the
 * card. All idempotent; the DB is the source of truth. Telegram is dispatched
 * best-effort after the response (the outbox row already persists the job).
 */
export async function POST(request: Request) {
  const payload = await request.text();
  const event = verifyWebhook(payload, request.headers.get("stripe-signature"));
  if (!event) return NextResponse.json({ error: "Invalid signature." }, { status: 400 });

  const supabase = getServiceClient();
  if (!supabase) return NextResponse.json({ error: "Not configured." }, { status: 503 });

  const eventId = event.id as string | undefined;
  const eventType = event.type as string;

  // Idempotency: record the event id first; if it already exists, this is a
  // Stripe retry of an event we've handled — ack without repeating side effects.
  if (eventId) {
    const { data: inserted } = await supabase
      .from("stripe_webhook_events")
      .insert({ stripe_event_id: eventId, event_type: eventType })
      .select("stripe_event_id")
      .maybeSingle();
    if (!inserted) return NextResponse.json({ received: true, duplicate: true });
  }

  const object = (event.data as { object: Record<string, unknown> })?.object ?? {};
  const metadata = (object.metadata as Record<string, string> | null) ?? {};

  if (eventType === "checkout.session.completed") {
    const paymentIntent = (object.payment_intent as string) ?? null;
    const amountTotal = (object.amount_total as number) ?? 0;
    const currency = ((object.currency as string) ?? "").toLowerCase();

    if (metadata.order_id) {
      // Amount/currency verification (defence-in-depth; the session was created
      // from the server total, but never confirm on an unexpected charge).
      const { data: order } = await supabase
        .from("orders")
        .select("total_pence, gift_card_pence, status")
        .eq("id", metadata.order_id)
        .maybeSingle();
      const expected = order ? (order.total_pence as number) - ((order.gift_card_pence as number) ?? 0) : null;

      if (!order) {
        await recordOrderEvent(metadata.order_id, "PAYMENT_AMOUNT_MISMATCH", { reason: "order_not_found", amountTotal });
      } else if (currency !== "gbp" || expected == null || amountTotal !== expected) {
        // Do NOT confirm on a mismatch — flag for investigation.
        await recordOrderEvent(metadata.order_id, "PAYMENT_AMOUNT_MISMATCH", { expected, amountTotal, currency });
      } else {
        const ok = await confirmPaidOrder(metadata.order_id, { paymentIntent, amountPence: amountTotal, method: "card" });
        if (ok) after(async () => { await Promise.allSettled([dispatchTelegramDue(), dispatchFcmDue()]); });
      }
    } else if (metadata.gift_card_id) {
      await confirmGiftCardPurchase(metadata.gift_card_id, paymentIntent);
    }
  } else if (eventType === "payment_intent.payment_failed") {
    if (metadata.order_id) {
      await recordOrderEvent(metadata.order_id, "PAYMENT_FAILED", {
        code: (object.last_payment_error as Record<string, unknown> | null)?.code ?? null,
      });
    }
  } else if (eventType === "charge.refunded") {
    if (metadata.order_id) {
      await recordOrderEvent(metadata.order_id, "PAYMENT_REFUNDED", { amountRefunded: (object.amount_refunded as number) ?? null });
    }
  }

  return NextResponse.json({ received: true });
}
