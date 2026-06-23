import "server-only";

import { getServiceClient } from "@/lib/supabase/clients";
import { sendMessage } from "./provider";
import type { Channel } from "./constants";

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}

/** Send due queued messages. Retries with exponential backoff; terminal after max_attempts. */
export async function dispatchQueued(nowMs: number, limit = 50): Promise<{ sent: number; failed: number }> {
  const supabase = getServiceClient();
  if (!supabase) return { sent: 0, failed: 0 };

  const nowISO = new Date(nowMs).toISOString();
  const { data: due } = await supabase
    .from("messages")
    .select("id, channel, to_phone, body, link_url, attempts, max_attempts")
    .eq("status", "queued")
    .lte("next_attempt_at", nowISO)
    .order("next_attempt_at", { ascending: true })
    .limit(limit);

  let sent = 0, failed = 0;
  for (const m of due ?? []) {
    // Claim atomically so concurrent crons don't double-send.
    const { data: claimed } = await supabase.from("messages").update({ status: "sending" }).eq("id", m.id).eq("status", "queued").select("id").maybeSingle();
    if (!claimed) continue;

    const id = m.id as string;
    let body = m.body as string;
    if (m.link_url) body += `\n${siteUrl()}/api/m/${id}`; // tracked short link

    const res = await sendMessage(m.channel as Channel, m.to_phone as string, body, { statusCallback: `${siteUrl()}/api/webhooks/twilio` });
    const attempts = (m.attempts as number) + 1;

    if (res.ok) {
      // Console has no delivery callback — treat as delivered so dev reporting is sane.
      const delivered = res.provider === "console";
      await supabase.from("messages").update({
        status: delivered ? "delivered" : "sent",
        provider: res.provider,
        provider_sid: res.sid ?? null,
        sent_at: nowISO,
        delivered_at: delivered ? nowISO : null,
        attempts,
        error: null,
      }).eq("id", id);
      sent++;
    } else if (attempts >= (m.max_attempts as number)) {
      await supabase.from("messages").update({ status: "failed", provider: res.provider, error: res.error ?? "send failed", attempts }).eq("id", id);
      failed++;
    } else {
      const backoffMin = Math.pow(2, attempts); // 2, 4, 8 minutes
      await supabase.from("messages").update({ status: "queued", provider: res.provider, error: res.error ?? "send failed", attempts, next_attempt_at: new Date(nowMs + backoffMin * 60000).toISOString() }).eq("id", id);
    }
  }
  return { sent, failed };
}
