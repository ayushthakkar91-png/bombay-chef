import "server-only";

import { getServiceClient } from "@/lib/supabase/clients";
import { isFcmConfigured, sendFcmData } from "./fcm";
import { recordOrderEvent } from "@/lib/ordering/events";

/**
 * Dispatch queued 'fcm' notifications from the outbox. Mirrors the telegram
 * dispatcher: optimistic claim (queued→sending), send, record status, retry
 * with backoff, dead-letter at MAX_ATTEMPTS. FCM is a latency optimisation
 * only — the POS app polls independently every 5s, so a dead-lettered push
 * never loses an order, it just means the ticket printed on the next poll.
 * No-ops entirely when FCM isn't configured (env unset).
 */

const MAX_ATTEMPTS = 6;
const BACKOFF_MS = [0, 5_000, 15_000, 30_000, 60_000, 300_000];

export async function dispatchFcmDue(limit = 25): Promise<{ sent: number; failed: number }> {
  if (!isFcmConfigured()) return { sent: 0, failed: 0 };

  const supabase = getServiceClient();
  if (!supabase) return { sent: 0, failed: 0 };

  const { data: rows } = await supabase
    .from("notifications")
    .select("id, payload, attempts, order_id")
    .eq("channel", "fcm")
    .eq("status", "queued")
    .lte("send_after", new Date().toISOString())
    .order("send_after", { ascending: true })
    .limit(limit);

  let sent = 0;
  let failed = 0;

  for (const row of rows ?? []) {
    const attempts = (row.attempts as number) ?? 0;
    // Optimistic claim — only one worker proceeds.
    const { data: claimed } = await supabase
      .from("notifications")
      .update({ status: "sending", attempts: attempts + 1 })
      .eq("id", row.id)
      .eq("status", "queued")
      .select("id");
    if (!claimed || claimed.length === 0) continue;

    const payload = (row.payload as { tokens?: string[]; data?: Record<string, string> }) ?? {};
    const orderId = (row.order_id as string | null) ?? null;
    const tokens = payload.tokens ?? [];

    if (tokens.length === 0) {
      // Nothing to send — mark done rather than looping forever.
      await supabase.from("notifications").update({ status: "sent", last_error: null }).eq("id", row.id);
      continue;
    }

    try {
      const { sent: sentCount, invalidTokens } = await sendFcmData(tokens, payload.data ?? {});
      await supabase
        .from("notifications")
        .update({ status: "sent", provider_id: String(sentCount), last_error: null })
        .eq("id", row.id);
      if (invalidTokens.length > 0) {
        await supabase.from("pos_devices").delete().in("fcm_token", invalidTokens);
      }
      if (orderId) await recordOrderEvent(orderId, "FCM_NOTIFICATION_SENT", { sent: sentCount, invalidTokens: invalidTokens.length });
      sent++;
    } catch (err) {
      const nextAttempt = attempts + 1;
      const giveUp = nextAttempt >= MAX_ATTEMPTS;
      const backoff = BACKOFF_MS[Math.min(nextAttempt, BACKOFF_MS.length - 1)];
      await supabase
        .from("notifications")
        .update({
          status: giveUp ? "failed" : "queued",
          last_error: String(err).slice(0, 500),
          send_after: new Date(Date.now() + backoff).toISOString(),
        })
        .eq("id", row.id);
      if (giveUp && orderId) await recordOrderEvent(orderId, "FCM_NOTIFICATION_FAILED", { error: String(err).slice(0, 200) });
      failed++;
    }
  }

  return { sent, failed };
}
