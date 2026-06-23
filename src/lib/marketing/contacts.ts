import "server-only";

import { getServiceClient } from "@/lib/supabase/clients";
import { enqueueEmail } from "@/lib/notifications/outbox";
import { flags } from "@/lib/flags";

/**
 * The operational marketing list. `consents` (0003) stays the append-only GDPR
 * evidence trail; `marketing_contacts` is the working "who gets marketing email"
 * table with per-contact unsubscribe tokens, kept in sync with customer consent
 * and newsletter signups. All writes are service-client.
 */

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}
export function unsubscribeUrl(token: string): string {
  return `${siteUrl()}/unsubscribe?token=${token}`;
}

async function sendWelcome(email: string, name: string | undefined, token: string) {
  if (!flags.marketing) return;
  await enqueueEmail({
    template: "marketing_welcome",
    to: email,
    toName: name,
    payload: { guestName: name, ctaUrl: `${siteUrl()}/menu`, unsubscribeUrl: unsubscribeUrl(token) },
  });
}

/** Subscribe (or re-subscribe) an email to marketing. Idempotent by email. */
export async function subscribeContact(
  email: string,
  opts: { name?: string; source?: string; customerId?: string; sendWelcome?: boolean } = {},
): Promise<{ ok: boolean }> {
  const supabase = getServiceClient();
  if (!supabase) return { ok: false };
  const e = email.trim().toLowerCase();
  if (!e) return { ok: false };

  const { data: existing } = await supabase
    .from("marketing_contacts")
    .select("id, unsubscribe_token, consent")
    .eq("email", e)
    .maybeSingle();

  if (existing) {
    const wasSubscribed = existing.consent as boolean;
    await supabase
      .from("marketing_contacts")
      .update({
        consent: true,
        unsubscribed_at: null,
        name: opts.name ?? undefined,
        customer_id: opts.customerId ?? undefined,
        subscribed_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    if (opts.sendWelcome && !wasSubscribed) await sendWelcome(e, opts.name, existing.unsubscribe_token as string);
    return { ok: true };
  }

  const { data: inserted } = await supabase
    .from("marketing_contacts")
    .insert({ email: e, name: opts.name ?? null, source: opts.source ?? null, customer_id: opts.customerId ?? null, consent: true })
    .select("unsubscribe_token")
    .single();
  if (opts.sendWelcome && inserted) await sendWelcome(e, opts.name, inserted.unsubscribe_token as string);
  return { ok: true };
}

/** One-click unsubscribe via token (also logs a consent revocation). */
export async function unsubscribeByToken(token: string): Promise<{ ok: boolean; email?: string }> {
  const supabase = getServiceClient();
  if (!supabase || !token) return { ok: false };
  const { data } = await supabase.from("marketing_contacts").select("id, email, customer_id").eq("unsubscribe_token", token).maybeSingle();
  if (!data) return { ok: false };

  await supabase.from("marketing_contacts").update({ consent: false, unsubscribed_at: new Date().toISOString() }).eq("id", data.id);
  if (data.customer_id) {
    await supabase.from("consents").insert({ customer_id: data.customer_id, purpose: "marketing_email", granted: false, source: "unsubscribe_link" });
  }
  return { ok: true, email: data.email as string };
}

/** Mirror a customer's marketing-email consent change into the list. */
export async function syncCustomerConsent(customerId: string, email: string | null, granted: boolean): Promise<void> {
  if (!email) return;
  const e = email.toLowerCase();
  if (granted) {
    await subscribeContact(e, { customerId, source: "account", sendWelcome: true });
  } else {
    const supabase = getServiceClient();
    if (supabase) await supabase.from("marketing_contacts").update({ consent: false, unsubscribed_at: new Date().toISOString() }).eq("email", e);
  }
}
