import "server-only";

import { getServiceClient } from "@/lib/supabase/clients";
import { enqueueOrderEmail } from "@/lib/ordering/notify";
import { ADMIN_NOTIFY_EMAIL } from "@/lib/email/provider";
import { earnForOrder } from "@/lib/loyalty/service";
import { subscribeContact } from "@/lib/marketing/contacts";
import { debitGiftCard } from "@/lib/giftcards/service";
import { flags } from "@/lib/flags";

/**
 * Finalise an order once payment is secured. Extracted from the Stripe webhook
 * so it can be shared by the webhook (card) AND the gift-card-fully-covered path
 * (no Stripe). Idempotent via the atomic status claim — behaviour for ordinary
 * card orders is unchanged.
 */
export async function confirmPaidOrder(
  orderId: string,
  opts: { paymentIntent?: string | null; amountPence: number; method: string },
): Promise<boolean> {
  const supabase = getServiceClient();
  if (!supabase) return false;

  // Atomic claim — only one caller (webhook retry / direct) wins.
  const { data: claimed } = await supabase
    .from("orders")
    .update({ status: "paid", placed_at: new Date().toISOString() })
    .eq("id", orderId)
    .eq("status", "pending_payment")
    .select("id, promo_code, gift_card_id, gift_card_pence")
    .maybeSingle();
  if (!claimed) return false;

  await supabase.from("payments").insert({
    order_id: orderId,
    provider: opts.method === "gift_card" ? "gift_card" : "stripe",
    provider_payment_intent: opts.paymentIntent ?? null,
    amount_pence: opts.amountPence,
    currency: "gbp",
    method: opts.method,
    status: "succeeded",
  });

  // Gift card partial-balance redemption.
  if (claimed.gift_card_id && (claimed.gift_card_pence as number) > 0) {
    await debitGiftCard(claimed.gift_card_id as string, claimed.gift_card_pence as number, orderId);
  }

  if (claimed.promo_code) {
    const { data: promo } = await supabase.from("promo_codes").select("id, used_count").ilike("code", claimed.promo_code as string).maybeSingle();
    if (promo) await supabase.from("promo_codes").update({ used_count: (promo.used_count as number) + 1 }).eq("id", promo.id);
  }

  await enqueueOrderEmail(orderId, "order_confirmation");
  await enqueueOrderEmail(orderId, "admin_new_order", undefined, ADMIN_NOTIFY_EMAIL);
  await earnForOrder(orderId);

  if (flags.marketing) {
    const { data: m } = await supabase.from("orders").select("marketing_opt_in, contact_email, contact_name, customer_id").eq("id", orderId).maybeSingle();
    if (m?.marketing_opt_in && m.contact_email) {
      await subscribeContact(m.contact_email as string, {
        name: (m.contact_name as string) ?? undefined,
        customerId: (m.customer_id as string) ?? undefined,
        source: "checkout",
        sendWelcome: true,
      });
    }
  }
  return true;
}
