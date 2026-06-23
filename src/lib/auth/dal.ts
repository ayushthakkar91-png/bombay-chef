import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { getUserClient } from "@/lib/supabase/clients";
import {
  type Role,
  type StaffGrant,
  roleAtLeast,
  topRank,
} from "./roles";

/**
 * Data Access Layer for admin auth (Next.js auth guide pattern). Centralises the
 * "who is this and what may they do" check so every admin page/action goes
 * through one audited path. Memoised per request with React `cache`.
 */

export type StaffContext = {
  userId: string;
  email: string | null;
  fullName: string | null;
  grants: StaffGrant[];
  /** Highest rank held, for coarse UI gating. */
  rank: number;
};

/**
 * Returns the staff context for the current session, or `null` if the visitor
 * is signed out OR signed in but holds no staff role. A bare customer therefore
 * cannot reach the admin panel even with a valid session.
 */
export const getStaffContext = cache(async (): Promise<StaffContext | null> => {
  const supabase = await getUserClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: roleRows } = await supabase
    .from("staff_roles")
    .select("role, location_id")
    .eq("profile_id", user.id);

  if (!roleRows || roleRows.length === 0) return null; // authenticated, not staff

  const grants: StaffGrant[] = roleRows.map((r) => ({
    role: r.role as Role,
    locationId: (r.location_id as string | null) ?? null,
  }));

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  return {
    userId: user.id,
    email: user.email ?? null,
    fullName: profile?.full_name ?? null,
    grants,
    rank: topRank(grants),
  };
});

/** Require a signed-in staff member; otherwise redirect to login. */
export async function requireStaff(): Promise<StaffContext> {
  const ctx = await getStaffContext();
  if (!ctx) redirect("/admin/login");
  return ctx;
}

/**
 * Require at least `min` (optionally at `locationId`). Redirects signed-out
 * users to login and under-privileged staff to the dashboard with a notice.
 * Use this in every mutating Server Action as the secure check — never rely on
 * hidden UI alone.
 */
export async function requireRole(
  min: Role,
  locationId?: string | null,
): Promise<StaffContext> {
  const ctx = await requireStaff();
  if (!roleAtLeast(ctx.grants, min, locationId)) {
    redirect("/admin?denied=1");
  }
  return ctx;
}

/** Non-redirecting check for conditional UI inside an already-guarded page. */
export function can(
  ctx: StaffContext,
  min: Role,
  locationId?: string | null,
): boolean {
  return roleAtLeast(ctx.grants, min, locationId);
}
