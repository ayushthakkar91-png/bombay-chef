"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/dal";
import { getServiceClient } from "@/lib/supabase/clients";
import { adjustPoints } from "@/lib/loyalty/service";
import { type ActionState, fail, ok, str, intOrNull } from "@/lib/admin/validation";

/** Manual loyalty points adjustment by a manager (audited). */
export async function adjustCustomerPoints(_p: ActionState, form: FormData): Promise<ActionState> {
  const ctx = await requireRole("restaurant_manager");
  const customerId = str(form, "customerId");
  const delta = intOrNull(form, "delta");
  const note = str(form, "note") || "Manual adjustment";
  if (!customerId) return fail("Missing customer.");
  if (delta == null || delta === 0) return fail("Enter a non-zero points amount.");

  await adjustPoints(customerId, delta, note, ctx.userId);

  const service = getServiceClient();
  if (service) {
    await service.from("audit_log").insert({
      actor_id: ctx.userId,
      action: "loyalty.adjust",
      entity: "loyalty_ledger",
      entity_id: customerId,
      after: { delta, note },
    });
  }

  revalidatePath(`/admin/customers/${customerId}`);
  return ok(`Adjusted by ${delta > 0 ? "+" : ""}${delta} points.`);
}
