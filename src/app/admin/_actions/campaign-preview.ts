"use server";

import { requireRole } from "@/lib/auth/dal";
import { renderTemplate } from "@/lib/email/templates";

/**
 * Render a campaign exactly as a subscriber will receive it.
 *
 * Uses the real template rather than a lookalike, so the preview cannot drift
 * from what is actually sent — including the unsubscribe footer, which is a
 * legal requirement and the thing most worth seeing before you press send.
 *
 * The unsubscribe link is a placeholder here; each recipient gets their own.
 */
export async function renderCampaignPreview(input: {
  subject: string;
  body: string;
  imageUrl?: string;
  ctaUrl?: string;
  ctaLabel?: string;
}): Promise<{ html: string }> {
  await requireRole("restaurant_manager");

  const { html } = renderTemplate("marketing_campaign", {
    guestName: "Priya",
    campaignSubject: input.subject || "Your subject line",
    bodyText: input.body || "Your message will appear here.",
    imageUrl: input.imageUrl || undefined,
    ctaUrl: input.ctaUrl || undefined,
    ctaLabel: input.ctaLabel || undefined,
    unsubscribeUrl: "#preview-unsubscribe",
  });

  return { html };
}
