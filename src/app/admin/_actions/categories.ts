"use server";

import { revalidatePath } from "next/cache";

import { getUserClient } from "@/lib/supabase/clients";
import { requireRole } from "@/lib/auth/dal";
import {
  type ActionState,
  fail,
  isSlug,
  ok,
  intOrNull,
  str,
} from "@/lib/admin/validation";

function revalidateMenu() {
  revalidatePath("/admin/menu");
  revalidatePath("/admin/menu/categories");
  revalidatePath("/admin/menu/items");
  revalidatePath("/menu"); // public menu reads the same tables
}

export async function createCategory(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireRole("restaurant_manager");

  const id = str(form, "id").toLowerCase();
  const title = str(form, "title");
  const sortOrder = intOrNull(form, "sortOrder") ?? 0;
  const values = { id, title, sortOrder: String(sortOrder) };

  const errors: Record<string, string> = {};
  if (!id) errors.id = "A slug is required.";
  else if (!isSlug(id)) errors.id = "Lowercase letters, numbers and hyphens only (e.g. 'small-plates').";
  if (!title) errors.title = "A display title is required.";
  if (Object.keys(errors).length) return fail("Couldn't add the category.", errors, values);

  const supabase = await getUserClient();
  if (!supabase) return fail("Database not connected.");

  const { error } = await supabase
    .from("menu_categories")
    .insert({ id, title, sort_order: sortOrder });

  if (error) {
    if (error.code === "23505") return fail("A category with that slug already exists.", { id: "Already in use." }, values);
    return fail(error.message);
  }

  revalidateMenu();
  return ok(`Category “${title}” added.`);
}

export async function updateCategory(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireRole("restaurant_manager");

  const id = str(form, "id");
  const title = str(form, "title");
  const sortOrder = intOrNull(form, "sortOrder") ?? 0;

  if (!id) return fail("Missing category.");
  if (!title) return fail("Couldn't save.", { title: "A display title is required." });

  const supabase = await getUserClient();
  if (!supabase) return fail("Database not connected.");

  const { error } = await supabase
    .from("menu_categories")
    .update({ title, sort_order: sortOrder })
    .eq("id", id);

  if (error) return fail(error.message);
  revalidateMenu();
  return ok("Category saved.");
}

export async function deleteCategory(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireRole("restaurant_manager");

  const id = str(form, "id");
  if (!id) return fail("Missing category.");

  const supabase = await getUserClient();
  if (!supabase) return fail("Database not connected.");

  // menu_items cascade on delete (FK in 0001). Surface the count so the UI can
  // warn before this is called; here we just perform it.
  const { error } = await supabase.from("menu_categories").delete().eq("id", id);
  if (error) return fail(error.message);

  revalidateMenu();
  return ok("Category deleted.");
}
