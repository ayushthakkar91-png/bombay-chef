"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/dal";
import { getUserClient } from "@/lib/supabase/clients";
import { listDeliveryTiers } from "@/lib/ordering/delivery-tiers";

export type TierInput = { maxMiles: number; feePence: number };
type Result = { ok: boolean; error?: string };

const MAX_TIERS = 8;

/**
 * Replace the delivery distance bands. Shared by every branch.
 *
 * The bands are stored as a whole rather than edited row by row: there are only
 * ever a handful, and a half-applied edit (two overlapping bands, say) would
 * quietly mis-charge customers.
 */
export async function saveDeliveryTiers(tiers: TierInput[]): Promise<Result> {
  await requireRole("restaurant_manager");

  if (!Array.isArray(tiers) || tiers.length === 0) {
    return { ok: false, error: "Add at least one distance band." };
  }
  if (tiers.length > MAX_TIERS) {
    return { ok: false, error: `That's more than ${MAX_TIERS} bands.` };
  }

  const clean: TierInput[] = [];
  for (const t of tiers) {
    const miles = Number(t.maxMiles);
    const fee = Number(t.feePence);
    if (!Number.isFinite(miles) || miles <= 0) return { ok: false, error: "Every band needs a distance greater than 0 miles." };
    if (miles > 50) return { ok: false, error: "50 miles is the furthest a band can reach." };
    if (!Number.isInteger(fee) || fee < 0) return { ok: false, error: "Every band needs a charge of £0 or more." };
    clean.push({ maxMiles: Math.round(miles * 100) / 100, feePence: fee });
  }

  clean.sort((a, b) => a.maxMiles - b.maxMiles);
  for (let i = 1; i < clean.length; i++) {
    if (clean[i].maxMiles === clean[i - 1].maxMiles) {
      return { ok: false, error: `Two bands both end at ${clean[i].maxMiles} miles — each needs its own distance.` };
    }
  }

  const supabase = await getUserClient();
  if (!supabase) return { ok: false, error: "Database not connected." };

  // Keep the current rows so a failed insert can be rolled back by hand — there
  // is no transaction across two PostgREST calls.
  const previous = await listDeliveryTiers();

  const { error: delError } = await supabase.from("delivery_tiers").delete().gte("max_miles", 0);
  if (delError) return { ok: false, error: "Couldn't clear the old bands." };

  const rows = clean.map((t) => ({ max_miles: t.maxMiles, fee_pence: t.feePence }));
  const { error: insError } = await supabase.from("delivery_tiers").insert(rows);
  if (insError) {
    if (previous.length) {
      await supabase
        .from("delivery_tiers")
        .insert(previous.map((t) => ({ max_miles: t.maxMiles, fee_pence: t.feePence })));
    }
    return { ok: false, error: "Couldn't save the new bands — the old ones have been put back." };
  }

  revalidatePath("/admin/locations");
  return { ok: true };
}
