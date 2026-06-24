/**
 * Live-event pop-up configuration.
 *
 * Everything the promo pop-up shows lives here so it can be changed without
 * touching the component. Flip `enabled` to turn it off; edit the copy/links to
 * run a different event. Optional `startDate`/`endDate` bound the campaign
 * window (ISO "YYYY-MM-DD", restaurant local time) — leave null for "show while
 * enabled". `routes` is the exact-match allowlist of pages it may appear on.
 */
export type EventPopupConfig = {
  enabled: boolean;
  /** Small kicker label, e.g. "This week only". */
  label?: string;
  title: string;
  message: string;
  location: string;
  /** Short supporting bullet points. */
  details: string[];
  ctaText: string;
  ctaHref: string;
  secondaryText: string;
  secondaryHref: string;
  startDate: string | null;
  endDate: string | null;
  /** Exact pathnames the pop-up is allowed to appear on. */
  routes: string[];
  /** Hours to stay hidden after a dismissal (persisted in localStorage). */
  dismissHours: number;
};

export const eventPopup: EventPopupConfig = {
  enabled: true,
  label: "This week only",
  title: "Live Football at Balham",
  message: "Watch the match with us over food, drinks and Bombay atmosphere.",
  location: "Balham",
  details: [
    "Balham Branch",
    "Limited tables available",
    "Reserve early for the best seats",
  ],
  ctaText: "Reserve a Table",
  ctaHref: "/reservations?location=balham",
  secondaryText: "View Menu",
  secondaryHref: "/menu",
  startDate: null,
  endDate: null,
  routes: ["/", "/locations/balham"],
  dismissHours: 24,
};
