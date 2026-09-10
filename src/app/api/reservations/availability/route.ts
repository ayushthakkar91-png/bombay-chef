import { NextResponse } from "next/server";

import { getServiceClient } from "@/lib/supabase/clients";
import { getDayAvailability, getNextAvailableDay } from "@/lib/reservations/availability";
import { rateLimit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

/**
 * GET /api/reservations/availability?location=balham&date=2026-07-04&experience=dinner
 *   → { times, reason } for that exact day.
 * GET /api/reservations/availability?location=balham&date=2026-07-04&experience=dinner&next=1
 *   → { date, times, requestedReason }: the first day on/after `date` that has
 *     bookable times, so the booking flow can jump straight to it.
 * Aggregate only — never another guest's details.
 */
export async function GET(request: Request) {
  // Generous per-IP cap — normal browsing is a handful of requests; this only
  // stops bulk scraping/hammering.
  if (!(await rateLimit("availability", { limit: 60, windowSec: 60 })).ok) {
    return NextResponse.json({ times: [], error: "Too many requests." }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("location");
  const date = searchParams.get("date");
  const experience = searchParams.get("experience");
  const findNext = searchParams.get("next") === "1";

  if (!slug || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ times: [], error: "Missing or invalid parameters." }, { status: 400 });
  }

  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json(findNext ? { date: null, times: [], requestedReason: "closed" } : { times: [], reason: "closed" });
  }

  const { data: loc } = await supabase
    .from("locations")
    .select("id")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  if (!loc) {
    return NextResponse.json(findNext ? { date: null, times: [], requestedReason: "closed" } : { times: [], reason: "closed" });
  }

  if (findNext) {
    return NextResponse.json(await getNextAvailableDay(loc.id as string, date, experience));
  }

  const { times, reason } = await getDayAvailability(loc.id as string, date, experience);
  return NextResponse.json({ times, reason });
}
