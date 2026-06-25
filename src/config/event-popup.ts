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
  /** Optional fixture shown with team flags. */
  match?: { home: string; away: string; date: string };
  /** Optional bold offer headline, e.g. "Get 50% Off". */
  offerHeadline?: string;
  /** Optional premium offer label, e.g. "Match Night Special". */
  offer?: string;
  /** Short supporting bullet points. */
  details: string[];
  /** Optional reassurance microcopy shown under the CTAs. */
  note?: string;
  ctaText: string;
  ctaHref: string;
  secondaryText: string;
  secondaryHref: string;
  startDate: string | null;
  endDate: string | null;
  /** Exact pathnames the pop-up is allowed to appear on. */
  routes: string[];
  /** Hours to stay hidden after a dismissal (persisted in localStorage).
   *  Set to 0 to show on every page load (no suppression). */
  dismissHours: number;
};

export const eventPopup: EventPopupConfig = {
  enabled: true,
  label: "This week only",
  title: "Live Football at Balham",
  message: "Watch England vs Panama with us over food, drinks and Bombay atmosphere.",
  location: "Balham",
  match: { home: "England", away: "Panama", date: "Saturday 27 June" },
  offerHeadline: "Get 25% Off",
  offer: "On Takeaway Orders",
  details: [
    "Limited tables available",
    "Reserve early for the best seats",
  ],
  ctaText: "Reserve a Table",
  ctaHref: "/reservations?location=balham",
  secondaryText: "View Menu",
  secondaryHref: "/menu",
  note: "Tables are limited",
  startDate: null,
  endDate: null,
  routes: ["/", "/locations/balham"],
  dismissHours: 0, // show on every refresh; set to 24 to suppress for a day after closing
};
