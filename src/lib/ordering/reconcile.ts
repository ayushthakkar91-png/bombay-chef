import "server-only";

import { getServiceClient } from "@/lib/supabase/clients";
import { isStripeConfigured, retrieveCheckoutSession, searchPaymentIntentsByOrderId } from "@/lib/stripe/client";
import { dispatchDue } from "@/lib/notifications/outbox";
import { dispatchTelegramDue } from "@/lib/notifications/telegram-dispatch";
import { dispatchFcmDue } from "@/lib/notifications/fcm-dispatch";
import { confirmPaidOrder } from "./confirm";
import { recordOrderEvent } from "./events";

/**
 * Payment recovery ("no missed orders"). The Stripe webhook is the primary way an
 * order becomes paid, but if it is delayed, misconfigured or never delivered, a
 * customer could pay while the order sits in `pending_payment` and the kitchen is
 * never told. These helpers ask Stripe DIRECTLY whether the order was paid and,
 * if so (and the amount matches), confirm it exactly as the webhook would. Safe
 * to call any time and from anywhere: confirmPaidOrder's atomic status claim
 * means an order is only ever confirmed once, even if the webhook lands at the
 * same moment.
 *
 * Lookup order: the Checkout Session ids recorded at checkout; if none were
 * recorded (e.g. an older order), Stripe Search for a PaymentIntent carrying the
 * order id in its metadata.
 *
 * Triggered from: the order tracking page (customer returns after paying), the
 * admin Orders / Live orders pages (staff), and the daily /api/cron/reconcile sweep.
 */

export type ReconcileOutcome = "confirmed" | "unpaid" | "not_pending" | "no_session" | "mismatch" | "error";

/** How far back the sweep looks (older abandoned carts are left alone). */
const SWEEP_MAX_AGE_MS = 24 * 60 * 60 * 1000;
/** The sweep gives the webhook a head start before checking an order itself. */
const SWEEP_GRACE_MS = 2 * 60 * 1000;

export async function reconcilePendingOrder(orderId: string): Promise<ReconcileOutcome> {
  const supabase = getServiceClient();
  if (!supabase || !isStripeConfigured()) return "error";

  const { data: order } = await supabase
    .from("orders")
    .select("id, status, total_pence, gift_card_pence")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return "error";
  if (order.status !== "pending_payment") return "not_pending";

  const expected = (order.total_pence as number) - ((order.gift_card_pence as number) ?? 0);

  // Every Checkout Session created for this order (a retry may have opened more
  // than one). If any of them was paid, the order is paid.
  const { data: events } = await supabase
    .from("order_events")
    .select("data")
    .eq("order_id", orderId)
    .eq("type", "CHECKOUT_SESSION_CREATED")
    .order("created_at", { ascending: false })
    .limit(5);
  const sessionIds = [
    ...new Set(
      (events ?? [])
        .map((e) => (e.data as { sessionId?: unknown } | null)?.sessionId)
        .filter((id): id is string => typeof id === "string"),
    ),
  ];

  // No session recorded: find the payment by the order id on the PaymentIntent.
  if (sessionIds.length === 0) return reconcileByPaymentIntent(orderId, expected);

  try {
    let sawUnpaid = false;
    for (const sessionId of sessionIds) {
      const s = await retrieveCheckoutSession(sessionId);
      if (s.status !== "complete" || s.paymentStatus !== "paid") {
        sawUnpaid = true;
        continue;
      }
      // Same defence-in-depth as the webhook: never confirm on an unexpected charge.
      if ((s.metadataOrderId && s.metadataOrderId !== orderId) || s.currency !== "gbp" || s.amountTotal !== expected) {
        await recordOrderEvent(orderId, "PAYMENT_AMOUNT_MISMATCH", {
          source: "reconcile",
          sessionId,
          expected,
          amountTotal: s.amountTotal,
          currency: s.currency,
        });
        return "mismatch";
      }
      const confirmed = await confirmPaidOrder(orderId, {
        paymentIntent: s.paymentIntent,
        amountPence: s.amountTotal,
        method: "card",
      });
      if (confirmed) {
        await recordOrderEvent(orderId, "PAYMENT_RECONCILED", { sessionId, via: "session" });
        return "confirmed";
      }
      return "not_pending"; // the webhook (or another check) confirmed it first
    }
    return sawUnpaid ? "unpaid" : "no_session";
  } catch (err) {
    console.error(`[reconcile] order ${orderId}: ${err instanceof Error ? err.message : String(err)}`);
    return "error";
  }
}

/** Fallback: confirm from a succeeded PaymentIntent tagged with this order id. */
async function reconcileByPaymentIntent(orderId: string, expected: number): Promise<ReconcileOutcome> {
  try {
    const intents = await searchPaymentIntentsByOrderId(orderId);
    const paid = intents.find((p) => p.status === "succeeded");
    if (!paid) return intents.length > 0 ? "unpaid" : "no_session";
    if (paid.currency !== "gbp" || paid.amount !== expected) {
      await recordOrderEvent(orderId, "PAYMENT_AMOUNT_MISMATCH", {
        source: "reconcile_search",
        paymentIntent: paid.id,
        expected,
        amount: paid.amount,
        currency: paid.currency,
      });
      return "mismatch";
    }
    const confirmed = await confirmPaidOrder(orderId, { paymentIntent: paid.id, amountPence: paid.amount, method: "card" });
    if (confirmed) {
      await recordOrderEvent(orderId, "PAYMENT_RECONCILED", { paymentIntent: paid.id, via: "search" });
      return "confirmed";
    }
    return "not_pending";
  } catch (err) {
    console.error(`[reconcile] order ${orderId} (search): ${err instanceof Error ? err.message : String(err)}`);
    return "error";
  }
}

/** Reconcile the order behind a tracking token, but only if it's still awaiting payment. */
export async function reconcilePendingByTrackToken(token: string): Promise<ReconcileOutcome> {
  const supabase = getServiceClient();
  if (!supabase || !token) return "error";
  const { data } = await supabase.from("orders").select("id, status").eq("track_token", token).maybeSingle();
  if (!data) return "error";
  if (data.status !== "pending_payment") return "not_pending";
  return reconcilePendingOrder(data.id as string);
}

/**
 * Sweep recent orders still awaiting payment (older than the webhook grace
 * period, newer than 24h) and confirm any that Stripe says were paid.
 */
export async function reconcileRecentPending(opts: { locationId?: string; limit?: number } = {}): Promise<{ checked: number; confirmed: number }> {
  const supabase = getServiceClient();
  if (!supabase || !isStripeConfigured()) return { checked: 0, confirmed: 0 };

  const now = Date.now();
  let query = supabase
    .from("orders")
    .select("id")
    .eq("status", "pending_payment")
    .lt("created_at", new Date(now - SWEEP_GRACE_MS).toISOString())
    .gt("created_at", new Date(now - SWEEP_MAX_AGE_MS).toISOString())
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 20);
  if (opts.locationId) query = query.eq("location_id", opts.locationId);

  const { data: orders } = await query;
  let confirmed = 0;
  for (const o of orders ?? []) {
    if ((await reconcilePendingOrder(o.id as string)) === "confirmed") confirmed++;
  }
  return { checked: orders?.length ?? 0, confirmed };
}

/** Send any queued email / Telegram / POS-push notifications (retries included). */
export async function dispatchAllNotifications(limit = 25): Promise<void> {
  await Promise.allSettled([dispatchDue(limit), dispatchTelegramDue(limit), dispatchFcmDue(limit)]);
}
