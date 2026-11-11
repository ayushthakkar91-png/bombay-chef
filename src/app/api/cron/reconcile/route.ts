import { NextResponse } from "next/server";

import { dispatchAllNotifications, reconcileRecentPending } from "@/lib/ordering/reconcile";

export const dynamic = "force-dynamic";

/**
 * GET /api/cron/reconcile — payment safety sweep. Finds orders from the last 24h
 * still awaiting payment, asks Stripe directly whether they were paid, confirms
 * any that were (sending the kitchen notification), then flushes queued
 * notifications. The backstop for a webhook that never arrived. Runs daily on
 * Vercel Hobby (the tracking page and admin Orders pages recover orders sooner).
 * Protected by CRON_SECRET (Vercel sends it as a Bearer token); 503 if unset.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET not configured." }, { status: 503 });

  const { searchParams } = new URL(request.url);
  const provided = searchParams.get("secret") || request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (provided !== secret) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const result = await reconcileRecentPending({ limit: 50 });
  await dispatchAllNotifications(50);

  return NextResponse.json({ ok: true, ...result });
}
