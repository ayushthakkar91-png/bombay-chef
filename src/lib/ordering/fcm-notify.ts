import "server-only";

import { getServiceClient } from "@/lib/supabase/clients";
import { isFcmConfigured } from "@/lib/notifications/fcm";
import { recordOrderEvent } from "./events";

/**
 * Enqueue an FCM push for a newly paid order (channel 'fcm' in the notifications
 * outbox). This is a LATENCY optimisation on top of the existing 5s poll — the
 * POS app prints from polling regardless, so FCM being unconfigured, having no
 * registered devices, or failing to send is always safe to no-op through.
 */
export async function enqueueOrderFcm(orderId: string): Promise<void> {
  if (!isFcmConfigured()) return;

  try {
    const supabase = getServiceClient();
    if (!supabase) return;

    const { data: order } = await supabase
      .from("orders")
      .select("code, location_id")
      .eq("id", orderId)
      .maybeSingle();
    if (!order?.location_id) return;

    const { data: devices } = await supabase
      .from("pos_devices")
      .select("fcm_token")
      .eq("location_id", order.location_id as string);
    const tokens = (devices ?? []).map((d) => d.fcm_token as string).filter(Boolean);
    if (tokens.length === 0) return; // No registered POS terminals for this location — polling still covers it.

    await supabase.from("notifications").insert({
      channel: "fcm",
      template: "order_fcm",
      to_address: "fcm",
      payload: {
        tokens,
        data: { action: "PRINT_ORDER", orderId, code: String(order.code) },
      },
      status: "queued",
      send_after: new Date().toISOString(),
      order_id: orderId,
    });
    await recordOrderEvent(orderId, "FCM_NOTIFICATION_CREATED", { deviceCount: tokens.length });
  } catch (err) {
    // FCM is a pure latency optimisation on top of the 5s poll — a thrown
    // supabase error here must never propagate out of confirmPaidOrder.
    await recordOrderEvent(orderId, "FCM_NOTIFICATION_FAILED", { error: String(err).slice(0, 300) }).catch(() => {});
  }
}
