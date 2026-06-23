import "server-only";

import crypto from "node:crypto";

import { getServiceClient } from "@/lib/supabase/clients";
import { flags } from "@/lib/flags";
import {
  pointsForPence,
  tierForLifetime,
  BIRTHDAY_DISCOUNT_PERCENT,
  BIRTHDAY_EXPIRY_DAYS,
  VOUCHER_EXPIRY_DAYS,
} from "./constants";

/**
 * Loyalty service (privileged, service client). The ledger is append-only and
 * has no public insert policy, so all writes happen here. Vouchers are minted as
 * single-use personal promo_codes so the existing checkout promo path redeems
 * them with no ordering-flow change.
 */

function voucherCode(prefix: string): string {
  return `${prefix}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}

async function recomputeTier(customerId: string) {
  const supabase = getServiceClient();
  if (!supabase) return;
  const { data } = await supabase.from("loyalty_accounts").select("points_lifetime").eq("customer_id", customerId).maybeSingle();
  if (!data) return;
  await supabase.from("loyalty_accounts").update({ tier: tierForLifetime(data.points_lifetime as number) }).eq("customer_id", customerId);
}

/** Earn points for a paid order (called once from the Stripe webhook). */
export async function earnForOrder(orderId: string): Promise<void> {
  if (!flags.loyalty) return;
  const supabase = getServiceClient();
  if (!supabase) return;

  const { data: order } = await supabase
    .from("orders")
    .select("customer_id, subtotal_pence, discount_pence")
    .eq("id", orderId)
    .maybeSingle();
  if (!order || !order.customer_id) return;

  // Idempotency: never earn twice for the same order.
  const { data: existing } = await supabase.from("loyalty_ledger").select("id").eq("order_id", orderId).eq("reason", "earn").limit(1);
  if (existing && existing.length) return;

  const net = (order.subtotal_pence as number) - ((order.discount_pence as number) ?? 0);
  const points = pointsForPence(net);
  if (points <= 0) return;

  await supabase.from("loyalty_ledger").insert({
    customer_id: order.customer_id,
    delta: points,
    reason: "earn",
    order_id: orderId,
  });
  await recomputeTier(order.customer_id as string);
}

/** Reverse earned points when an order is fully refunded. */
export async function reverseEarnForOrder(orderId: string): Promise<void> {
  const supabase = getServiceClient();
  if (!supabase) return;

  const { data: earn } = await supabase.from("loyalty_ledger").select("customer_id, delta").eq("order_id", orderId).eq("reason", "earn").maybeSingle();
  if (!earn) return;
  const { data: already } = await supabase.from("loyalty_ledger").select("id").eq("order_id", orderId).eq("reason", "refund_reversal").limit(1);
  if (already && already.length) return;

  await supabase.from("loyalty_ledger").insert({
    customer_id: earn.customer_id,
    delta: -(earn.delta as number),
    reason: "refund_reversal",
    order_id: orderId,
  });
}

type RedeemResult = { ok: true; code: string } | { ok: false; error: string };

/** Redeem a catalogue reward for the customer: debit points, mint a voucher. */
export async function redeemReward(customerId: string, rewardId: string): Promise<RedeemResult> {
  if (!flags.loyalty) return { ok: false, error: "Rewards aren't available right now." };
  const supabase = getServiceClient();
  if (!supabase) return { ok: false, error: "Unavailable." };

  const { data: reward } = await supabase
    .from("rewards")
    .select("name, kind, points_cost, value_pence, min_tier, is_active")
    .eq("id", rewardId)
    .maybeSingle();
  if (!reward || !reward.is_active) return { ok: false, error: "That reward isn't available." };

  const { data: account } = await supabase.from("loyalty_accounts").select("points_balance, tier").eq("customer_id", customerId).maybeSingle();
  const balance = (account?.points_balance as number) ?? 0;
  if (balance < (reward.points_cost as number)) return { ok: false, error: "You don't have enough points yet." };

  // Map the catalogue reward to a promo voucher.
  let kind: string;
  let value: number;
  if (reward.kind === "amount_off") { kind = "fixed"; value = (reward.value_pence as number) ?? 0; }
  else if (reward.kind === "free_delivery") { kind = "free_delivery"; value = 0; }
  else return { ok: false, error: "That reward can't be redeemed online yet." };

  // Debit points first (append-only ledger; trigger updates the balance).
  const { error: debitErr } = await supabase.from("loyalty_ledger").insert({
    customer_id: customerId,
    delta: -(reward.points_cost as number),
    reason: "redeem",
    note: reward.name as string,
  });
  if (debitErr) return { ok: false, error: "Couldn't redeem — please try again." };

  const code = voucherCode("PTS");
  const ends = new Date(Date.now() + VOUCHER_EXPIRY_DAYS * 86400000).toISOString();
  const { error: mintErr } = await supabase.from("promo_codes").insert({
    code,
    kind,
    value,
    customer_id: customerId,
    global_limit: 1,
    is_active: true,
    ends_at: ends,
  });
  if (mintErr) {
    // Roll back the debit so points aren't lost on a mint failure.
    await supabase.from("loyalty_ledger").insert({ customer_id: customerId, delta: reward.points_cost as number, reason: "adjustment", note: "redeem rollback" });
    return { ok: false, error: "Couldn't issue your voucher — points refunded, please retry." };
  }

  return { ok: true, code };
}

/** Issue a birthday voucher (percent off), once per year, with an email. */
export async function issueBirthdayVoucher(customerId: string, yearStartISO: string): Promise<string | null> {
  const supabase = getServiceClient();
  if (!supabase) return null;

  // Dedup: already issued a birthday voucher since the start of this year?
  const { data: existing } = await supabase
    .from("promo_codes")
    .select("id")
    .eq("customer_id", customerId)
    .ilike("code", "BDAY-%")
    .gte("created_at", yearStartISO)
    .limit(1);
  if (existing && existing.length) return null;

  const code = voucherCode("BDAY");
  const ends = new Date(Date.now() + BIRTHDAY_EXPIRY_DAYS * 86400000).toISOString();
  const { error } = await supabase.from("promo_codes").insert({
    code,
    kind: "percent",
    value: BIRTHDAY_DISCOUNT_PERCENT,
    customer_id: customerId,
    global_limit: 1,
    is_active: true,
    ends_at: ends,
  });
  if (error) return null;

  // Record a (zero-delta) birthday note in the ledger for the activity feed.
  await supabase.from("loyalty_ledger").insert({ customer_id: customerId, delta: 0, reason: "birthday", note: `${BIRTHDAY_DISCOUNT_PERCENT}% birthday reward` });
  return code;
}

/** Manual points adjustment by an admin (audited by the caller). */
export async function adjustPoints(customerId: string, delta: number, note: string, actorId: string): Promise<void> {
  const supabase = getServiceClient();
  if (!supabase) return;
  await supabase.from("loyalty_ledger").insert({ customer_id: customerId, delta, reason: "adjustment", note, actor_id: actorId });
  await recomputeTier(customerId);
}
