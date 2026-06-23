import "server-only";

import { getUserClient } from "@/lib/supabase/clients";

/**
 * Read-side repository for the admin menu screens. Uses the session client so
 * RLS applies; public-read policies (0001/0004) let any signed-in staff member
 * see the full menu including unavailable items. Writes live in the route
 * Server Actions (`_actions/*`), also RLS-enforced.
 *
 * Every function returns empty arrays / null on a missing client or error so an
 * admin screen degrades to an empty state rather than crashing.
 */

export type AdminCategory = {
  id: string;
  title: string;
  sortOrder: number;
  itemCount: number;
};

export type AdminItem = {
  id: string;
  categoryId: string;
  categoryTitle: string;
  name: string;
  price: string;
  pricePence: number | null;
  description: string | null;
  isAvailable: boolean;
  isSignature: boolean;
  spiceLevel: number | null;
  dietary: string[];
  calories: number | null;
  imageUrl: string | null;
  sortOrder: number;
  allergens: string[];
};

export type Allergen = { id: string; label: string };

export async function listCategories(): Promise<AdminCategory[]> {
  const supabase = await getUserClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("menu_categories")
    .select("id, title, sort_order, menu_items(count)")
    .order("sort_order", { ascending: true });
  if (error || !data) return [];
  return data.map((c) => ({
    id: c.id as string,
    title: c.title as string,
    sortOrder: (c.sort_order as number) ?? 0,
    // Supabase returns the aggregate as [{ count }]
    itemCount:
      Array.isArray(c.menu_items) && c.menu_items[0]
        ? ((c.menu_items[0] as { count: number }).count ?? 0)
        : 0,
  }));
}

export async function listAllergens(): Promise<Allergen[]> {
  const supabase = await getUserClient();
  if (!supabase) return [];
  const { data } = await supabase.from("allergens").select("id, label").order("label");
  return (data ?? []).map((a) => ({ id: a.id as string, label: a.label as string }));
}

function mapItem(row: Record<string, unknown>): AdminItem {
  const category = row.menu_categories as { id: string; title: string } | null;
  const allergenRows = (row.item_allergens as { allergen_id: string }[] | null) ?? [];
  return {
    id: row.id as string,
    categoryId: (row.category_id as string) ?? category?.id ?? "",
    categoryTitle: category?.title ?? "—",
    name: row.name as string,
    price: (row.price as string) ?? "",
    pricePence: (row.price_pence as number | null) ?? null,
    description: (row.description as string | null) ?? null,
    isAvailable: (row.is_available as boolean) ?? true,
    isSignature: (row.is_signature as boolean) ?? false,
    spiceLevel: (row.spice_level as number | null) ?? null,
    dietary: ((row.dietary as string[] | null) ?? []) as string[],
    calories: (row.calories as number | null) ?? null,
    imageUrl: (row.image_url as string | null) ?? null,
    sortOrder: (row.sort_order as number) ?? 0,
    allergens: allergenRows.map((a) => a.allergen_id),
  };
}

const ITEM_SELECT =
  "id, category_id, name, price, price_pence, description, is_available, is_signature, spice_level, dietary, calories, image_url, sort_order, menu_categories(id, title), item_allergens(allergen_id)";

export async function listItems(categoryId?: string): Promise<AdminItem[]> {
  const supabase = await getUserClient();
  if (!supabase) return [];
  let query = supabase.from("menu_items").select(ITEM_SELECT);
  if (categoryId) query = query.eq("category_id", categoryId);
  const { data, error } = await query
    .order("category_id", { ascending: true })
    .order("sort_order", { ascending: true });
  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map(mapItem);
}

export async function getItem(id: string): Promise<AdminItem | null> {
  const supabase = await getUserClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("menu_items")
    .select(ITEM_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return mapItem(data as Record<string, unknown>);
}
