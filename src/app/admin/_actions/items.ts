"use server";

import { revalidatePath } from "next/cache";

import { getUserClient } from "@/lib/supabase/clients";
import { requireRole } from "@/lib/auth/dal";
import {
  type ActionState,
  bool,
  fail,
  formatPence,
  intOrNull,
  ok,
  parsePence,
  str,
  strList,
} from "@/lib/admin/validation";

function revalidateMenu() {
  revalidatePath("/admin/menu");
  revalidatePath("/admin/menu/items");
  revalidatePath("/admin/menu/availability");
  revalidatePath("/menu");
}

/** Replace an item's allergen set with `allergenIds`. */
async function syncAllergens(itemId: string, allergenIds: string[]) {
  const supabase = await getUserClient();
  if (!supabase) return;
  await supabase.from("item_allergens").delete().eq("item_id", itemId);
  if (allergenIds.length) {
    await supabase
      .from("item_allergens")
      .insert(allergenIds.map((a) => ({ item_id: itemId, allergen_id: a })));
  }
}

type ParsedItem = {
  category_id: string;
  name: string;
  price: string;
  price_pence: number;
  description: string | null;
  is_available: boolean;
  is_signature: boolean;
  spice_level: number | null;
  dietary: string[];
  calories: number | null;
  image_url: string | null;
  sort_order: number;
};

function parseItem(form: FormData): { data?: ParsedItem; errors?: Record<string, string>; values: Record<string, string> } {
  const category_id = str(form, "categoryId");
  const name = str(form, "name");
  const priceRaw = str(form, "price");
  const description = str(form, "description") || null;
  const spice = intOrNull(form, "spiceLevel");
  const calories = intOrNull(form, "calories");
  const sort_order = intOrNull(form, "sortOrder") ?? 0;
  const image_url = str(form, "imageUrl") || null;
  const dietary = strList(form, "dietary");

  const values: Record<string, string> = { categoryId: category_id, name, price: priceRaw, description: description ?? "", imageUrl: image_url ?? "" };
  const errors: Record<string, string> = {};

  if (!category_id) errors.categoryId = "Choose a category.";
  if (!name) errors.name = "A name is required.";

  const { pence, invalid } = parsePence(priceRaw);
  if (priceRaw === "") errors.price = "A price is required.";
  else if (invalid) errors.price = "Enter a price like 11.55.";

  if (spice != null && (spice < 0 || spice > 3)) errors.spiceLevel = "0–3 only.";
  if (image_url && !/^https?:\/\//i.test(image_url)) errors.imageUrl = "Must be a full http(s) URL.";

  if (Object.keys(errors).length) return { errors, values };

  return {
    values,
    data: {
      category_id,
      name,
      price: formatPence(pence),
      price_pence: pence as number,
      description,
      is_available: bool(form, "isAvailable"),
      is_signature: bool(form, "isSignature"),
      spice_level: spice,
      dietary,
      calories,
      image_url,
      sort_order,
    },
  };
}

export async function createItem(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireRole("restaurant_manager");
  const { data, errors, values } = parseItem(form);
  if (!data) return fail("Couldn't add the dish.", errors, values);

  const supabase = await getUserClient();
  if (!supabase) return fail("Database not connected.");

  const { data: inserted, error } = await supabase
    .from("menu_items")
    .insert(data)
    .select("id")
    .single();

  if (error || !inserted) return fail(error?.message ?? "Insert failed.", undefined, values);

  await syncAllergens(inserted.id as string, strList(form, "allergens"));
  revalidateMenu();
  return ok(`“${data.name}” added.`);
}

export async function updateItem(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireRole("restaurant_manager");
  const id = str(form, "id");
  if (!id) return fail("Missing dish.");

  const { data, errors, values } = parseItem(form);
  if (!data) return fail("Couldn't save changes.", errors, values);

  const supabase = await getUserClient();
  if (!supabase) return fail("Database not connected.");

  const { error } = await supabase.from("menu_items").update(data).eq("id", id);
  if (error) return fail(error.message, undefined, values);

  await syncAllergens(id, strList(form, "allergens"));
  revalidateMenu();
  return ok("Dish saved.");
}

export async function deleteItem(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireRole("restaurant_manager");
  const id = str(form, "id");
  if (!id) return fail("Missing dish.");

  const supabase = await getUserClient();
  if (!supabase) return fail("Database not connected.");

  const { error } = await supabase.from("menu_items").delete().eq("id", id);
  if (error) return fail(error.message);

  revalidateMenu();
  return ok("Dish deleted.");
}

/** Quick availability toggle from the items table (no full form). */
export async function toggleItemAvailable(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireRole("restaurant_manager");
  const id = str(form, "id");
  const next = bool(form, "next");
  if (!id) return fail("Missing dish.");

  const supabase = await getUserClient();
  if (!supabase) return fail("Database not connected.");

  const { error } = await supabase.from("menu_items").update({ is_available: next }).eq("id", id);
  if (error) return fail(error.message);

  revalidateMenu();
  return ok(next ? "Dish marked available." : "Dish marked unavailable.");
}
