import { getSupabase } from "@/lib/supabase/server";
import { eventPopup as fallback, type EventPopupConfig } from "@/config/event-popup";

/**
 * The offers/event pop-up config, sourced from the `marketing_popup` row in
 * Supabase when connected, otherwise the bundled static config. Any DB/network
 * error (including the table not existing yet) also falls back to the static
 * config, so the pop-up never breaks. The DB row overrides the editable text +
 * image fields; structural fields (routes, match, dates, dismissHours, details)
 * stay in the static config. Call from a Server Component.
 */
export async function getEventPopup(): Promise<EventPopupConfig> {
  const supabase = getSupabase();
  if (!supabase) return fallback;

  try {
    const { data, error } = await supabase
      .from("marketing_popup")
      .select(
        "enabled, label, title, message, offer_headline, offer, image_url, cta_text, cta_href, secondary_text, secondary_href, note"
      )
      .eq("id", "default")
      .maybeSingle();

    if (error || !data) return fallback;

    return {
      ...fallback,
      enabled: data.enabled ?? fallback.enabled,
      label: data.label ?? undefined,
      title: data.title || fallback.title,
      message: data.message || fallback.message,
      offerHeadline: data.offer_headline ?? undefined,
      offer: data.offer ?? undefined,
      image: data.image_url ?? undefined,
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
