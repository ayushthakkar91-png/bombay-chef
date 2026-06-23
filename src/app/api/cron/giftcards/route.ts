import { NextResponse } from "next/server";

import { processScheduledGiftCards } from "@/lib/giftcards/service";

export const dynamic = "force-dynamic";

/**
 * GET /api/cron/giftcards — deliver scheduled gift cards whose date has arrived.
 * Protected by CRON_SECRET. Schedule a few times a day. Email delivery itself is
 * dispatched by the reservations cron's outbox.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET not configured." }, { status: 503 });

  const { searchParams } = new URL(request.url);
  const provided = searchParams.get("secret") || request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (provided !== secret) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const result = await processScheduledGiftCards();
  return NextResponse.json({ ok: true, ...result });
}
