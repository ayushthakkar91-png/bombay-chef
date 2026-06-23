import "server-only";

import { getServiceClient } from "@/lib/supabase/clients";

/** Read model for the customer ordering menu, scoped to one location. */

export type OrderModifier = { id: string; name: string; priceDeltaPence: number; isDefault: boolean };
export type OrderModifierGroup = { id: string; name: string; minSelect: number; maxSelect: number; options: OrderModifier[] };
export type OrderMenuItem = {
  id: string;
  name: string;
  description: string | null;
  pricePence: number;
  imageUrl: string | null;
  spiceLevel: number | null;
  dietary: string[];
  allergens: string[];
  modifierGroups: OrderModifierGroup[];
};
export type OrderMenuCategory = { id: string; title: string; items: OrderMenuItem[] };
export type OrderingMenu = {
  locationId: string;
  locationName: string;
  collectionEnabled: boolean;
  deliveryEnabled: boolean;
  minOrderPence: number;
  deliveryFeePence: number;
  prepTimeMin: number;
  deliveryTimeMin: number;
  categories: OrderMenuCategory[];
};

export type OrderLocation = {
  slug: string;
  name: string;
  address: string;
  collectionEnabled: boolean;
  deliveryEnabled: boolean;
  minOrderPence: number;
  deliveryFeePence: number;
  prepTimeMin: number;
  deliveryTimeMin: number;
};

/** Active locations with their ordering config, for the start screen. */
export async function getOrderLocations(): Promise<OrderLocation[]> {
  const supabase = getServiceClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("locations")
    .select("slug, name, address, collection_enabled, delivery_enabled, min_order_pence, delivery_fee_pence, prep_time_min, delivery_time_min, sort_order")
    .eq("is_active", true)
    .order("sort_order");
  return (data ?? []).map((l) => ({
    slug: l.slug as string,
    name: l.name as string,
    address: l.address as string,
    collectionEnabled: l.collection_enabled as boolean,
    deliveryEnabled: l.delivery_enabled as boolean,
    minOrderPence: l.min_order_pence as number,
    deliveryFeePence: l.delivery_fee_pence as number,
    prepTimeMin: (l.prep_time_min as number) ?? 25,
    deliveryTimeMin: (l.delivery_time_min as number) ?? 15,
  }));
}

export async function getOrderingMenu(locationSlug: string): Promise<OrderingMenu | null> {
  const supabase = getServiceClient();
  if (!supabase) return null;

  const { data: loc } = await supabase
    .from("locations")
    .select("id, name, collection_enabled, delivery_enabled, min_order_pence, delivery_fee_pence, prep_time_min, delivery_time_min")
    .eq("slug", locationSlug)
    .eq("is_active", true)
    .maybeSingle();
  if (!loc) return null;
  const locationId = loc.id as string;

  const [{ data: cats }, { data: overrides }] = await Promise.all([
    supabase
      .from("menu_categories")
      .select(
        `id, title, sort_order,
         menu_items(
           id, name, description, price_pence, image_url, spice_level, dietary, is_available, sort_order,
           item_modifier_groups(id, name, min_select, max_select, sort_order,
             item_modifiers(id, name, price_delta_pence, is_default, is_available, sort_order)),
           item_allergens(allergen_id)
         )`,
      )
      .order("sort_order", { ascending: true }),
    supabase.from("location_menu_items").select("item_id, is_available, price_pence_override").eq("location_id", locationId),
  ]);

  const overrideMap = new Map((overrides ?? []).map((o) => [o.item_id as string, o]));

  const categories: OrderMenuCategory[] = (cats ?? [])
    .map((c) => {
      const rawItems = (c.menu_items as Record<string, unknown>[] | null) ?? [];
      const items = rawItems
        .map((it) => mapItem(it, overrideMap))
        .filter((it): it is OrderMenuItem => it !== null)
        .sort((a, b) => a.name.localeCompare(b.name));
      return { id: c.id as string, title: c.title as string, items };
    })
    .filter((c) => c.items.length > 0);

  return {
    locationId,
    locationName: loc.name as string,
    collectionEnabled: loc.collection_enabled as boolean,
    deliveryEnabled: loc.delivery_enabled as boolean,
    minOrderPence: loc.min_order_pence as number,
    deliveryFeePence: loc.delivery_fee_pence as number,
    prepTimeMin: loc.prep_time_min as number,
    deliveryTimeMin: loc.delivery_time_min as number,
    categories,
  };
}

function mapItem(
  it: Record<string, unknown>,
  overrideMap: Map<string, Record<string, unknown>>,
): OrderMenuItem | null {
  const override = overrideMap.get(it.id as string);
  const available = it.is_available !== false && (override?.is_available ?? true) !== false;
  const pricePence = (override?.price_pence_override as number | null) ?? (it.price_pence as number | null);
  if (!available || pricePence == null) return null; // can't be ordered online

  const groups = ((it.item_modifier_groups as Record<string, unknown>[] | null) ?? [])
    .map((g) => ({
      id: g.id as string,
      name: g.name as string,
      minSelect: (g.min_select as number) ?? 0,
      maxSelect: (g.max_select as number) ?? 1,
      sort: (g.sort_order as number) ?? 0,
      options: ((g.item_modifiers as Record<string, unknown>[] | null) ?? [])
        .filter((m) => m.is_available !== false)
        .map((m) => ({
          id: m.id as string,
          name: m.name as string,
          priceDeltaPence: (m.price_delta_pence as number) ?? 0,
          isDefault: (m.is_default as boolean) ?? false,
          sort: (m.sort_order as number) ?? 0,
        }))
        .sort((a, b) => a.sort - b.sort),
    }))
    .filter((g) => g.options.length > 0)
    .sort((a, b) => a.sort - b.sort)
    .map((g) => ({
      id: g.id,
      name: g.name,
      minSelect: g.minSelect,
      maxSelect: g.maxSelect,
      options: g.options.map((o) => ({
        id: o.id,
        name: o.name,
        priceDeltaPence: o.priceDeltaPence,
        isDefault: o.isDefault,
      })),
    }));

  return {
    id: it.id as string,
    name: it.name as string,
    description: (it.description as string | null) ?? null,
    pricePence,
    imageUrl: (it.image_url as string | null) ?? null,
    spiceLevel: (it.spice_level as number | null) ?? null,
    dietary: ((it.dietary as string[] | null) ?? []) as string[],
    allergens: ((it.item_allergens as { allergen_id: string }[] | null) ?? []).map((a) => a.allergen_id),
    modifierGroups: groups,
  };
}
