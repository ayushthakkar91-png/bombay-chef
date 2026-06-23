"use server";

import { revalidatePath } from "next/cache";

import { getUserClient, getServiceClient } from "@/lib/supabase/clients";
import { getCustomer, requireCustomer } from "@/lib/auth/customer";
import { syncCustomerConsent } from "@/lib/marketing/contacts";
import { type ActionState, fail, ok, str, bool } from "@/lib/admin/validation";

/* ---- Profile ---------------------------------------------------------- */

export async function updateProfile(_p: ActionState, form: FormData): Promise<ActionState> {
  const ctx = await requireCustomer();
  const fullName = str(form, "fullName");
  const phone = str(form, "phone");
  const birthday = str(form, "birthday"); // yyyy-mm-dd, drives birthday rewards
  if (!fullName) return fail("Please enter your name.", { fullName: "Required." });

  const supabase = await getUserClient();
  if (!supabase) return fail("Unavailable.");
  const { error } = await supabase.from("profiles").update({ full_name: fullName, phone: phone || null }).eq("id", ctx.userId);
  if (error) return fail(error.message);
  // Birthday lives on the customers row (RLS: own).
  await supabase.from("customers").update({ birthday: birthday || null }).eq("id", ctx.userId);

  revalidatePath("/account");
  revalidatePath("/account/preferences");
  return ok("Profile updated.");
}

/** Update marketing consent (append-only log; only records actual changes). */
export async function updateConsent(_p: ActionState, form: FormData): Promise<ActionState> {
  const ctx = await requireCustomer();
  const wantEmail = bool(form, "marketingEmail");
  const wantSms = bool(form, "marketingSms");

  const supabase = await getUserClient();
  if (!supabase) return fail("Unavailable.");

  const rows: { customer_id: string; purpose: string; granted: boolean; source: string }[] = [];
  if (wantEmail !== ctx.marketingEmail) rows.push({ customer_id: ctx.userId, purpose: "marketing_email", granted: wantEmail, source: "preference_centre" });
  if (wantSms !== ctx.marketingSms) rows.push({ customer_id: ctx.userId, purpose: "marketing_sms", granted: wantSms, source: "preference_centre" });

  if (rows.length) {
    const { error } = await supabase.from("consents").insert(rows);
    if (error) return fail(error.message);
  }

  // Keep the operational marketing list in step with email consent.
  if (wantEmail !== ctx.marketingEmail) await syncCustomerConsent(ctx.userId, ctx.email, wantEmail);

  revalidatePath("/account/preferences");
  return ok("Preferences saved.");
}

/* ---- Addresses -------------------------------------------------------- */

export async function saveAddress(_p: ActionState, form: FormData): Promise<ActionState> {
  const ctx = await requireCustomer();
  const id = str(form, "id");
  const line1 = str(form, "line1");
  const city = str(form, "city");
  const postcode = str(form, "postcode");
  const makeDefault = bool(form, "isDefault");
  const values = { line1, line2: str(form, "line2"), city, postcode, label: str(form, "label") };

  const errors: Record<string, string> = {};
  if (!line1) errors.line1 = "Required.";
  if (!city) errors.city = "Required.";
  if (!postcode) errors.postcode = "Required.";
  if (Object.keys(errors).length) return fail("Please complete the address.", errors, values);

  const supabase = await getUserClient();
  if (!supabase) return fail("Unavailable.");

  const row = {
    customer_id: ctx.userId,
    label: str(form, "label") || null,
    line1,
    line2: str(form, "line2") || null,
    city,
    postcode: postcode.toUpperCase(),
  };

  let addressId = id;
  if (id) {
    const { error } = await supabase.from("addresses").update(row).eq("id", id);
    if (error) return fail(error.message, undefined, values);
  } else {
    const { data, error } = await supabase.from("addresses").insert(row).select("id").single();
    if (error || !data) return fail(error?.message ?? "Couldn't save.", undefined, values);
    addressId = data.id as string;
  }

  if (makeDefault && addressId) await applyDefault(ctx.userId, addressId);

  revalidatePath("/account/addresses");
  return ok(id ? "Address updated." : "Address saved.");
}

