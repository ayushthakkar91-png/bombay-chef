import { getSupabase } from "@/lib/supabase/server";
import { eventPopup as fallback, type EventPopupConfig } from "@/config/event-popup";

/**
 * The offers/event pop-up config, sourced from the `marketing_popup` row in
 * Supabase when connected, otherwise the bundled static config. Any DB/network
 * error (including the table not existing yet) also falls back to the static
 * config, so the pop-up never breaks. The DB row overrides the editable fields
 * — text, image AND bullet points; structural fields (routes, match, dates,
 * dismissHours) stay in the static config. Call from a Server Component.
 */
export async function getEventPopup(): Promise<EventPopupConfig> {
  const supabase = getSupabase();
  if (!supabase) return fallback;

  try {
    // select("*") so the loader keeps working whether or not the `details`
    // column (migration 0029) exists yet.
    const { data, error } = await supabase
      .from("marketing_popup")
      .select("*")
      .eq("id", "default")
      .maybeSingle();

    if (error || !data) return fallback;

    // Once the popup is managed in admin, bullets come ONLY from the DB — never
    // the hard-coded config — so an old offer's bullets can't leak through.
    const rawDetails = (data as { details?: unknown }).details;
    const details = Array.isArray(rawDetails)
      ? rawDetails.filter((d): d is string => typeof d === "string" && d.trim().length > 0)
      : [];

    return {
      ...fallback,
      enabled: data.enabled ?? fallback.enabled,
      label: data.label ?? undefined,
      title: data.title || fallback.title,
      message: data.message || fallback.message,
      offerHeadline: data.offer_headline ?? undefined,
      offer: data.offer ?? undefined,
      image: data.image_url ?? undefined,
      details,
      ctaText: data.cta_text || fallback.ctaText,
      ctaHref: data.cta_href || fallback.ctaHref,
      secondaryText: data.secondary_text || fallback.secondaryText,
      secondaryHref: data.secondary_href || fallback.secondaryHref,
      note: data.note ?? undefined,
    };
  } catch {
    return fallback;
  }
}
