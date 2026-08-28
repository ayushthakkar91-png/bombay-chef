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
  // Ordering / delivery config
  collection_enabled: boolean;
  delivery_enabled: boolean;
  delivery_fee_pence: number;
  free_delivery_over_pence: number | null;
  min_order_pence: number;
  delivery_radius_miles: number | null;
  latitude: number | null;
  longitude: number | null;
  prep_time_min: number;
  delivery_time_min: number;
};

/** Parse a "£12.34" / "12.34" money field to integer pence (0 if blank/invalid). */
function gbpToPence(form: FormData, name: string): number {
  const n = parseFloat(str(form, name).replace(/[£,\s]/g, ""));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : 0;
}
/** Optional money field → pence, or null when blank. */
function gbpToPenceOrNull(form: FormData, name: string): number | null {
  const raw = str(form, name).replace(/[£,\s]/g, "");
  if (!raw) return null;
  const n = parseFloat(raw);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
}
/** Optional decimal field (radius/lat/lng) → number or null. */
function floatOrNull(form: FormData, name: string): number | null {
  const raw = str(form, name).trim();
  if (!raw) return null;
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : null;
}

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

  const latitude = floatOrNull(form, "latitude");
  const longitude = floatOrNull(form, "longitude");
  const radius = floatOrNull(form, "deliveryRadiusMiles");
  if (latitude != null && (latitude < -90 || latitude > 90)) errors.latitude = "Latitude must be between −90 and 90.";
  if (longitude != null && (longitude < -180 || longitude > 180)) errors.longitude = "Longitude must be between −180 and 180.";
  if (radius != null && radius <= 0) errors.deliveryRadiusMiles = "Radius must be greater than 0.";
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
    collection_enabled: bool(form, "collectionEnabled"),
    delivery_enabled: bool(form, "deliveryEnabled"),
    delivery_fee_pence: gbpToPence(form, "deliveryFeeGbp"),
    free_delivery_over_pence: gbpToPenceOrNull(form, "freeDeliveryOverGbp"),
    min_order_pence: gbpToPence(form, "minOrderGbp"),
    delivery_radius_miles: radius,
    latitude,
    longitude,
    prep_time_min: intOrNull(form, "prepTimeMin") ?? 30,
    delivery_time_min: intOrNull(form, "deliveryTimeMin") ?? 45,
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
