import "server-only";

import { getServiceClient } from "@/lib/supabase/clients";
import { enqueueEmail } from "@/lib/notifications/outbox";
import { unsubscribeUrl } from "./contacts";
import { flags } from "@/lib/flags";

/**
 * Send a campaign to its audience via the notifications outbox. Audience =
 * consenting, not-unsubscribed marketing_contacts; if the campaign targets a
 * segment, restricted to contacts linked to a customer in that segment.
 * Consent-gated by construction (only opted-in contacts are in the list).
 */
export async function sendCampaign(campaignId: string): Promise<{ ok: boolean; recipients?: number; error?: string }> {
  if (!flags.marketing) return { ok: false, error: "Marketing is disabled." };
  const supabase = getServiceClient();
  if (!supabase) return { ok: false, error: "Unavailable." };

  const { data: c } = await supabase.from("campaigns").select("id, subject, body_text, segment_id, status").eq("id", campaignId).maybeSingle();
  if (!c) return { ok: false, error: "Campaign not found." };
  if (c.status === "sent") return { ok: false, error: "This campaign has already been sent." };
  if (!c.subject || !c.body_text) return { ok: false, error: "Add a subject and message first." };

  await supabase.from("campaigns").update({ status: "sending" }).eq("id", campaignId);

  type Recipient = { email: string; name: string | null; unsubscribe_token: string; customer_id: string | null };
  let recipients: Recipient[] = [];

  if (c.segment_id) {
    const { data: mem } = await supabase.from("segment_members").select("customer_id").eq("segment_id", c.segment_id);
    const ids = (mem ?? []).map((m) => m.customer_id as string);
    if (ids.length > 0) {
      const { data } = await supabase
        .from("marketing_contacts")
        .select("email, name, unsubscribe_token, customer_id")
        .eq("consent", true)
        .is("unsubscribed_at", null)
        .in("customer_id", ids);
      recipients = (data ?? []) as Recipient[];
    }
  } else {
    const { data } = await supabase
      .from("marketing_contacts")
      .select("email, name, unsubscribe_token, customer_id")
      .eq("consent", true)
      .is("unsubscribed_at", null);
    recipients = (data ?? []) as Recipient[];
  }

  for (const r of recipients) {
    await enqueueEmail({
      template: "marketing_campaign",
      to: r.email,
      toName: r.name ?? undefined,
      customerId: r.customer_id ?? undefined,
      payload: {
        guestName: r.name ?? undefined,
        campaignSubject: c.subject as string,
        bodyText: c.body_text as string,
        unsubscribeUrl: unsubscribeUrl(r.unsubscribe_token),
      },
    });
  }

  await supabase.from("campaigns").update({ status: "sent", sent_at: new Date().toISOString(), recipients: recipients.length }).eq("id", campaignId);
  return { ok: true, recipients: recipients.length };
}
