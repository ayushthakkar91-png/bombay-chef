"use server";

import { revalidatePath } from "next/cache";

import { getServiceClient } from "@/lib/supabase/clients";
import { requireStaff, requireRole } from "@/lib/auth/dal";
import { ROLES, canGrantRole, rankAt, ROLE_RANK, type Role } from "@/lib/auth/roles";
import { type ActionState, fail, ok, str } from "@/lib/admin/validation";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function audit(action: string, entityId: string, locationId: string | null, after: Record<string, unknown>) {
  const service = getServiceClient();
  if (!service) return;
  const ctx = await requireStaff();
  await service.from("audit_log").insert({ actor_id: ctx.userId, action, entity: "staff_roles", entity_id: entityId, location_id: locationId, after });
}

/** Create a new staff account (or promote an existing user) and grant a role. */
export async function createStaff(_p: ActionState, form: FormData): Promise<ActionState> {
  const ctx = await requireStaff();
  const name = str(form, "name");
  const email = str(form, "email").toLowerCase();
  const password = String(form.get("password") ?? "");
  const role = str(form, "role") as Role;
  const locationId = str(form, "locationId") || null;
  const values = { name, email };

  if (!name) return fail("Enter a name.", { name: "Required." }, values);
  if (!EMAIL_RE.test(email)) return fail("Enter a valid email.", { email: "Invalid." }, values);
  if (password.length < 8) return fail("Password must be at least 8 characters.", { password: "Min 8." }, values);
  if (!ROLES.includes(role)) return fail("Choose a role.");
  if (!canGrantRole(ctx.grants, role, locationId)) return fail("You can't assign that role for that location.");

  const service = getServiceClient();
  if (!service) return fail("Unavailable.");

  // Create the auth user, or promote an existing account with this email.
  let userId: string | null = null;
  const { data: created, error } = await service.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: name } });
  if (created?.user) {
    userId = created.user.id;
  } else if (error) {
    const { data: list } = await service.auth.admin.listUsers({ perPage: 1000 });
    const existing = list?.users.find((u) => u.email?.toLowerCase() === email);
    if (!existing) return fail(error.message, undefined, values);
    userId = existing.id;
  }
  if (!userId) return fail("Couldn't create the account.", undefined, values);

  await service.from("profiles").update({ type: "staff", full_name: name }).eq("id", userId);
  const { error: grantErr } = await service.from("staff_roles").upsert(
    { profile_id: userId, location_id: locationId, role },
    { onConflict: "profile_id,location_id,role", ignoreDuplicates: true },
  );
  if (grantErr) return fail(grantErr.message, undefined, values);

  await audit("staff.create", userId, locationId, { role, email });
  revalidatePath("/admin/staff");
  return ok(`${name} added as ${role.replace(/_/g, " ")}.`);
}

export async function grantRole(_p: ActionState, form: FormData): Promise<ActionState> {
  const ctx = await requireStaff();
  const profileId = str(form, "profileId");
  const role = str(form, "role") as Role;
  const locationId = str(form, "locationId") || null;
  if (!profileId || !ROLES.includes(role)) return fail("Missing details.");
  if (!canGrantRole(ctx.grants, role, locationId)) return fail("You can't assign that role for that location.");

  const service = getServiceClient();
  if (!service) return fail("Unavailable.");
  await service.from("profiles").update({ type: "staff" }).eq("id", profileId);
  const { error } = await service.from("staff_roles").upsert({ profile_id: profileId, location_id: locationId, role }, { onConflict: "profile_id,location_id,role", ignoreDuplicates: true });
  if (error) return fail(error.message);

  await audit("staff.grant", profileId, locationId, { role });
  revalidatePath("/admin/staff");
  return ok("Role added.");
}

export async function revokeRole(_p: ActionState, form: FormData): Promise<ActionState> {
  const ctx = await requireStaff();
  const profileId = str(form, "profileId");
  const role = str(form, "role") as Role;
  const locationId = str(form, "locationId") || null;
  if (!profileId || !ROLES.includes(role)) return fail("Missing details.");
  if (!canGrantRole(ctx.grants, role, locationId)) return fail("You can't change that role for that location.");
  if (profileId === ctx.userId && role === "super_admin") return fail("You can't remove your own super-admin role.");

  const service = getServiceClient();
  if (!service) return fail("Unavailable.");
  let q = service.from("staff_roles").delete().eq("profile_id", profileId).eq("role", role);
  q = locationId ? q.eq("location_id", locationId) : q.is("location_id", null);
  const { error } = await q;
  if (error) return fail(error.message);

  await audit("staff.revoke", profileId, locationId, { role });
  revalidatePath("/admin/staff");
  return ok("Role removed.");
}

/** Remove all of a staff member's access (org-wide managers only). */
export async function deactivateStaff(_p: ActionState, form: FormData): Promise<ActionState> {
  const ctx = await requireRole("restaurant_manager");
  const profileId = str(form, "profileId");
  if (!profileId) return fail("Missing staff member.");
  if (profileId === ctx.userId) return fail("You can't deactivate your own account.");

  const service = getServiceClient();
  if (!service) return fail("Unavailable.");
  // Guard: don't deactivate someone who outranks you anywhere.
  const { data: targetRoles } = await service.from("staff_roles").select("role, location_id").eq("profile_id", profileId);
  for (const r of targetRoles ?? []) {
    if (rankAt(ctx.grants, (r.location_id as string | null) ?? null) < ROLE_RANK[r.role as Role]) {
      return fail("This account holds a role above your own.");
    }
  }

  await service.from("staff_roles").delete().eq("profile_id", profileId);
  await audit("staff.deactivate", profileId, null, { removed: (targetRoles ?? []).length });
  revalidatePath("/admin/staff");
  return ok("Staff access removed.");
}
