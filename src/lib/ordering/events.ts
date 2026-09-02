import "server-only";

import { getServiceClient } from "@/lib/supabase/clients";

/**
 * Append-only order event log (audit trail). Distinct from notification status:
 * an order can be CONFIRMED while its Telegram notification is RETRYING. Writes
 * use the service client (order_events has no public insert policy). Best-effort
 * — a failed audit write must never break the order flow, so errors are
 * swallowed after logging.
 */

export type OrderEventType =
  | "ORDER_CREATED"
  | "PAYMENT_CONFIRMED"
  | "PAYMENT_FAILED"
  | "PAYMENT_AMOUNT_MISMATCH"
  | "PAYMENT_REFUNDED"
  | "ORDER_STATUS_CHANGED"
  | "ORDER_CANCELLED"
  | "TELEGRAM_NOTIFICATION_CREATED"
  | "TELEGRAM_NOTIFICATION_SENT"
  | "TELEGRAM_NOTIFICATION_FAILED"
  | "FCM_NOTIFICATION_CREATED"
  | "FCM_NOTIFICATION_SENT"
  | "FCM_NOTIFICATION_FAILED"
  | "STAFF_ACKNOWLEDGED"
  | "GIFT_CARD_SHORTFALL"
  | "POS_PRINTED"
  | "POS_PRINT_FAILED"
  | "POS_STATUS_CHANGED";

export async function recordOrderEvent(
  orderId: string,
  type: OrderEventType,
  data: Record<string, unknown> = {},
  actorId: string | null = null,
): Promise<void> {
  const supabase = getServiceClient();
  if (!supabase) return;
  try {
    await supabase.from("order_events").insert({ order_id: orderId, type, data, actor_id: actorId });
  } catch (err) {
    console.error(`[order_events] failed to record ${type} for ${orderId}:`, String(err).slice(0, 200));
  }
}
