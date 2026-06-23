import "server-only";

import { getUserClient } from "@/lib/supabase/clients";

/** Read-side repository for locations + per-location menu availability. */

export type AdminLocation = {
  id: string;
  slug: string;
  name: string;
  address: string;
  phone: string | null;
  hours: string | null;
  atmosphere: string | null;
  imageUrl: string | null;
  isActive: boolean;
  sortOrder: number;
};

export type AvailabilityCell = {
  isAvailable: boolean;
  pricePenceOverride: number | null;
};

/** Matrix of item availability across locations for the availability screen. */
export type AvailabilityMatrix = {
  locations: { id: string; name: string }[];
  items: { id: string; name: string; categoryTitle: string }[];
  /** key `${itemId}:${locationId}` → cell (absent ⇒ uses item default). */
  cells: Record<string, AvailabilityCell>;
};

export async function listLocations(includeInactive = true): Promise<AdminLocation[]> {
  const supabase = await getUserClient();
  if (!supabase) return [];
  let query = supabase
    .from("locations")
    .select(
      "id, slug, name, address, phone, hours, atmosphere, image_url, is_active, sort_order",
    )
    .order("sort_order", { ascending: true });
  if (!includeInactive) query = query.eq("is_active", true);
  const { data, error } = await query;
  if (error || !data) return [];
  return data.map((l) => ({
    id: l.id as string,
    slug: l.slug as string,
    name: l.name as string,
    address: l.address as string,
    phone: (l.phone as string | null) ?? null,
    hours: (l.hours as string | null) ?? null,
    atmosphere: (l.atmosphere as string | null) ?? null,
    imageUrl: (l.image_url as string | null) ?? null,
    isActive: (l.is_active as boolean) ?? true,
    sortOrder: (l.sort_order as number) ?? 0,
  }));
}

export async function getLocation(id: string): Promise<AdminLocation | null> {
  const list = await listLocations(true);
  return list.find((l) => l.id === id) ?? null;
}

export async function getAvailabilityMatrix(): Promise<AvailabilityMatrix> {
  const supabase = await getUserClient();
  const empty: AvailabilityMatrix = { locations: [], items: [], cells: {} };
  if (!supabase) return empty;

  const [{ data: locs }, { data: items }, { data: overrides }] = await Promise.all([
    supabase
      .from("locations")
      .select("id, name")
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("menu_items")
      .select("id, name, sort_order, menu_categories(title)")
      .order("category_id")
      .order("sort_order"),
    supabase
      .from("location_menu_items")
      .select("location_id, item_id, is_available, price_pence_override"),
  ]);

  const cells: Record<string, AvailabilityCell> = {};
  for (const o of overrides ?? []) {
    cells[`${o.item_id as string}:${o.location_id as string}`] = {
      isAvailable: (o.is_available as boolean) ?? true,
      pricePenceOverride: (o.price_pence_override as number | null) ?? null,
    };
  }

  return {
    locations: (locs ?? []).map((l) => ({ id: l.id as string, name: l.name as string })),
    items: (items ?? []).map((i) => {
      // Supabase types a to-one embed as an array; normalise to a single row.
      const embed = i.menu_categories as unknown as { title: string } | { title: string }[] | null;
      const cat = Array.isArray(embed) ? embed[0] : embed;
      return {
        id: i.id as string,
        name: i.name as string,
        categoryTitle: cat?.title ?? "—",
      };
    }),
    cells,
  };
}
