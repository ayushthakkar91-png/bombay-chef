import { NextResponse } from "next/server";

import { scheduleReminders, dispatchDue } from "@/lib/notifications/outbox";

export const dynamic = "force-dynamic";

/**
 * GET /api/cron/reservations — schedule due 24h reminders, then dispatch the
 * email outbox. Wire to Vercel Cron (or any scheduler) every few minutes.
 * Protected by CRON_SECRET via `?secret=` or `Authorization: Bearer <secret>`.
 * If CRON_SECRET is unset, the endpoint is disabled (returns 503) rather than
 * running unauthenticated.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured." }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const provided =
    searchParams.get("secret") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (provided !== secret) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const reminders = await scheduleReminders();
  const dispatched = await dispatchDue(50);

  return NextResponse.json({ ok: true, reminders, dispatched });
}
