import { NextResponse } from "next/server";

import { verifyWebhook } from "@/lib/stripe/client";
import { getServiceClient } from "@/lib/supabase/clients";
import { confirmPaidOrder } from "@/lib/ordering/confirm";
import { confirmGiftCardPurchase } from "@/lib/giftcards/service";

export const dynamic = "force-dynamic";

/**
 * POST /api/webhooks/stripe — the ONLY place a Stripe payment is finalised.
 * Verifies the signature, then dispatches by metadata: an order checkout →
 * confirmPaidOrder (mark paid, record payment, debit any gift card, emails,
 * loyalty, marketing); a gift-card purchase → activate + deliver the card.
 * Both are idempotent.
 */
export async function POST(request: Request) {
  const payload = await request.text();
  const event = verifyWebhook(payload, request.headers.get("stripe-signature"));
  if (!event) return NextResponse.json({ error: "Invalid signature." }, { status: 400 });

  const supabase = getServiceClient();
  if (!supabase) return NextResponse.json({ error: "Not configured." }, { status: 503 });

  if ((event.type as string) === "checkout.session.completed") {
    const object = (event.data as { object: Record<string, unknown> }).object;
    const metadata = (object.metadata as Record<string, string> | null) ?? {};
    const paymentIntent = (object.payment_intent as string) ?? null;

    if (metadata.order_id) {
      await confirmPaidOrder(metadata.order_id, { paymentIntent, amountPence: (object.amount_total as number) ?? 0, method: "card" });
    } else if (metadata.gift_card_id) {
      await confirmGiftCardPurchase(metadata.gift_card_id, paymentIntent);
    }
  }

  return NextResponse.json({ received: true });
}
