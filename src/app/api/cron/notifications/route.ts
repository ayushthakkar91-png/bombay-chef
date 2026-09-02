import { NextResponse } from "next/server";

import { dispatchDue } from "@/lib/notifications/outbox";
import { dispatchTelegramDue } from "@/lib/notifications/telegram-dispatch";
import { dispatchFcmDue } from "@/lib/notifications/fcm-dispatch";

export const dynamic = "force-dynamic";

/**
 * GET /api/cron/notifications — the notification worker sweep. Dispatches queued
 * email, telegram AND fcm outbox jobs, retrying failures with backoff and
 * dead-lettering after the max attempts. Wire to a scheduler every minute or two.
 * This is the recovery path: if a paid order's immediate Telegram send failed, or
 * the server/worker restarted, the persisted job is picked up here — no order is
 * ever lost. Protected by CRON_SECRET (header or ?secret=); disabled (503) if unset.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET not configured." }, { status: 503 });

  const { searchParams } = new URL(request.url);
  const provided = searchParams.get("secret") || request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (provided !== secret) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const email = await dispatchDue(50);
  const telegram = await dispatchTelegramDue(50);
  const fcm = await dispatchFcmDue(50);

  return NextResponse.json({ ok: true, email, telegram, fcm });
}
