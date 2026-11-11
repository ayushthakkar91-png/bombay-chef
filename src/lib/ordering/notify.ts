import "server-only";

import { getServiceClient } from "@/lib/supabase/clients";
import { enqueueEmail } from "@/lib/notifications/outbox";
import { ORDER_STATUS_LABEL, type OrderStatus } from "./constants";
import type { ReservationEmailPayload, TemplateId } from "@/lib/email/templates";

import { money, siteUrl } from "@/lib/format";

/**
 * Build an order email payload and enqueue it. Loads the order + items +
 * location with the service client (orders aren't readable via RLS for the
 * outbox worker). `status` lets the cancelled template distinguish refunds.
 */
/**
 * Which status change tells the customer something worth an email.
 *
 * Shared, because both the admin panel and the Sunmi terminal move orders
 * along and a customer should not get an email only when staff happen to use
 * the website. Statuses not listed here are internal.
 */
export const STATUS_EMAIL: Partial<Record<OrderStatus, TemplateId>> = {
  accepted: "order_accepted",
  ready_for_collection: "order_ready_collection",
  out_for_delivery: "order_out_for_delivery",
  cancelled: "order_cancelled",
};

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
      "code, fulfilment, status, total_pence, prep_time_min, contact_name, contact_email, track_token, delivery_address, order_items(name, qty), locations(name)",
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
    deliveryAddressLabel: addressLine(data.delivery_address as Record<string, string> | null),
    etaLabel: prep ? `about ${prep} minutes` : undefined,
    totalLabel: money(data.total_pence as number),
    itemsSummary: items.map((i) => `${i.qty}× ${i.name}`).join(", "),
    trackUrl: `${siteUrl()}/order/track/${data.track_token as string}`,
    statusLabel: ORDER_STATUS_LABEL[data.status as OrderStatus],
    ...extra,
  };

  await enqueueEmail({ template, to: recipient, toName: payload.guestName, payload, orderId });
}

/** One-line delivery address for an email, or undefined when there isn't one. */
function addressLine(a: Record<string, string> | null): string | undefined {
  if (!a) return undefined;
  const parts = [a.line1, a.line2, a.city, a.postcode].filter((v) => v && v.trim());
  return parts.length ? parts.join(", ") : undefined;
}
