import "server-only";

import { getServiceClient } from "@/lib/supabase/clients";

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
const API = "https://api.stripe.com/v1";

export function isBillingConfigured(): boolean {
  return Boolean(STRIPE_KEY);
}
function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}

async function stripe(path: string, params: Record<string, string>): Promise<Record<string, unknown>> {
  const res = await fetch(`${API}/${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${STRIPE_KEY}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params).toString(),
  });
  return (await res.json()) as Record<string, unknown>;
}

/** Resolve a Stripe price id for a plan+interval (DB column, else env). */
function priceId(plan: { key: string; stripePriceMonthly?: string | null; stripePriceAnnual?: string | null }, interval: "monthly" | "annual"): string | null {
  const fromDb = interval === "annual" ? plan.stripePriceAnnual : plan.stripePriceMonthly;
  if (fromDb) return fromDb;
  return process.env[`STRIPE_PRICE_${plan.key.toUpperCase()}_${interval.toUpperCase()}`] || null;
}

/** Start a subscription Checkout for a tenant. Returns a hosted URL or an error. */
export async function createSubscriptionCheckout(tenantId: string, interval: "monthly" | "annual", customerEmail?: string): Promise<{ url: string } | { error: string }> {
  if (!STRIPE_KEY) return { error: "Stripe is not configured." };
  const supabase = getServiceClient();
  if (!supabase) return { error: "Unavailable." };

  const { data: t } = await supabase.from("tenants").select("plan_id, plans(key, stripe_price_monthly, stripe_price_annual)").eq("id", tenantId).maybeSingle();
  const plan = (Array.isArray(t?.plans) ? t?.plans[0] : t?.plans) as { key?: string; stripe_price_monthly?: string | null; stripe_price_annual?: string | null } | null;
  if (!plan?.key) return { error: "Set a plan for this tenant first." };
  const price = priceId({ key: plan.key, stripePriceMonthly: plan.stripe_price_monthly, stripePriceAnnual: plan.stripe_price_annual }, interval);
  if (!price) return { error: `No Stripe price configured for ${plan.key}/${interval}.` };

  const session = await stripe("checkout/sessions", {
    mode: "subscription",
    "line_items[0][price]": price,
    "line_items[0][quantity]": "1",
    success_url: `${siteUrl()}/platform/tenants/${tenantId}?billing=ok`,
    cancel_url: `${siteUrl()}/platform/tenants/${tenantId}?billing=cancel`,
    "metadata[tenant_id]": tenantId,
    "metadata[interval]": interval,
    "subscription_data[metadata][tenant_id]": tenantId,
    ...(customerEmail ? { customer_email: customerEmail } : {}),
  });
  const url = session.url as string | undefined;
  return url ? { url } : { error: (session.error as { message?: string } | undefined)?.message ?? "Stripe error." };
}

export async function createBillingPortal(customerId: string): Promise<{ url: string } | { error: string }> {
  if (!STRIPE_KEY) return { error: "Stripe is not configured." };
  const session = await stripe("billing_portal/sessions", { customer: customerId, return_url: `${siteUrl()}/platform/billing` });
  const url = session.url as string | undefined;
  return url ? { url } : { error: "Could not open the billing portal." };
}

/** Apply a Stripe billing webhook event to the subscriptions/tenants tables. */
export async function applyBillingEvent(type: string, object: Record<string, unknown>): Promise<void> {
  const supabase = getServiceClient();
  if (!supabase) return;
  const tenantId = ((object.metadata as Record<string, string> | undefined)?.tenant_id) ?? null;

  if (type === "checkout.session.completed" && object.mode === "subscription" && tenantId) {
    await supabase.from("subscriptions").upsert(
      { tenant_id: tenantId, stripe_customer_id: (object.customer as string) ?? null, stripe_subscription_id: (object.subscription as string) ?? null, status: "active", interval: ((object.metadata as Record<string, string>)?.interval as string) ?? "monthly" },
      { onConflict: "stripe_subscription_id" },
    );
    await supabase.from("tenants").update({ status: "active" }).eq("id", tenantId);
    return;
  }

  if ((type === "customer.subscription.updated" || type === "customer.subscription.deleted")) {
    const sid = object.id as string;
    const status = type === "customer.subscription.deleted" ? "canceled" : (object.status as string);
    const periodEnd = object.current_period_end ? new Date((object.current_period_end as number) * 1000).toISOString() : null;
    await supabase.from("subscriptions").update({ status, current_period_end: periodEnd, cancel_at_period_end: Boolean(object.cancel_at_period_end) }).eq("stripe_subscription_id", sid);
    const subTenant = (object.metadata as Record<string, string> | undefined)?.tenant_id;
    if (subTenant) {
      const tStatus = status === "active" || status === "trialing" ? "active" : status === "past_due" ? "past_due" : "cancelled";
      await supabase.from("tenants").update({ status: tStatus }).eq("id", subTenant);
    }
  }
}
