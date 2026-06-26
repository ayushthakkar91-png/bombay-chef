"use server";

import { revalidatePath } from "next/cache";

import { getUserClient } from "@/lib/supabase/clients";
import { requireRole } from "@/lib/auth/dal";
import { type ActionState, fail, ok, str, bool } from "@/lib/admin/validation";

export async function updatePopup(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireRole("restaurant_manager");

  const enabled = bool(form, "enabled");
  const label = str(form, "label");
  const title = str(form, "title");
  const message = str(form, "message");
  const offerHeadline = str(form, "offerHeadline");
  const offer = str(form, "offer");
  const imageUrl = str(form, "imageUrl");
  const ctaText = str(form, "ctaText");
  const ctaHref = str(form, "ctaHref");
  const secondaryText = str(form, "secondaryText");
  const secondaryHref = str(form, "secondaryHref");
  const note = str(form, "note");

  const errors: Record<string, string> = {};
  if (!title) errors.title = "A title is required.";
  if (!ctaText) errors.ctaText = "Primary button text is required.";
  if (!ctaHref) errors.ctaHref = "Primary button link is required.";
  if (imageUrl && !/^https?:\/\//i.test(imageUrl)) errors.imageUrl = "Must be a full https:// URL.";
  if (Object.keys(errors).length) return fail("Couldn't save the popup.", errors);

  const supabase = await getUserClient();
  if (!supabase) return fail("Database not connected.");

  const { error } = await supabase.from("marketing_popup").upsert({
    id: "default",
    enabled,
    label: label || null,
    title,
    message,
    offer_headline: offerHeadline || null,
    offer: offer || null,
    image_url: imageUrl || null,
    cta_text: ctaText,
    cta_href: ctaHref,
    secondary_text: secondaryText || "View Menu",
    secondary_href: secondaryHref || "/menu",
    note: note || null,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    // 42P01 = table missing (migration not run yet)
    if (error.code === "42P01")
      return fail("The popup table doesn't exist yet — run migration 0019_marketing_popup.sql in Supabase first.");
    return fail(error.message);
  }

  revalidatePath("/", "layout"); // the popup is rendered from the root layout
  revalidatePath("/admin/marketing/popup");
  return ok("Popup saved.");
}
