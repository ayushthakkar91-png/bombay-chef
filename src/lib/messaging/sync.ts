import "server-only";

import { getServiceClient } from "@/lib/supabase/clients";
import { enqueueMessage } from "./engine";
import { ORDER_STATUS_TEMPLATE } from "./constants";

const firstName = (full: string | null) => (full ?? "").trim().split(/\s+/)[0] || "there";
const locName = (j: unknown): string => {
  const x = j as { name?: string } | { name?: string }[] | null;
  return (Array.isArray(x) ? x[0]?.name : x?.name) ?? "";
};
const fmtDateTime = (iso: string) => new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
const fmtTime = (iso: string) => new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

/** Observe recent orders and queue a message for each messageable status (dedup'd). */
export async function syncOrders(nowMs: number): Promise<number> {
  const supabase = getServiceClient();
  if (!supabase) return 0;
  const since = new Date(nowMs - 3 * 86400000).toISOString();
  const { data } = await supabase
    .from("orders")
    .select("id, code, status, contact_name, contact_phone, customer_id, locations(name)")
    .in("status", Object.keys(ORDER_STATUS_TEMPLATE))
    .gte("created_at", since);

  let queued = 0;
  for (const o of data ?? []) {
    const key = ORDER_STATUS_TEMPLATE[o.status as string];
    if (!key || !o.contact_phone) continue;
    const r = await enqueueMessage({
      phone: o.contact_phone as string,
      category: "order",
      templateKey: key,
      vars: { name: firstName(o.contact_name as string | null), code: o.code as string, location: locName(o.locations) },
      customerId: (o.customer_id as string | null) ?? null,
      orderId: o.id as string,
      dedupKey: `order:${o.id}:${o.status}`,
    });
    if (r === "queued") queued++;
  }
  return queued;
}

/** Observe reservations: confirmations, 24h + same-day reminders, cancellations. */
export async function syncReservations(nowMs: number): Promise<number> {
  const supabase = getServiceClient();
  if (!supabase) return 0;
  const since = new Date(nowMs - 2 * 86400000).toISOString();
  const win = (h1: number, h2: number) => [new Date(nowMs + h1 * 3600000).toISOString(), new Date(nowMs + h2 * 3600000).toISOString()] as const;

  let queued = 0;
  const enqueue = async (r: Record<string, unknown>, key: string, dedup: string, extra: Record<string, string>) => {
    if (!r.guest_phone) return;
    const out = await enqueueMessage({
      phone: r.guest_phone as string,
      category: "reservation",
      templateKey: key,
      vars: { name: firstName(r.guest_name as string | null), party: String(r.party_size), location: locName(r.locations), ref: `#${(r.id as string).slice(0, 6).toUpperCase()}`, ...extra },
      customerId: (r.customer_id as string | null) ?? null,
      reservationId: r.id as string,
      dedupKey: dedup,
    });
    if (out === "queued") queued++;
  };

  const sel = "id, party_size, starts_at, status, guest_name, guest_phone, customer_id, locations(name)";

  // Confirmations (recently created/confirmed).
  const { data: confirmed } = await supabase.from("reservations").select(sel).eq("status", "confirmed").gte("created_at", since);
  for (const r of confirmed ?? []) await enqueue(r, "reservation_confirmation", `res:${r.id}:confirmation`, { datetime: fmtDateTime(r.starts_at as string) });

  // 24h reminder (starts in ~1 day).
  const [a24, b24] = win(20, 28);
  const { data: rem24 } = await supabase.from("reservations").select(sel).eq("status", "confirmed").gte("starts_at", a24).lte("starts_at", b24);
  for (const r of rem24 ?? []) await enqueue(r, "reservation_reminder_24h", `res:${r.id}:reminder_24h`, { time: fmtTime(r.starts_at as string) });

  // Same-day reminder (starts in the next few hours).
  const [a0, b0] = win(1, 6);
  const { data: remSd } = await supabase.from("reservations").select(sel).eq("status", "confirmed").gte("starts_at", a0).lte("starts_at", b0);
  for (const r of remSd ?? []) await enqueue(r, "reservation_reminder_same_day", `res:${r.id}:reminder_same_day`, { time: fmtTime(r.starts_at as string) });

  // Cancellations.
  const { data: cancelled } = await supabase.from("reservations").select(sel).eq("status", "cancelled").gte("updated_at", since);
  for (const r of cancelled ?? []) await enqueue(r, "reservation_cancellation", `res:${r.id}:cancellation`, { datetime: fmtDateTime(r.starts_at as string) });

  return queued;
}

/** Observe newly-minted personal rewards (loyalty + birthday vouchers) → marketing message. */
export async function syncRewards(nowMs: number): Promise<number> {
  const supabase = getServiceClient();
  if (!supabase) return 0;
  const since = new Date(nowMs - 2 * 86400000).toISOString();
  const { data: codes } = await supabase.from("promo_codes").select("id, code, customer_id, created_at").not("customer_id", "is", null).gte("created_at", since);
  if (!codes?.length) return 0;

  const ids = [...new Set(codes.map((c) => c.customer_id as string))];
  const { data: profiles } = await supabase.from("profiles").select("id, full_name, phone").in("id", ids);
  const profMap = new Map((profiles ?? []).map((p) => [p.id as string, p]));

  let queued = 0;
  for (const c of codes) {
    const p = profMap.get(c.customer_id as string);
    if (!p?.phone) continue;
    const r = await enqueueMessage({
      phone: p.phone as string,
      category: "marketing",
      body: "Good news {{name}}! You've earned a reward at Bombay Bicycle Chef — use code {{code}} on your next order. Reply STOP to opt out.",
      vars: { name: firstName(p.full_name as string | null), code: c.code as string },
      customerId: c.customer_id as string,
      dedupKey: `reward:${c.id}`,
    });
    if (r === "queued") queued++;
  }
  return queued;
}
