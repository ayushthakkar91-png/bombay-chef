"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/dal";
import { resendGiftCard, disableGiftCard, refundGiftCard } from "@/lib/giftcards/service";
import { type ActionState, fail, ok, str } from "@/lib/admin/validation";

export async function resendGiftCardAction(_p: ActionState, form: FormData): Promise<ActionState> {
  await requireRole("restaurant_manager");
  const id = str(form, "id");
  if (!id) return fail("Missing card.");
  const res = await resendGiftCard(id);
  if (!res.ok) return fail("This card can't be resent (only active cards).");
  revalidatePath("/admin/giftcards");
  return ok("Gift card resent.");
}

export async function disableGiftCardAction(_p: ActionState, form: FormData): Promise<ActionState> {
  const ctx = await requireRole("restaurant_manager");
  const id = str(form, "id");
  if (!id) return fail("Missing card.");
  await disableGiftCard(id, ctx.userId);
  revalidatePath("/admin/giftcards");
  return ok("Gift card disabled.");
}

export async function refundGiftCardAction(_p: ActionState, form: FormData): Promise<ActionState> {
  const ctx = await requireRole("restaurant_manager");
  const id = str(form, "id");
  if (!id) return fail("Missing card.");
  const res = await refundGiftCard(id, ctx.userId);
  if (!res.ok) return fail(res.error ?? "Couldn't refund.");
  revalidatePath("/admin/giftcards");
  return ok(`Refunded £${((res.refundedPence ?? 0) / 100).toFixed(2)} and voided the card.`);
}
