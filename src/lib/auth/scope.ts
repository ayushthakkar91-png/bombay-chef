import type { StaffContext } from "./dal";

/**
 * Location ids this staff member may act on, or `null` for org-wide (any
 * location). Mirrors the RLS scoping: an org-wide grant (locationId === null)
 * means all branches; otherwise only the granted location ids.
 */
export function scopedLocationIds(ctx: StaffContext): string[] | null {
  if (ctx.grants.some((g) => g.locationId === null)) return null;
  return Array.from(
    new Set(ctx.grants.map((g) => g.locationId).filter((x): x is string => Boolean(x))),
  );
}

/** Filter a list of locations to those in scope (null scope = all). */
export function filterScoped<T extends { id: string }>(locations: T[], scope: string[] | null): T[] {
  if (scope === null) return locations;
  const set = new Set(scope);
  return locations.filter((l) => set.has(l.id));
}
