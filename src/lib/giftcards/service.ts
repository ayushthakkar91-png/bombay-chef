import "server-only";

import crypto from "node:crypto";

import { getServiceClient } from "@/lib/supabase/clients";
import { enqueueEmail } from "@/lib/notifications/outbox";
import { gbp } from "./constants";

/**
 * Gift card service (privileged, service client). Cards are bearer instruments;
 * codes/view-tokens are unguessable. Balance is tracked on the card with an
 * append-only `gift_card_transactions` ledger for audit + reporting.
 */

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}

function newCode(): string {
  return crypto.randomBytes(8).toString("hex").toUpperCase().match(/.{1,4}/g)!.join("-");
}

/* ---- Purchase --------------------------------------------------------- */

export type GiftPurchaseInput = {
  amountPence: number;
  recipientName: string;
  recipientEmail: string;
  senderName: string;
  message?: string;
  deliverAt?: string | null; // ISO; null/undefined = immediate
  purchaserId?: string | null;
};

export async function createPendingGiftCard(input: GiftPurchaseInput): Promise<{ id: string } | null> {
  const supabase = getServiceClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("gift_cards")
    .insert({
      code: newCode(),
      initial_pence: input.amountPence,
      balance_pence: 0, // funded on payment
      status: "pending",
      recipient_name: input.recipientName,
      recipient_email: input.recipientEmail.toLowerCase(),
      sender_name: input.senderName,
      message: input.message ?? null,
      deliver_at: input.deliverAt ?? null,
      purchaser_id: input.purchaserId ?? null,
    })
    .select("id")
    .single();
  return data ? { id: data.id as string } : null;
}

/** Activate a paid gift card and deliver it (now or on schedule). Idempotent. */
export async function confirmGiftCardPurchase(giftCardId: string, paymentIntent: string | null): Promise<void> {
  const supabase = getServiceClient();
  if (!supabase) return;

  const { data: card } = await supabase
    .from("gift_cards")
    .update({ status: "active", payment_intent: paymentIntent })
    .eq("id", giftCardId)
    .eq("status", "pending")
    .select("id, initial_pence, deliver_at")
    .maybeSingle();
  if (!card) return; // already processed / not pending

  await supabase.from("gift_cards").update({ balance_pence: card.initial_pence }).eq("id", giftCardId);
  await supabase.from("gift_card_transactions").insert({ gift_card_id: giftCardId, delta_pence: card.initial_pence as number, kind: "purchase" });

  const deliverAt = card.deliver_at as string | null;
  if (!deliverAt || new Date(deliverAt).getTime() <= Date.now()) {
    await sendGiftCardEmail(giftCardId);
  }
}

export async function sendGiftCardEmail(giftCardId: string): Promise<void> {
  const supabase = getServiceClient();
  if (!supabase) return;
  const { data: c } = await supabase
    .from("gift_cards")
    .select("code, initial_pence, balance_pence, recipient_name, recipient_email, sender_name, message, view_token")
    .eq("id", giftCardId)
    .maybeSingle();
  if (!c || !c.recipient_email) return;

  await enqueueEmail({
    template: "gift_card_delivery",
    to: c.recipient_email as string,
    toName: (c.recipient_name as string) ?? undefined,
    payload: {
      guestName: (c.recipient_name as string) ?? undefined,
      fromName: (c.sender_name as string) ?? undefined,
      code: c.code as string,
      totalLabel: gbp(c.initial_pence as number),
      bodyText: (c.message as string) ?? undefined,
      ctaUrl: `${siteUrl()}/gift/${c.view_token as string}`,
    },
  });
  await supabase.from("gift_cards").update({ delivered_at: new Date().toISOString() }).eq("id", giftCardId);
}

export type GiftCardView = {
  code: string;
  initialPence: number;
  balancePence: number;
  status: string;
  recipientName: string | null;
  senderName: string | null;
  message: string | null;
};

/** Printable card view by view token (bearer). */
export async function getGiftCardView(token: string): Promise<GiftCardView | null> {
  const supabase = getServiceClient();
  if (!supabase || !token) return null;
  const { data } = await supabase
    .from("gift_cards")
    .select("code, initial_pence, balance_pence, status, recipient_name, sender_name, message")
    .eq("view_token", token)
    .maybeSingle();
  if (!data) return null;
  return {
    code: data.code as string,
    initialPence: data.initial_pence as number,
    balancePence: data.balance_pence as number,
    status: data.status as string,
    recipientName: (data.recipient_name as string | null) ?? null,
    senderName: (data.sender_name as string | null) ?? null,
    message: (data.message as string | null) ?? null,
  };
}

/* ---- Redemption ------------------------------------------------------- */

export type RedemptionPlan = { giftCardId: string; redeemPence: number; balancePence: number } | { error: string };

