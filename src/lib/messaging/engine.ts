import "server-only";

import { getServiceClient } from "@/lib/supabase/clients";
import { toE164, type Category, type Channel } from "./constants";

type Pref = { sms_opt_in: boolean; whatsapp_opt_in: boolean; marketing_opt_in: boolean; opt_out_at: string | null } | null;

async function getPref(phone: string): Promise<Pref> {
  const supabase = getServiceClient();
  if (!supabase) return null;
  const { data } = await supabase.from("messaging_preferences").select("sms_opt_in, whatsapp_opt_in, marketing_opt_in, opt_out_at").eq("phone", phone).maybeSingle();
  return (data as Pref) ?? null;
}

/** Pick a channel the recipient has consented to for this category, or null. */
export function resolveChannel(pref: Pref, category: Category): Channel | null {
  if (!pref || pref.opt_out_at) return null;
  if (category === "marketing" && !pref.marketing_opt_in) return null;
  if (pref.whatsapp_opt_in) return "whatsapp";
  if (pref.sms_opt_in) return "sms";
  return null;
}

export function render(body: string, vars: Record<string, string | number | null | undefined>): string {
  return body.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, k) => {
    const v = vars[k];
    return v == null ? "" : String(v);
  });
}

async function getTemplateBody(key: string): Promise<string | null> {
  const supabase = getServiceClient();
  if (!supabase) return null;
  const { data } = await supabase.from("message_templates").select("body, is_active").eq("key", key).maybeSingle();
  return data && data.is_active ? (data.body as string) : null;
}

export type EnqueueInput = {
  phone: string | null | undefined;
  category: Category;
  templateKey?: string;
  body?: string;
  vars?: Record<string, string | number | null | undefined>;
  customerId?: string | null;
  orderId?: string | null;
  reservationId?: string | null;
  campaignId?: string | null;
  dedupKey?: string;
  link?: string | null;
  channel?: Channel;
};

/**
 * Consent-gated enqueue. Resolves the recipient's channel from their preferences;
 * renders the template; inserts a queued `messages` row (dedup_key prevents repeats).
 * If there's no consent, records a `skipped` row so reporting reflects the gap.
 * Returns the outcome for callers that want to count.
 */
export async function enqueueMessage(input: EnqueueInput): Promise<"queued" | "skipped" | "noop"> {
  const supabase = getServiceClient();
  if (!supabase) return "noop";

  const e164 = toE164(input.phone);
  if (!e164) return "noop";

  let body = input.body ?? null;
  if (!body && input.templateKey) body = await getTemplateBody(input.templateKey);
  if (!body) return "noop";
  body = render(body, input.vars ?? {});

  const pref = await getPref(e164);
  const channel = input.channel ?? resolveChannel(pref, input.category);

  const base = {
    category: input.category,
    to_phone: e164,
    customer_id: input.customerId ?? null,
    template_key: input.templateKey ?? null,
    body,
    link_url: input.link ?? null,
    dedup_key: input.dedupKey ?? null,
    campaign_id: input.campaignId ?? null,
    order_id: input.orderId ?? null,
    reservation_id: input.reservationId ?? null,
  };

  if (!channel) {
    await supabase.from("messages").upsert({ ...base, channel: "sms", status: "skipped", error: "no consent" }, { onConflict: "dedup_key", ignoreDuplicates: true });
    return "skipped";
  }

  await supabase.from("messages").upsert({ ...base, channel, status: "queued" }, { onConflict: "dedup_key", ignoreDuplicates: true });
  return "queued";
}
