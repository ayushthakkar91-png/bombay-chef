"use server";

import { revalidatePath } from "next/cache";

import { getUserClient, getServiceClient } from "@/lib/supabase/clients";
import { requireRole } from "@/lib/auth/dal";
import { type ActionState, fail, ok, str } from "@/lib/admin/validation";
import { ORDER_TRANSITIONS, type OrderStatus } from "@/lib/ordering/constants";
import { enqueueOrderEmail } from "@/lib/ordering/notify";
import { isStripeConfigured, createRefund } from "@/lib/stripe/client";
import { reverseEarnForOrder } from "@/lib/loyalty/service";
import type { TemplateId } from "@/lib/email/templates";

function revalidateOrders() {
  revalidatePath("/admin/orders");
  revalidatePath("/admin/orders/live");
  revalidatePath("/admin/orders/history");
}

const STATUS_EMAIL: Partial<Record<OrderStatus, TemplateId>> = {
  accepted: "order_accepted",
  ready_for_collection: "order_ready_collection",
  out_for_delivery: "order_out_for_delivery",
  cancelled: "order_cancelled",
};

/** Advance an order's status (accept / preparing / ready / out / completed / cancel-unpaid). */
export async function setOrderStatus(_p: ActionState, form: FormData): Promise<ActionState> {
  const id = str(form, "id");
  const locationId = str(form, "locationId");
  const next = str(form, "status") as OrderStatus;
  const current = str(form, "current") as OrderStatus;
  if (!id || !locationId) return fail("Missing order.");

  await requireRole("staff", locationId);

  if (!ORDER_TRANSITIONS[current]?.includes(next)) {
    return fail(`Can't move a ${current} order to ${next}.`);
  }

  const supabase = await getUserClient();
  if (!supabase) return fail("Database not connected.");

  // A PAID order can't simply be cancelled — that owes the customer a refund.
  if (next === "cancelled") {
    const { data: pay } = await supabase.from("payments").select("status").eq("order_id", id).maybeSingle();
    if (pay?.status === "succeeded") return fail("This order is paid — use Refund to cancel and return the money.");
  }

  const { error } = await supabase.from("orders").update({ status: next }).eq("id", id);
  if (error) return fail(error.message);

  const tmpl = STATUS_EMAIL[next];
  if (tmpl) await enqueueOrderEmail(id, tmpl);

  revalidateOrders();
  return ok(`Order ${next.replace(/_/g, " ")}.`);
}

/** Refund (full or partial) via Stripe, then mark the order refunded on full. */
export async function refundOrder(_p: ActionState, form: FormData): Promise<ActionState> {
  const id = str(form, "id");
  const locationId = str(form, "locationId");
  const amtRaw = str(form, "amountGbp"); // pounds from the admin form; blank = full
  const amountPence = amtRaw ? Math.round(parseFloat(amtRaw) * 100) : null;
  const reason = str(form, "reason") || "requested_by_customer";
  if (!id || !locationId) return fail("Missing order.");
  if (amtRaw && (!Number.isFinite(amountPence) || (amountPence as number) <= 0)) return fail("Enter a valid refund amount.");

  const ctx = await requireRole("location_manager", locationId);
  const supabase = await getUserClient();
  const service = getServiceClient();
  if (!supabase || !service) return fail("Database not connected.");

  const { data: payment } = await supabase
    .from("payments")
    .select("id, provider_payment_intent, amount_pence, status")
    .eq("order_id", id)
    .maybeSingle();

  if (!payment || payment.status !== "succeeded") {
    return fail("No captured payment to refund. Cancel the order instead.");
  }

  const paid = payment.amount_pence as number;
  const full = amountPence == null || amountPence >= paid;
  const refundAmount = full ? paid : amountPence;
  if (refundAmount <= 0) return fail("Refund amount must be greater than zero.");

  let providerRefundId: string | null = null;
  if (isStripeConfigured() && payment.provider_payment_intent) {
    try {
      const r = await createRefund({
        paymentIntentId: payment.provider_payment_intent as string,
        amountPence: full ? undefined : refundAmount,
        reason,
      });
      providerRefundId = r.id;
    } catch (e) {
      return fail(`Stripe refund failed: ${String(e).slice(0, 160)}`);
    }
  }

  await service.from("refunds").insert({
    payment_id: payment.id,
    amount_pence: refundAmount,
    reason,
    actor_id: ctx.userId,
    provider_refund_id: providerRefundId,
  });
  await supabase.from("payments").update({ status: full ? "refunded" : "partially_refunded" }).eq("id", payment.id);

  if (full) {
    await supabase.from("orders").update({ status: "refunded" }).eq("id", id);
    await enqueueOrderEmail(id, "order_cancelled");
    await reverseEarnForOrder(id); // claw back loyalty points earned on this order
  }

  await service.from("audit_log").insert({
    actor_id: ctx.userId,
    action: "order.refund",
    entity: "orders",
    entity_id: id,
    location_id: locationId,
    after: { amount_pence: refundAmount, full, provider_refund_id: providerRefundId },
  });

  revalidateOrders();
  return ok(full ? "Order refunded." : `Refunded £${(refundAmount / 100).toFixed(2)}.`);
}
