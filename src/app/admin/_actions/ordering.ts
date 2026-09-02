"use server";

import { revalidatePath } from "next/cache";

import { getServiceClient } from "@/lib/supabase/clients";
import { getStaffContext } from "@/lib/auth/dal";
import { roleAtLeast } from "@/lib/auth/roles";

/**
 * Pause / resume online ordering for a location, with an optional customer-facing
 * message. Any staff member at that location can flip it (short-staffed → pause).
 * Written with the service client after an explicit staff-for-location check.
 */
export async function setAcceptingOrders(
  locationId: string,
  accepting: boolean,
  message: string | null,
): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getStaffContext();
  if (!ctx || !roleAtLeast(ctx.grants, "staff", locationId)) return { ok: false, error: "Not allowed." };

  const supabase = getServiceClient();
  if (!supabase) return { ok: false, error: "Unavailable." };

  const { error } = await supabase
    .from("locations")
    .update({ accepting_orders: accepting, ordering_pause_message: message?.trim() || null })
    .eq("id", locationId);
  if (error) return { ok: false, error: "Couldn't save — please try again." };

  revalidatePath("/admin/orders");
  return { ok: true };
}