async function applyDefault(userId: string, addressId: string) {
  const supabase = await getUserClient();
  if (!supabase) return;
  await supabase.from("addresses").update({ is_default: false }).eq("customer_id", userId);
  await supabase.from("addresses").update({ is_default: true }).eq("id", addressId);
  await supabase.from("customers").update({ default_address_id: addressId }).eq("id", userId);
}

export async function setDefaultAddress(_p: ActionState, form: FormData): Promise<ActionState> {
  const ctx = await requireCustomer();
  const id = str(form, "id");
  if (!id) return fail("Missing address.");
  await applyDefault(ctx.userId, id);
  revalidatePath("/account/addresses");
  return ok("Default address set.");
}

export async function deleteAddress(_p: ActionState, form: FormData): Promise<ActionState> {
  const ctx = await requireCustomer();
  const id = str(form, "id");
  if (!id) return fail("Missing address.");
  const supabase = await getUserClient();
  if (!supabase) return fail("Unavailable.");
  const { error } = await supabase.from("addresses").delete().eq("id", id).eq("customer_id", ctx.userId);
  if (error) return fail(error.message);
  revalidatePath("/account/addresses");
  return ok("Address removed.");
}

/* ---- Favourites (called programmatically from the menu heart) --------- */

export async function toggleFavourite(itemId: string): Promise<{ ok: boolean; favourited?: boolean; needsAuth?: boolean }> {
  const ctx = await getCustomer();
  if (!ctx) return { ok: false, needsAuth: true };
  const supabase = await getUserClient();
  if (!supabase) return { ok: false };

  const { data: existing } = await supabase.from("favourites").select("item_id").eq("customer_id", ctx.userId).eq("item_id", itemId).maybeSingle();
  if (existing) {
    await supabase.from("favourites").delete().eq("customer_id", ctx.userId).eq("item_id", itemId);
    revalidatePath("/account/favourites");
    return { ok: true, favourited: false };
  }
  const { error } = await supabase.from("favourites").insert({ customer_id: ctx.userId, item_id: itemId });
  if (error) return { ok: false };
  revalidatePath("/account/favourites");
  return { ok: true, favourited: true };
}

export async function removeFavourite(_p: ActionState, form: FormData): Promise<ActionState> {
  const ctx = await requireCustomer();
  const itemId = str(form, "itemId");
  const supabase = await getUserClient();
  if (!supabase) return fail("Unavailable.");
  await supabase.from("favourites").delete().eq("customer_id", ctx.userId).eq("item_id", itemId);
  revalidatePath("/account/favourites");
  return ok("Removed from favourites.");
}

/* ---- GDPR ------------------------------------------------------------- */

async function queueDataRequest(type: "export" | "erasure"): Promise<ActionState> {
  const ctx = await requireCustomer();
  const service = getServiceClient();
  if (!service) return fail("Unavailable.");

  // Avoid stacking duplicate pending requests of the same type.
  const { data: existing } = await service
    .from("data_requests")
    .select("id")
    .eq("customer_id", ctx.userId)
    .eq("type", type)
    .in("status", ["pending", "verifying", "processing"])
    .limit(1);
  if (existing && existing.length) return ok("We've already got your request and are working on it.");

  const { error } = await service.from("data_requests").insert({ customer_id: ctx.userId, email: ctx.email, type, status: "pending" });
  if (error) return fail(error.message);
  return ok(
    type === "export"
      ? "Data export requested — we'll email it to you within 30 days."
      : "Account deletion requested — we'll confirm by email. Some records are kept where the law requires (e.g. tax).",
  );
}

export async function requestDataExport(): Promise<ActionState> {
  return queueDataRequest("export");
}
export async function requestAccountDeletion(): Promise<ActionState> {
  return queueDataRequest("erasure");
}
