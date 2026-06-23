"use server";

import { revalidatePath } from "next/cache";

import { getUserClient } from "@/lib/supabase/clients";
import { requireRole } from "@/lib/auth/dal";
import { type ActionState, bool, fail, ok, str } from "@/lib/admin/validation";

/**
 * Per-location availability ("86 a dish at one branch"). Backed by
 * `location_menu_items`; absence of a row means the item uses its base
 * availability. Authorised at `staff` level FOR THAT LOCATION — both here and
 * by the RLS policy "staff write location_menu" (migration 0004).
 */
export async function setLocationAvailability(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const itemId = str(form, "itemId");
  const locationId = str(form, "locationId");
  const next = bool(form, "next");

  if (!itemId || !locationId) return fail("Missing item or location.");

  await requireRole("staff", locationId);

  const supabase = await getUserClient();
  if (!supabase) return fail("Database not connected.");

  // Upsert keeps a single row per (location, item); we only manage availability
  // here. Price overrides are a later-phase concern (kept in the schema).
  const { error } = await supabase
    .from("location_menu_items")
    .upsert(
      { location_id: locationId, item_id: itemId, is_available: next },
      { onConflict: "location_id,item_id" },
    );

  if (error) return fail(error.message);

  revalidatePath("/admin/menu/availability");
  revalidatePath("/menu");
  return ok(next ? "Now available here." : "Marked unavailable here.");
}
