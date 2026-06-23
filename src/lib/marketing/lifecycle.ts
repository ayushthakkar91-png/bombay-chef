import "server-only";

import { getServiceClient } from "@/lib/supabase/clients";
import { enqueueEmail } from "@/lib/notifications/outbox";
import { subscribeContact, unsubscribeUrl } from "./contacts";
import { flags } from "@/lib/flags";

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}

/**
 * Abandoned-cart reminders: pending_payment orders 30 min–24 h old where the
 * customer opted into marketing at checkout (`marketing_opt_in`). Consent-safe
 * by construction. Dedup-guarded via the notifications outbox. Run by the
 * marketing cron.
 */
export async function processAbandonedCarts(): Promise<{ sent: number }> {
  if (!flags.marketing) return { sent: 0 };
  const supabase = getServiceClient();
  if (!supabase) return { sent: 0 };

  const now = Date.now();
  const fromISO = new Date(now - 24 * 3600 * 1000).toISOString();
  const toISO = new Date(now - 30 * 60 * 1000).toISOString();

  const { data: orders } = await supabase
    .from("orders")
    .select("id, contact_name, contact_email, marketing_opt_in, customer_id, order_items(name, qty), locations(name)")
    .eq("status", "pending_payment")
    .eq("marketing_opt_in", true)
    .gte("created_at", fromISO)
    .lte("created_at", toISO);

  let sent = 0;
  for (const o of orders ?? []) {
    const email = o.contact_email as string | null;
    if (!email) continue;

    const { data: existing } = await supabase.from("notifications").select("id").eq("order_id", o.id).eq("template", "abandoned_cart").limit(1);
    if (existing && existing.length) continue;

    // Ensure a contact + unsubscribe token (they opted in at checkout).
    await subscribeContact(email, { name: (o.contact_name as string) ?? undefined, customerId: (o.customer_id as string) ?? undefined, source: "checkout", sendWelcome: false });
    const { data: contact } = await supabase.from("marketing_contacts").select("unsubscribe_token").eq("email", email.toLowerCase()).maybeSingle();

    const loc = o.locations as { name: string } | { name: string }[] | null;
    const locationName = (Array.isArray(loc) ? loc[0]?.name : loc?.name) ?? "Bombay Bicycle Chef";
    const items = ((o.order_items as { name: string; qty: number }[] | null) ?? []).map((i) => `${i.qty}× ${i.name}`).join(", ");

    await enqueueEmail({
      template: "abandoned_cart",
      to: email,
      toName: (o.contact_name as string) ?? undefined,
      orderId: o.id as string,
      payload: {
        guestName: (o.contact_name as string) ?? undefined,
        locationName,
        itemsSummary: items,
        ctaUrl: `${siteUrl()}/order`,
        unsubscribeUrl: contact ? unsubscribeUrl(contact.unsubscribe_token as string) : undefined,
      },
    });
    sent++;
  }
  return { sent };
}