export async function planRedemption(code: string, totalPence: number): Promise<RedemptionPlan> {
  const supabase = getServiceClient();
  if (!supabase) return { error: "Unavailable." };
  const { data: card } = await supabase
    .from("gift_cards")
    .select("id, balance_pence, status, expires_at")
    .eq("code", code.trim().toUpperCase())
    .maybeSingle();
  if (!card) return { error: "That gift card code isn't recognised." };
  if (card.status === "void") return { error: "That gift card has been disabled." };
  if (card.status !== "active" || (card.balance_pence as number) <= 0) return { error: "That gift card has no balance left." };
  if (card.expires_at && new Date(card.expires_at as string).getTime() < Date.now()) return { error: "That gift card has expired." };

  const balance = card.balance_pence as number;
  return { giftCardId: card.id as string, redeemPence: Math.min(balance, totalPence), balancePence: balance };
}

/** Debit a card for a confirmed order (optimistic concurrency; idempotent-ish). */
export async function debitGiftCard(giftCardId: string, amountPence: number, orderId: string): Promise<void> {
  const supabase = getServiceClient();
  if (!supabase || amountPence <= 0) return;

  // Don't double-debit the same order.
  const { data: existing } = await supabase.from("gift_card_transactions").select("id").eq("gift_card_id", giftCardId).eq("order_id", orderId).eq("kind", "redeem").limit(1);
  if (existing && existing.length) return;

  const { data: card } = await supabase.from("gift_cards").select("balance_pence, status").eq("id", giftCardId).maybeSingle();
  if (!card || card.status !== "active") return;
  const amount = Math.min(amountPence, card.balance_pence as number);
  if (amount <= 0) return;
  const newBalance = (card.balance_pence as number) - amount;

  const { data: updated } = await supabase
    .from("gift_cards")
    .update({ balance_pence: newBalance, status: newBalance === 0 ? "redeemed" : "active" })
    .eq("id", giftCardId)
    .eq("balance_pence", card.balance_pence) // optimistic guard
    .select("id");
  if (!updated || updated.length === 0) return;

  await supabase.from("gift_card_transactions").insert({ gift_card_id: giftCardId, delta_pence: -amount, kind: "redeem", order_id: orderId });
}

/* ---- Admin ------------------------------------------------------------ */

export async function resendGiftCard(giftCardId: string): Promise<{ ok: boolean }> {
  const supabase = getServiceClient();
  if (!supabase) return { ok: false };
  const { data: c } = await supabase.from("gift_cards").select("status").eq("id", giftCardId).maybeSingle();
  if (!c || (c.status !== "active" && c.status !== "redeemed")) return { ok: false };
  await sendGiftCardEmail(giftCardId);
  return { ok: true };
}

export async function disableGiftCard(giftCardId: string, actorId: string): Promise<{ ok: boolean }> {
  const supabase = getServiceClient();
  if (!supabase) return { ok: false };
  await supabase.from("gift_cards").update({ status: "void" }).eq("id", giftCardId).in("status", ["active", "pending"]);
  await supabase.from("gift_card_transactions").insert({ gift_card_id: giftCardId, delta_pence: 0, kind: "void", actor_id: actorId, note: "Disabled by admin" });
  return { ok: true };
}

/** Refund the remaining balance to the purchaser and void the card. */
export async function refundGiftCard(giftCardId: string, actorId: string): Promise<{ ok: boolean; refundedPence?: number; error?: string }> {
  const supabase = getServiceClient();
  if (!supabase) return { ok: false, error: "Unavailable." };
  const { data: c } = await supabase.from("gift_cards").select("balance_pence, status, payment_intent").eq("id", giftCardId).maybeSingle();
  if (!c) return { ok: false, error: "Not found." };
  if (c.status === "void") return { ok: false, error: "Already voided." };
  const balance = c.balance_pence as number;

  if (balance > 0 && c.payment_intent) {
    try {
      const { createRefund } = await import("@/lib/stripe/client");
      await createRefund({ paymentIntentId: c.payment_intent as string, amountPence: balance, reason: "gift_card_refund" });
    } catch (e) {
      return { ok: false, error: `Stripe refund failed: ${String(e).slice(0, 140)}` };
    }
  }

  await supabase.from("gift_cards").update({ balance_pence: 0, status: "void" }).eq("id", giftCardId);
  await supabase.from("gift_card_transactions").insert({ gift_card_id: giftCardId, delta_pence: -balance, kind: "refund", actor_id: actorId, note: "Refunded + voided" });
  return { ok: true, refundedPence: balance };
}

/* ---- Scheduled delivery (cron) ---------------------------------------- */

export async function processScheduledGiftCards(): Promise<{ sent: number }> {
  const supabase = getServiceClient();
  if (!supabase) return { sent: 0 };
  const { data: due } = await supabase
    .from("gift_cards")
    .select("id")
    .eq("status", "active")
    .is("delivered_at", null)
    .not("deliver_at", "is", null)
    .lte("deliver_at", new Date().toISOString())
    .limit(500);
  let sent = 0;
  for (const c of due ?? []) {
    await sendGiftCardEmail(c.id as string);
    sent++;
  }
  return { sent };
}
