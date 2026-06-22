import { MENU_DATA, type MenuCategory } from "@/data/menu";
import { getSupabase } from "@/lib/supabase/server";

type MenuItemRow = {
  name: string;
  price: string;
  description: string | null;
  is_available: boolean | null;
  sort_order: number | null;
};

type MenuCategoryRow = {
  id: string;
  title: string;
  sort_order: number | null;
  menu_items: MenuItemRow[] | null;
};

/**
 * The full menu, sourced from Supabase when the project is connected, otherwise
 * the bundled seed (`src/data/menu.ts`). Any DB/network error also falls back to
 * the seed, so the menu can never render empty. Call from a Server Component.
 */
export async function getMenu(): Promise<MenuCategory[]> {
  const supabase = getSupabase();
  if (!supabase) return MENU_DATA;

  try {
    const { data, error } = await supabase
      .from("menu_categories")
      .select(
        "id, title, sort_order, menu_items ( name, price, description, is_available, sort_order )"
      )
      .order("sort_order", { ascending: true })
      .returns<MenuCategoryRow[]>();

    if (error || !data || data.length === 0) return MENU_DATA;

    return data.map((cat) => ({
      id: cat.id,
      title: cat.title,
      items: (cat.menu_items ?? [])
        .filter((it) => it.is_available !== false)
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .map((it) => ({
          name: it.name,
          price: it.price,
          description: it.description ?? undefined,
        })),
    }));
  } catch {
    return MENU_DATA;
  }
}
