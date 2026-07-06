import { NextResponse } from "next/server";

import { getServiceClient } from "@/lib/supabase/clients";
import { getDayAvailability } from "@/lib/reservations/availability";
import { rateLimit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

/**
 * GET /api/reservations/availability?location=balham&date=2026-07-04&experience=dinner
 * Returns the open time strings for the public booking flow. Aggregate only —
 * never another guest's details.
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

  if (!slug || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ times: [], error: "Missing or invalid parameters." }, { status: 400 });
  }

  const supabase = getServiceClient();
  if (!supabase) return NextResponse.json({ times: [], reason: "closed" });

  const { data: loc } = await supabase
    .from("locations")
    .select("id")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  if (!loc) return NextResponse.json({ times: [], reason: "closed" });

  const { times, reason } = await getDayAvailability(loc.id as string, date, experience);
  return NextResponse.json({ times, reason });
}
