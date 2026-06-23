"use server";

import { isStripeConfigured, createCheckoutSession } from "@/lib/stripe/client";
import { createPendingGiftCard } from "@/lib/giftcards/service";
import { GIFT_MIN_PENCE, GIFT_MAX_PENCE, gbp } from "@/lib/giftcards/constants";
import { getCustomer } from "@/lib/auth/customer";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}

export type GiftBuyInput = {
  amountPence: number;
  recipientName: string;
  recipientEmail: string;
  senderName: string;
  message?: string;
  deliverDate?: string | null; // yyyy-mm-dd; null = immediate
};

export type GiftBuyResult = { ok: true; url: string } | { ok: false; error: string };

export async function buyGiftCard(input: GiftBuyInput): Promise<GiftBuyResult> {
  const amount = Math.round(input.amountPence);
  if (!Number.isFinite(amount) || amount < GIFT_MIN_PENCE || amount > GIFT_MAX_PENCE) {
    return { ok: false, error: `Choose an amount between ${gbp(GIFT_MIN_PENCE)} and ${gbp(GIFT_MAX_PENCE)}.` };
  }
  if (!input.recipientName?.trim()) return { ok: false, error: "Please enter the recipient's name." };
  if (!EMAIL_RE.test(input.recipientEmail ?? "")) return { ok: false, error: "Please enter a valid recipient email." };
  if (!input.senderName?.trim()) return { ok: false, error: "Please enter your name." };
  if (!isStripeConfigured()) return { ok: false, error: "Online payments aren't configured yet." };

  const deliverAt = input.deliverDate ? new Date(`${input.deliverDate}T09:00:00Z`).toISOString() : null;
  const customer = await getCustomer();

  const card = await createPendingGiftCard({
    amountPence: amount,
    recipientName: input.recipientName.trim(),
    recipientEmail: input.recipientEmail.trim(),
    senderName: input.senderName.trim(),
    message: input.message?.trim() || undefined,
    deliverAt,
    purchaserId: customer?.userId ?? null,
  });
  if (!card) return { ok: false, error: "We couldn't start your purchase — please try again." };

  try {
    const session = await createCheckoutSession({
      amountPence: amount,
      orderCode: "GIFT",
      description: `Gift card ${gbp(amount)} for ${input.recipientName.trim()}`,
      successUrl: `${siteUrl()}/gift?purchased=1`,
      cancelUrl: `${siteUrl()}/gift?canceled=1`,
      customerEmail: customer?.email ?? undefined,
      metadata: { gift_card_id: card.id },
    });
    return { ok: true, url: session.url };
  } catch {
    return { ok: false, error: "We couldn't reach the payment provider — please try again." };
  }
}
