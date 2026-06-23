import "server-only";

import crypto from "node:crypto";

/**
 * Minimal Stripe client over the REST API (no SDK dependency). We use Stripe
 * **hosted Checkout**, so card data is entered on Stripe's domain and never
 * touches our servers, logs, or database — PCI SAQ A. We store only Stripe ids
 * and display-safe metadata (brand, last4).
 *
 * Env: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET.
 */

const SECRET = process.env.STRIPE_SECRET_KEY;
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const API = "https://api.stripe.com/v1";

export function isStripeConfigured(): boolean {
  return Boolean(SECRET);
}

async function stripePost(path: string, params: URLSearchParams): Promise<Record<string, unknown>> {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SECRET}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });
  const data = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    const err = data.error as { message?: string } | undefined;
    throw new Error(err?.message ?? `Stripe error ${res.status}`);
  }
  return data;
}

/**
 * Create a hosted Checkout Session for a single authoritative total. The
 * itemised breakdown lives in our DB + emails; charging one line equal to the
 * server-computed total guarantees the amount can't be manipulated.
 */
export async function createCheckoutSession(opts: {
  amountPence: number;
  orderCode: string;
  description: string;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
  metadata: Record<string, string>;
}): Promise<{ id: string; url: string }> {
  const p = new URLSearchParams();
  p.set("mode", "payment");
  p.set("success_url", opts.successUrl);
  p.set("cancel_url", opts.cancelUrl);
  if (opts.customerEmail) p.set("customer_email", opts.customerEmail);
  p.set("line_items[0][quantity]", "1");
  p.set("line_items[0][price_data][currency]", "gbp");
  p.set("line_items[0][price_data][unit_amount]", String(opts.amountPence));
  p.set("line_items[0][price_data][product_data][name]", `Bombay Bicycle Chef — order ${opts.orderCode}`);
  p.set("line_items[0][price_data][product_data][description]", opts.description.slice(0, 200));
  p.set("payment_intent_data[description]", `Order ${opts.orderCode}`);
  for (const [k, v] of Object.entries(opts.metadata)) {
    p.set(`metadata[${k}]`, v);
    p.set(`payment_intent_data[metadata][${k}]`, v);
  }
  const session = await stripePost("/checkout/sessions", p);
  return { id: session.id as string, url: session.url as string };
}

export async function createRefund(opts: {
  paymentIntentId: string;
  amountPence?: number;
  reason?: string;
}): Promise<{ id: string }> {
  const p = new URLSearchParams();
  p.set("payment_intent", opts.paymentIntentId);
  if (opts.amountPence != null) p.set("amount", String(opts.amountPence));
  if (opts.reason) p.set("metadata[reason]", opts.reason.slice(0, 200));
  const refund = await stripePost("/refunds", p);
  return { id: refund.id as string };
}

/**
 * Verify a Stripe webhook signature and return the parsed event, or null if the
 * signature is invalid / missing the secret. Implements Stripe's signing scheme
 * (HMAC-SHA256 over `${timestamp}.${payload}`) with a timing-safe compare and a
 * 5-minute tolerance against replay.
 */
export function verifyWebhook(payload: string, signatureHeader: string | null): Record<string, unknown> | null {
  if (!WEBHOOK_SECRET || !signatureHeader) return null;

  const parts: Record<string, string> = {};
  for (const piece of signatureHeader.split(",")) {
    const idx = piece.indexOf("=");
    if (idx > 0) parts[piece.slice(0, idx)] = piece.slice(idx + 1);
  }
  const t = parts["t"];
  const v1 = parts["v1"];
  if (!t || !v1) return null;

  // Replay tolerance: 5 minutes.
  if (Math.abs(Date.now() / 1000 - Number(t)) > 300) return null;

  const expected = crypto.createHmac("sha256", WEBHOOK_SECRET).update(`${t}.${payload}`).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(v1);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    return JSON.parse(payload) as Record<string, unknown>;
  } catch {
    return null;
  }
}
