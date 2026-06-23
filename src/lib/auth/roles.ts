/**
 * Staff role model — the application mirror of the SQL helpers in migration
 * 0002 (`role_rank`, `role_at_least`). RLS is the real boundary; these checks
 * drive UI (showing/hiding actions) and give early, friendly redirects.
 *
 * A grant with `locationId === null` is org-wide and satisfies any location.
 */

export const ROLES = [
  "staff",
  "location_manager",
  "restaurant_manager",
  "super_admin",
] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_RANK: Record<Role, number> = {
  staff: 1,
  location_manager: 2,
  restaurant_manager: 3,
  super_admin: 4,
};

export const ROLE_LABEL: Record<Role, string> = {
  staff: "Staff member",
  location_manager: "Location manager",
  restaurant_manager: "Restaurant manager",
  super_admin: "Super admin",
};

export type StaffGrant = { role: Role; locationId: string | null };

/**
 * Does this set of grants meet `min` (optionally for a specific location)?
 * Org-wide grants satisfy any location; a location-scoped grant satisfies only
 * its own location.
 */
export function roleAtLeast(
  grants: StaffGrant[],
  min: Role,
  locationId?: string | null,
): boolean {
  const need = ROLE_RANK[min];
  return grants.some(
    (g) =>
      ROLE_RANK[g.role] >= need &&
      (g.locationId === null ||
        (locationId != null && g.locationId === locationId)),
  );
}

/** Highest rank held (ignoring location scope) — for coarse UI gating. */
export function topRank(grants: StaffGrant[]): number {
  return grants.reduce((max, g) => Math.max(max, ROLE_RANK[g.role]), 0);
}

/** Effective rank a grant-holder has AT a specific location (org-wide grants count). */
export function rankAt(grants: StaffGrant[], locationId: string | null): number {
  return grants.reduce((max, g) => {
    if (g.locationId === null || (locationId != null && g.locationId === locationId)) {
      return Math.max(max, ROLE_RANK[g.role]);
    }
    return max;
  }, 0);
}

/**
 * Can this actor grant/revoke `role` at `locationId`? You must be at least a
 * location manager there, and you can't grant a role above your own rank.
 */
export function canGrantRole(grants: StaffGrant[], role: Role, locationId: string | null): boolean {
  const rank = rankAt(grants, locationId);
  return rank >= ROLE_RANK.location_manager && rank >= ROLE_RANK[role];
}
