import "server-only";

import { getServiceClient } from "@/lib/supabase/clients";
import { getEmailProvider } from "@/lib/email/provider";
import { renderTemplate, type TemplateId, type ReservationEmailPayload } from "@/lib/email/templates";
import { buildEmailPayload } from "@/lib/reservations/format";

/**
 * Transactional notifications outbox. Producers enqueue a row; `dispatchDue`
 * (called by the cron route) renders + sends + records status with retry. This
 * decouples "it happened" from "it was sent", gives idempotency + an audit
 * trail, and survives provider outages. Service client throughout (the outbox
 * has no public RLS policy).
 */

const MAX_ATTEMPTS = 5;

export async function enqueueEmail(params: {
  template: TemplateId;
  to: string;
  toName?: string;
  payload: ReservationEmailPayload;
  sendAfter?: Date;
  reservationId?: string;
  orderId?: string;
  customerId?: string;
}): Promise<void> {
  const supabase = getServiceClient();
  if (!supabase) return;
  await supabase.from("notifications").insert({
    channel: "email",
    template: params.template,
    to_address: params.to,
    payload: { ...params.payload, toName: params.toName ?? null },
    send_after: (params.sendAfter ?? new Date()).toISOString(),
    status: "queued",
    reservation_id: params.reservationId ?? null,
    order_id: params.orderId ?? null,
    customer_id: params.customerId ?? null,
  });
}

/** Process due, queued email notifications. Returns counts. */
export async function dispatchDue(limit = 25): Promise<{ sent: number; failed: number }> {
  const supabase = getServiceClient();
  if (!supabase) return { sent: 0, failed: 0 };
  const provider = getEmailProvider();

  const { data: rows } = await supabase
    .from("notifications")
    .select("id, template, to_address, payload, attempts")
    .eq("channel", "email")
    .eq("status", "queued")
    .lte("send_after", new Date().toISOString())
    .order("send_after", { ascending: true })
    .limit(limit);

  let sent = 0;
  let failed = 0;

  for (const row of rows ?? []) {
    const attempts = (row.attempts as number) ?? 0;
    // Optimistic claim: only proceed if we flip queued→sending ourselves.
    const { data: claimed } = await supabase
      .from("notifications")
      .update({ status: "sending", attempts: attempts + 1 })
      .eq("id", row.id)
      .eq("status", "queued")
      .select("id");
    if (!claimed || claimed.length === 0) continue;

    try {
      const payload = (row.payload as ReservationEmailPayload & { toName?: string }) ?? {};
      const { subject, html, text } = renderTemplate(row.template as TemplateId, payload);
      const { id } = await provider.send({
        to: row.to_address as string,
        toName: payload.toName ?? undefined,
        subject,
        html,
        text,
      });
      await supabase
        .from("notifications")
        .update({ status: "sent", provider_id: id ?? null, last_error: null })
        .eq("id", row.id);
      sent++;
    } catch (err) {
      const giveUp = attempts + 1 >= MAX_ATTEMPTS;
      await supabase
        .from("notifications")
        .update({
          status: giveUp ? "failed" : "queued",
          last_error: String(err).slice(0, 500),
          // back off ~5 min before the next attempt
          send_after: new Date(Date.now() + 5 * 60000).toISOString(),
        })
        .eq("id", row.id);
      failed++;
    }
  }

  return { sent, failed };
}

/** Enqueue a transactional email for an existing reservation, by id. */
export async function enqueueReservationEmail(
  reservationId: string,
  template: TemplateId,
  extra?: Partial<ReservationEmailPayload>,
): Promise<void> {
  const supabase = getServiceClient();
  if (!supabase) return;
  const { data } = await supabase
    .from("reservations")
    .select(
      "id, starts_at, party_size, occasion, experience, guest_name, guest_email, manage_token, locations(name)",
    )
    .eq("id", reservationId)
    .maybeSingle();
  if (!data) return;
  const email = data.guest_email as string | null;
  if (!email) return;
  const loc = data.locations as { name: string } | { name: string }[] | null;
  const locationName = (Array.isArray(loc) ? loc[0]?.name : loc?.name) ?? "Bombay Bicycle Chef";

  await enqueueEmail({
    template,
    to: email,
    toName: (data.guest_name as string) ?? undefined,
    reservationId,
    payload: {
      ...buildEmailPayload({
        id: data.id as string,
        startsAt: data.starts_at as string,
        partySize: data.party_size as number,
        occasion: (data.occasion as string | null) ?? null,
        experience: (data.experience as string | null) ?? null,
        guestName: (data.guest_name as string | null) ?? null,
        manageToken: (data.manage_token as string | null) ?? null,
        locationName,
      }),
      ...extra,
    },
  });
}

/**
 * Enqueue 24h reminders for confirmed reservations starting ~tomorrow that don't
 * already have one. Idempotent via the reservation_id + template check.
 */
export async function scheduleReminders(): Promise<{ scheduled: number }> {
  const supabase = getServiceClient();
  if (!supabase) return { scheduled: 0 };

  const from = new Date(Date.now() + 23 * 3600 * 1000).toISOString();
  const to = new Date(Date.now() + 25 * 3600 * 1000).toISOString();

  const { data: due } = await supabase
    .from("reservations")
    .select(
      "id, location_id, party_size, occasion, experience, starts_at, guest_name, guest_email, manage_token, locations(name)",
    )
    .eq("status", "confirmed")
    .gte("starts_at", from)
    .lt("starts_at", to);

  let scheduled = 0;
  for (const r of due ?? []) {
    const email = r.guest_email as string | null;
    if (!email) continue;

    const { data: existing } = await supabase
      .from("notifications")
      .select("id")
      .eq("reservation_id", r.id)
      .eq("template", "reservation_reminder")
      .limit(1);
    if (existing && existing.length > 0) continue;

    const loc = r.locations as { name: string } | { name: string }[] | null;
    const locationName = Array.isArray(loc) ? loc[0]?.name : loc?.name;

    await enqueueEmail({
      template: "reservation_reminder",
      to: email,
      toName: (r.guest_name as string) ?? undefined,
      reservationId: r.id as string,
      payload: buildEmailPayload({
        id: r.id as string,
        startsAt: r.starts_at as string,
        partySize: r.party_size as number,
        occasion: (r.occasion as string | null) ?? null,
        experience: (r.experience as string | null) ?? null,
        guestName: (r.guest_name as string | null) ?? null,
        manageToken: (r.manage_token as string | null) ?? null,
        locationName: locationName ?? "Bombay Bicycle Chef",
      }),
    });
    scheduled++;
  }

  return { scheduled };
}
