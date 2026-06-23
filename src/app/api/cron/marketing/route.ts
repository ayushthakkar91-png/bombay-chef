import { NextResponse } from "next/server";

import { recomputeSegments } from "@/lib/marketing/segments";
import { processAbandonedCarts } from "@/lib/marketing/lifecycle";
import { flags } from "@/lib/flags";

export const dynamic = "force-dynamic";

/**
 * GET /api/cron/marketing — recompute customer segments and send abandoned-cart
 * reminders. Protected by CRON_SECRET. Schedule a few times a day. Email delivery
 * is handled by the reservations cron's outbox dispatch.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET not configured." }, { status: 503 });

  const { searchParams } = new URL(request.url);
  const provided = searchParams.get("secret") || request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (provided !== secret) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  if (!flags.marketing) return NextResponse.json({ ok: true, skipped: "marketing disabled" });

  const segments = await recomputeSegments();
  const abandoned = await processAbandonedCarts();
  return NextResponse.json({ ok: true, segments: segments.updated, abandoned });
}
