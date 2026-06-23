import { NextResponse } from "next/server";

import { syncOrders, syncReservations, syncRewards } from "@/lib/messaging/sync";
import { dispatchQueued } from "@/lib/messaging/dispatch";

export const dynamic = "force-dynamic";

/**
 * GET /api/cron/messaging — the messaging heartbeat. Observes orders/reservations/
 * rewards and queues consent-gated SMS/WhatsApp, then dispatches the queue with
 * retry. Protected by CRON_SECRET. Schedule every ~15 minutes.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET not configured." }, { status: 503 });
  const provided = new URL(request.url).searchParams.get("secret") || request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (provided !== secret) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const now = Date.now();
  const [orders, reservations, rewards] = await Promise.all([syncOrders(now), syncReservations(now), syncRewards(now)]);
  const dispatched = await dispatchQueued(now);

  return NextResponse.json({ ok: true, queued: { orders, reservations, rewards }, dispatched });
}
