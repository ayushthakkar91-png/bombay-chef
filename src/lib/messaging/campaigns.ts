import "server-only";

import { getServiceClient } from "@/lib/supabase/clients";
import { enqueueMessage } from "./engine";

/**
 * Fan a marketing campaign out into the queue — one consent-gated message per
 * opted-in recipient (dedup'd per phone). The dispatcher cron then sends them.
 */
export async function sendCampaign(campaignId: string): Promise<{ queued: number } | { error: string }> {
  const supabase = getServiceClient();
  if (!supabase) return { error: "Unavailable." };

  const { data: c } = await supabase.from("message_campaigns").select("id, body, channel, link_url, status").eq("id", campaignId).maybeSingle();
  if (!c) return { error: "Campaign not found." };
  if (c.status !== "draft") return { error: "Only draft campaigns can be sent." };

  // Audience: marketing-opted-in, not opted-out.
  const { data: prefs } = await supabase
    .from("messaging_preferences")
    .select("phone, customer_id")
    .eq("marketing_opt_in", true)
    .is("opt_out_at", null);

  let queued = 0;
  for (const p of prefs ?? []) {
    const r = await enqueueMessage({
      phone: p.phone as string,
      category: "marketing",
      body: c.body as string,
      link: (c.link_url as string | null) ?? null,
      customerId: (p.customer_id as string | null) ?? null,
      campaignId: c.id as string,
      dedupKey: `campaign:${c.id}:${p.phone}`,
    });
    if (r === "queued") queued++;
  }

  await supabase.from("message_campaigns").update({ status: "sent", total_count: queued }).eq("id", c.id);
  return { queued };
}
