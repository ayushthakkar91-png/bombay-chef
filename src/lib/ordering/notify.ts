import "server-only";

import { getServiceClient } from "@/lib/supabase/clients";
import { enqueueEmail } from "@/lib/notifications/outbox";
import { ORDER_STATUS_LABEL, type OrderStatus } from "./constants";
import type { ReservationEmailPayload, TemplateId } from "@/lib/email/templates";

function money(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`;
}

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}

/**
 * Build an order email payload and enqueue it. Loads the order + items +
 * location with the service client (orders aren't readable via RLS for the
 * outbox worker). `status` lets the cancelled template distinguish refunds.
 */
export async function enqueueOrderEmail(
  orderId: string,
  template: TemplateId,
  extra?: Partial<ReservationEmailPayload>,
  toOverride?: string,
): Promise<void> {
  const supabase = getServiceClient();
  if (!supabase) return;

  const { data } = await supabase
    .from("orders")
    .select(
      "code, fulfilment, status, total_pence, prep_time_min, contact_name, contact_email, track_token, order_items(name, qty), locations(name)",
    )
    .eq("id", orderId)
    .maybeSingle();
  if (!data) return;
  const recipient = toOverride ?? (data.contact_email as string | null);
  if (!recipient) return;

  const loc = data.locations as { name: string } | { name: string }[] | null;
  const locationName = (Array.isArray(loc) ? loc[0]?.name : loc?.name) ?? "Bombay Bicycle Chef";
  const items = (data.order_items as { name: string; qty: number }[] | null) ?? [];
  const prep = data.prep_time_min as number | null;

  const payload: ReservationEmailPayload = {
    guestName: (data.contact_name as string) ?? undefined,
    locationName,
    code: data.code as string,
    fulfilment: data.fulfilment as string,
    etaLabel: prep ? `about ${prep} minutes` : undefined,
    totalLabel: money(data.total_pence as number),
    itemsSummary: items.map((i) => `${i.qty}× ${i.name}`).join(", "),
    trackUrl: `${siteUrl()}/order/track/${data.track_token as string}`,
    statusLabel: ORDER_STATUS_LABEL[data.status as OrderStatus],
    ...extra,
  };

  await enqueueEmail({ template, to: recipient, toName: payload.guestName, payload, orderId });
}
