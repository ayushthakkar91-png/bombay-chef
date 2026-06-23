import { NextResponse } from "next/server";
import crypto from "crypto";

import { applyBillingEvent } from "@/lib/saas/billing";

export const dynamic = "force-dynamic";

const SECRET = process.env.STRIPE_BILLING_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET;

/** Verify a Stripe webhook signature (t=…,v1=…) over `${t}.${payload}`. */
function verify(payload: string, header: string | null): Record<string, unknown> | null {
  if (!SECRET) return null;
  if (!header) return null;
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=")));
  const t = parts.t, v1 = parts.v1;
  if (!t || !v1) return null;
  if (Math.abs(Date.now() / 1000 - Number(t)) > 300) return null; // 5-min replay window
  const expected = crypto.createHmac("sha256", SECRET).update(`${t}.${payload}`).digest("hex");
  const a = Buffer.from(expected), b = Buffer.from(v1);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try { return JSON.parse(payload) as Record<string, unknown>; } catch { return null; }
}

/** POST /api/webhooks/stripe-billing — subscription lifecycle → subscriptions/tenants. */
export async function POST(request: Request) {
  const payload = await request.text();
  const event = verify(payload, request.headers.get("stripe-signature"));
  if (!event) return NextResponse.json({ error: "Invalid signature." }, { status: 400 });

  const type = event.type as string;
  const object = (event.data as { object: Record<string, unknown> }).object;
  await applyBillingEvent(type, object);
  return NextResponse.json({ received: true });
}
