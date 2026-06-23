"use server";

import { revalidatePath } from "next/cache";

import { getUserClient } from "@/lib/supabase/clients";
import { requireRole } from "@/lib/auth/dal";
import {
  type ActionState,
  bool,
  fail,
  intOrNull,
  isSlug,
  ok,
  str,
} from "@/lib/admin/validation";

function revalidateLocations() {
  revalidatePath("/admin/locations");
  revalidatePath("/admin/menu/availability");
  revalidatePath("/locations"); // public locations page reads the same table
}

type LocationFields = {
  slug: string;
  name: string;
  address: string;
  phone: string | null;
  hours: string | null;
  atmosphere: string | null;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
};

function parseLocation(form: FormData) {
  const slug = str(form, "slug").toLowerCase();
  const name = str(form, "name");
  const address = str(form, "address");
  const image_url = str(form, "imageUrl") || null;
  const values: Record<string, string> = { slug, name, address, imageUrl: image_url ?? "" };
  const errors: Record<string, string> = {};

  if (!slug) errors.slug = "A slug is required.";
  else if (!isSlug(slug)) errors.slug = "Lowercase letters, numbers and hyphens only.";
  if (!name) errors.name = "A name is required.";
  if (!address) errors.address = "An address is required.";
  if (image_url && !/^https?:\/\//i.test(image_url)) errors.imageUrl = "Must be a full http(s) URL.";

  if (Object.keys(errors).length) return { errors, values };

  const data: LocationFields = {
    slug,
    name,
    address,
    phone: str(form, "phone") || null,
    hours: str(form, "hours") || null,
    atmosphere: str(form, "atmosphere") || null,
    image_url,
    is_active: bool(form, "isActive"),
    sort_order: intOrNull(form, "sortOrder") ?? 0,
  };
  return { data, values };
}

export async function createLocation(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireRole("restaurant_manager");
  const { data, errors, values } = parseLocation(form);
  if (!data) return fail("Couldn't add the location.", errors, values);

  const supabase = await getUserClient();
  if (!supabase) return fail("Database not connected.");

  const { error } = await supabase.from("locations").insert(data);
  if (error) {
    if (error.code === "23505") return fail("That slug is already in use.", { slug: "Already in use." }, values);
    return fail(error.message, undefined, values);
  }
  revalidateLocations();
  return ok(`Location “${data.name}” added.`);
}

export async function updateLocation(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireRole("restaurant_manager");
  const id = str(form, "id");
  if (!id) return fail("Missing location.");

  const { data, errors, values } = parseLocation(form);
  if (!data) return fail("Couldn't save changes.", errors, values);

  const supabase = await getUserClient();
  if (!supabase) return fail("Database not connected.");

  const { error } = await supabase.from("locations").update(data).eq("id", id);
  if (error) return fail(error.message, undefined, values);

  revalidateLocations();
  return ok("Location saved.");
}

export async function toggleLocationActive(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireRole("restaurant_manager");
  const id = str(form, "id");
  const next = bool(form, "next");
  if (!id) return fail("Missing location.");

  const supabase = await getUserClient();
  if (!supabase) return fail("Database not connected.");

  const { error } = await supabase.from("locations").update({ is_active: next }).eq("id", id);
  if (error) return fail(error.message);

  revalidateLocations();
  return ok(next ? "Location activated." : "Location hidden.");
}
