import "server-only";

import { getServiceClient } from "@/lib/supabase/clients";
import { experienceById, BOOKING_LEAD_MINUTES } from "./constants";
import {
  dateTimeToInstant,
  format12h,
  londonDateISO,
  londonHM,
  timeToMinutes,
  weekdayOf,
} from "./time";

/**
 * Availability engine. Capacity-based: each service window (`reservation_slots`
 * row) has a `max_covers` cap; a candidate time is open when the covers of
 * reservations overlapping its turn window are below the cap and no block
 * overlaps. Runs with the service client because it must count ALL reservations
 * (RLS would hide other guests' bookings). It only ever returns aggregate
 * availability — never another guest's details.
 */

type SlotRow = {
  service_start: string;
  service_end: string;
  slot_minutes: number;
  turn_minutes: number;
  max_covers: number;
};
type ResRow = { id: string; starts_at: string; duration_min: number; party_size: number };
type BlockRow = { starts_at: string; ends_at: string };

async function loadDay(locationId: string, dateISO: string) {
  const supabase = getServiceClient();
  if (!supabase) return null;

  const wd = weekdayOf(dateISO);
  // Widen the reservation/block window so turns spilling over midnight still count.
  const dayStart = dateTimeToInstant(dateISO, 0, 0);
  const dayEnd = new Date(dayStart.getTime() + 36 * 3600 * 1000);

  const [slotsRes, resRes, blockRes] = await Promise.all([
    supabase
      .from("reservation_slots")
      .select("service_start, service_end, slot_minutes, turn_minutes, max_covers")
      .eq("location_id", locationId)
      .eq("weekday", wd)
      .eq("is_active", true),
    supabase
      .from("reservations")
      .select("id, starts_at, duration_min, party_size")
      .eq("location_id", locationId)
      .gte("starts_at", new Date(dayStart.getTime() - 6 * 3600 * 1000).toISOString())
      .lt("starts_at", dayEnd.toISOString())
      .in("status", ["pending", "confirmed", "seated"]),
    supabase
      .from("reservation_blocks")
      .select("starts_at, ends_at")
      .eq("location_id", locationId)
      .lt("starts_at", dayEnd.toISOString())
      .gt("ends_at", dayStart.toISOString()),
  ]);

  return {
    slots: (slotsRes.data ?? []) as SlotRow[],
    reservations: (resRes.data ?? []) as ResRow[],
    blocks: (blockRes.data ?? []) as BlockRow[],
  };
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && aEnd > bStart;
}

function coversOverlapping(
  reservations: ResRow[],
  startMs: number,
  turnMin: number,
  excludeId?: string,
): number {
  const endMs = startMs + turnMin * 60000;
  let total = 0;
  for (const r of reservations) {
    if (excludeId && r.id === excludeId) continue;
    const rs = new Date(r.starts_at).getTime();
    const re = rs + (r.duration_min ?? 120) * 60000;
    if (overlaps(rs, re, startMs, endMs)) total += r.party_size;
  }
  return total;
}

function isBlocked(blocks: BlockRow[], startMs: number, turnMin: number): boolean {
  const endMs = startMs + turnMin * 60000;
  return blocks.some((b) =>
    overlaps(new Date(b.starts_at).getTime(), new Date(b.ends_at).getTime(), startMs, endMs),
  );
}

function periodOfSlot(slot: SlotRow): "lunch" | "dinner" {
  return timeToMinutes(slot.service_start) < 16 * 60 ? "lunch" : "dinner";
}

export type TimeOption = { value: string; covers: number; remaining: number };

/**
 * Available times for a (location, date, experience), as display strings like
 * "7:30 PM". `partySize` (optional) filters to slots that can still seat the
 * party; without it, any slot with remaining capacity is returned.
 */
export async function getAvailableTimes(
  locationId: string,
  dateISO: string,
  experienceId: string | null,
  partySize?: number,
): Promise<string[]> {
  const day = await loadDay(locationId, dateISO);
  if (!day) return [];

  const exp = experienceById(experienceId);
  const wd = weekdayOf(dateISO);
  if (exp?.weekendOnly && wd !== 0 && wd !== 6) return [];

  const wantPeriod = exp?.period ?? "all";
  const minLeadMs = Date.now() + BOOKING_LEAD_MINUTES * 60000;
  const need = Math.max(1, partySize ?? 1);

  const out: { value: string; ms: number }[] = [];
  const seen = new Set<string>();

  for (const slot of day.slots) {
    if (wantPeriod !== "all" && periodOfSlot(slot) !== wantPeriod) continue;

    const startMin = timeToMinutes(slot.service_start);
    const endMin = timeToMinutes(slot.service_end);
    for (let mins = startMin; mins < endMin; mins += slot.slot_minutes) {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      const instant = dateTimeToInstant(dateISO, h, m);
      const ms = instant.getTime();
      if (ms < minLeadMs) continue;
      if (isBlocked(day.blocks, ms, slot.turn_minutes)) continue;

      const booked = coversOverlapping(day.reservations, ms, slot.turn_minutes);
      if (booked + need > slot.max_covers) continue;

      const label = format12h(h, m);
      if (seen.has(label)) continue;
      seen.add(label);
      out.push({ value: label, ms });
    }
  }

  return out.sort((a, b) => a.ms - b.ms).map((o) => o.value);
}

/** Whether a specific date has ANY availability for the experience. */
export async function hasAvailability(
  locationId: string,
  dateISO: string,
  experienceId: string | null,
): Promise<boolean> {
  const times = await getAvailableTimes(locationId, dateISO, experienceId);
  return times.length > 0;
}

/**
 * Authoritative check for a concrete instant + party size, used at create/modify
 * time inside the booking transaction path. Returns the matching turn length so
 * the caller can set `duration_min`.
 */
export async function checkSlot(
  locationId: string,
  startsAt: Date,
  partySize: number,
  excludeReservationId?: string,
): Promise<{ ok: boolean; reason?: string; turnMinutes: number }> {
  const dateISO = londonDateISO(startsAt);

  const day = await loadDay(locationId, dateISO);
  if (!day) return { ok: false, reason: "unavailable", turnMinutes: 120 };

  const { h, m } = londonHM(startsAt);
  const minutes = h * 60 + m;

  const slot = day.slots.find((s) => {
    const start = timeToMinutes(s.service_start);
    const end = timeToMinutes(s.service_end);
    return minutes >= start && minutes < end;
  });
  if (!slot) return { ok: false, reason: "outside_hours", turnMinutes: 120 };

  const ms = startsAt.getTime();
  if (ms < Date.now() + BOOKING_LEAD_MINUTES * 60000) {
    return { ok: false, reason: "too_soon", turnMinutes: slot.turn_minutes };
  }
  if (isBlocked(day.blocks, ms, slot.turn_minutes)) {
    return { ok: false, reason: "blocked", turnMinutes: slot.turn_minutes };
  }
  const booked = coversOverlapping(day.reservations, ms, slot.turn_minutes, excludeReservationId);
  if (booked + partySize > slot.max_covers) {
    return { ok: false, reason: "full", turnMinutes: slot.turn_minutes };
  }
  return { ok: true, turnMinutes: slot.turn_minutes };
}
