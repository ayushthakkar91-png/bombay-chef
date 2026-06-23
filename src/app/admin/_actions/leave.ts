"use server";

import { revalidatePath } from "next/cache";

import { getUserClient, getServiceClient } from "@/lib/supabase/clients";
import { requireStaff, requireRole } from "@/lib/auth/dal";
import { type ActionState, fail, ok, str } from "@/lib/admin/validation";

const KINDS = ["holiday", "sick", "unpaid", "other"];

/** A staff member raises a leave request for themselves. */
export async function submitLeave(_p: ActionState, form: FormData): Promise<ActionState> {
  const ctx = await requireStaff();
  const startDate = str(form, "startDate");
  const endDate = str(form, "endDate");
  const kind = KINDS.includes(str(form, "kind")) ? str(form, "kind") : "holiday";
  const reason = str(form, "reason") || null;
  if (!startDate || !endDate) return fail("Choose your dates.");
  if (endDate < startDate) return fail("End date must be on or after the start date.");

  // Attach to the member's location so the right managers see it.
  const locationId = ctx.grants.find((g) => g.locationId)?.locationId ?? null;

  const supabase = await getUserClient();
  if (!supabase) return fail("Unavailable.");
  const { error } = await supabase.from("leave_requests").insert({ profile_id: ctx.userId, location_id: locationId, start_date: startDate, end_date: endDate, kind, reason });
  if (error) return fail(error.message);

  revalidatePath("/admin/staff/leave");
  return ok("Leave request submitted.");
}

/** A manager approves or rejects a request at their location. */
export async function decideLeave(_p: ActionState, form: FormData): Promise<ActionState> {
  const id = str(form, "id");
  const locationId = str(form, "locationId");
  const decision = str(form, "decision");
  if (!id) return fail("Missing request.");
  if (!["approved", "rejected"].includes(decision)) return fail("Invalid decision.");
  // Org-wide requests (no location) require a restaurant manager.
  const ctx = locationId ? await requireRole("location_manager", locationId) : await requireRole("restaurant_manager");

  const supabase = await getUserClient();
  if (!supabase) return fail("Unavailable.");
  const { error } = await supabase.from("leave_requests").update({ status: decision, decided_by: ctx.userId, decided_at: new Date().toISOString() }).eq("id", id);
  if (error) return fail(error.message);

  const service = getServiceClient();
  if (service) await service.from("audit_log").insert({ actor_id: ctx.userId, action: `leave.${decision}`, entity: "leave_requests", entity_id: id, location_id: locationId || null });

  revalidatePath("/admin/staff/leave");
  return ok(`Request ${decision}.`);
}

/** A staff member cancels their own pending request. */
export async function cancelLeave(_p: ActionState, form: FormData): Promise<ActionState> {
  const ctx = await requireStaff();
  const id = str(form, "id");
  if (!id) return fail("Missing request.");
  const service = getServiceClient();
  if (!service) return fail("Unavailable.");
  const { data } = await service.from("leave_requests").select("profile_id, status").eq("id", id).maybeSingle();
  if (!data || data.profile_id !== ctx.userId) return fail("Not your request.");
  if (data.status !== "pending") return fail("Only pending requests can be cancelled.");
  await service.from("leave_requests").update({ status: "cancelled" }).eq("id", id);
  revalidatePath("/admin/staff/leave");
  return ok("Request cancelled.");
}
