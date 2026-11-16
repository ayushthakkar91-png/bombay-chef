"use server";

import { revalidatePath } from "next/cache";

import { getServiceClient } from "@/lib/supabase/clients";
import { requireRole } from "@/lib/auth/dal";
import { minutesOfDay } from "@/lib/ordering/hours";
import { type ActionState, fail, ok } from "@/lib/admin/validation";

const DAYS = [0, 1, 2, 3, 4, 5, 6];
const DAY_NAME = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const FULFILMENTS = ["collection", "delivery"] as const;

/**
 * Save a branch's online-ordering hours.
 *
 * Every day and both fulfilments arrive together, as one form, so the saved
 * week is always complete — a partial write would leave a day with no row,
 * which the ordering code reads as "no hours configured" and treats as always
 * open. Getting that wrong means the site takes orders at four in the morning,
 * which is the thing this whole feature exists to stop.
 */
export async function saveOrderingHours(_prev: ActionState, form: FormData): Promise<ActionState> {
  const ctx = await requireRole("restaurant_manager");
  void ctx;

  const locationId = String(form.get("locationId") ?? "").trim();
  if (!locationId) return fail("Which branch?");

  const rows: {
    location_id: string;
    weekday: number;
    fulfilment: string;
    opens_at: string;
    closes_at: string;
    is_open: boolean;
  }[] = [];

  for (const fulfilment of FULFILMENTS) {
    for (const weekday of DAYS) {
      const open = String(form.get(`${fulfilment}-${weekday}-opens`) ?? "").trim();
      const close = String(form.get(`${fulfilment}-${weekday}-closes`) ?? "").trim();
      const isOpen = form.get(`${fulfilment}-${weekday}-open`) === "on";

      // A closed day still needs times stored — the column is NOT NULL, and
      // keeping the old ones means reopening is a single checkbox rather than
      // typing the hours in again.
      const openMins = minutesOfDay(open);
      const closeMins = minutesOfDay(close);
      if (openMins == null || closeMins == null) {
        return fail(`${DAY_NAME[weekday]} ${fulfilment}: enter both times as HH:MM.`);
      }
      if (closeMins <= openMins) {
        return fail(
          `${DAY_NAME[weekday]} ${fulfilment}: closing (${close}) must be after opening (${open}). We don't trade past midnight.`,
        );
      }

      rows.push({
        location_id: locationId,
        weekday,
        fulfilment,
        opens_at: open,
        closes_at: close,
        is_open: isOpen,
      });
    }
  }

  const supabase = getServiceClient();
  if (!supabase) return fail("Can't reach the database.");

  const { error } = await supabase
    .from("location_ordering_hours")
    .upsert(rows, { onConflict: "location_id,weekday,fulfilment" });
  if (error) return fail(`Couldn't save: ${error.message}`);

  revalidatePath("/admin/locations");
  revalidatePath("/order/menu");
  revalidatePath("/order/checkout");

  return ok("Ordering hours saved.");
}
