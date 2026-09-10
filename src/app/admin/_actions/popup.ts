"use server";

import { revalidatePath } from "next/cache";

import { getUserClient } from "@/lib/supabase/clients";
import { requireRole } from "@/lib/auth/dal";
import { type ActionState, fail, ok, str, bool } from "@/lib/admin/validation";

const MAX_DETAILS = 6;
const MAX_DETAIL_LEN = 120;

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
  // Bullet points: one per line, blanks dropped, capped in count and length.
  const details = String(form.get("details") ?? "")
    .split(/\r?\n/)
    .map((d) => d.replace(/^\s*[•\-*]\s*/, "").trim())
    .filter(Boolean)
    .slice(0, MAX_DETAILS)
    .map((d) => d.slice(0, MAX_DETAIL_LEN));

  const errors: Record<string, string> = {};
  if (!title) errors.title = "A title is required.";
  if (!ctaText) errors.ctaText = "Primary button text is required.";
  if (!ctaHref) errors.ctaHref = "Primary button link is required.";
  if (imageUrl && !/^https?:\/\//i.test(imageUrl)) errors.imageUrl = "Must be a full https:// URL.";
  if (Object.keys(errors).length) return fail("Couldn't save the popup.", errors);

  const supabase = await getUserClient();
  if (!supabase) return fail("Database not connected.");

  const row = {
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
  };

  let { error } = await supabase.from("marketing_popup").upsert({ ...row, details });
  let detailsSkipped = false;

  // The `details` column arrives in migration 0029. If it isn't there yet, still
  // save everything else rather than failing the whole form.
  if (error && (error.code === "PGRST204" || /details/i.test(error.message))) {
    ({ error } = await supabase.from("marketing_popup").upsert(row));
    detailsSkipped = true;
  }

  if (error) {
    // 42P01 = table missing (migration not run yet)
    if (error.code === "42P01")
      return fail("The popup table doesn't exist yet — run migration 0019_marketing_popup.sql in Supabase first.");
    return fail(error.message);
  }

  revalidatePath("/", "layout"); // the popup is rendered from the root layout
  revalidatePath("/admin/marketing/popup");
  return detailsSkipped
    ? ok("Popup saved — but bullet points need a database update first: run migration 0029_popup_details.sql in Supabase, then save again.")
    : ok("Popup saved.");
}
