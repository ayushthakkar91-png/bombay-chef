"use server";

import { revalidatePath } from "next/cache";

import { requireCustomer } from "@/lib/auth/customer";
import { redeemReward } from "@/lib/loyalty/service";
import { type ActionState, fail, ok, str } from "@/lib/admin/validation";

export async function redeem(_p: ActionState, form: FormData): Promise<ActionState> {
  const ctx = await requireCustomer();
  const rewardId = str(form, "rewardId");
  if (!rewardId) return fail("Missing reward.");

  const res = await redeemReward(ctx.userId, rewardId);
  if (!res.ok) return fail(res.error);

  revalidatePath("/account/rewards");
  return ok(`Redeemed! Use code ${res.code} at checkout. It's saved below too.`);
}
