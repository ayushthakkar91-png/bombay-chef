import "server-only";

import { getServiceClient } from "@/lib/supabase/clients";
import { sendTelegramMessage, type InlineButton } from "./telegram";
import { recordOrderEvent } from "@/lib/ordering/events";

/**
 * Dispatch queued 'telegram' notifications from the outbox. Mirrors the email
 * dispatcher: optimistic claim (queued→sending), send, record status, retry
 * with backoff, dead-letter at MAX_ATTEMPTS. Called immediately after a paid
 * order (via after()) for near-instant delivery, and swept by the cron for
 * retries. Telegram failure NEVER affects order state — the order is already
 * CONFIRMED in the DB; only the notification row goes to 'failed' (dead-letter),
 * which the dashboard surfaces as an alarm.
 */

const MAX_ATTEMPTS = 6;
const BACKOFF_MS = [0, 5_000, 15_000, 30_000, 60_000, 300_000]; // spec §15 schedule

export async function dispatchTelegramDue(limit = 25): Promise<{ sent: number; failed: number }> {
  const supabase = getServiceClient();
  if (!supabase) return { sent: 0, failed: 0 };

  const { data: rows } = await supabase
    .from("notifications")
    .select("id, to_address, payload, attempts, order_id")
    .eq("channel", "telegram")
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

    const payload = (row.payload as { text?: string; buttons?: InlineButton[][] }) ?? {};
    const orderId = (row.order_id as string | null) ?? null;

    try {
      const { messageId } = await sendTelegramMessage({
        chatId: row.to_address as string,
        text: payload.text ?? "New order",
        buttons: payload.buttons,
      });
      await supabase
        .from("notifications")
        .update({ status: "sent", provider_id: String(messageId), last_error: null })
        .eq("id", row.id);
      if (orderId) await recordOrderEvent(orderId, "TELEGRAM_NOTIFICATION_SENT", { messageId });
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
      if (giveUp && orderId) await recordOrderEvent(orderId, "TELEGRAM_NOTIFICATION_FAILED", { error: String(err).slice(0, 200) });
      failed++;
    }
  }

  return { sent, failed };
}
