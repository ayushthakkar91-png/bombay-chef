/**
 * The site's primary navigation.
 *
 * Its own module so the desktop navbar and the lazily-loaded mobile menu can
 * share one list without the navbar pulling the mobile menu's animation
 * library back into the initial bundle.
 */
export const LEFT_LINKS = [
  { name: "Menu", href: "/menu" },
  { name: "Locations", href: "/locations" },
  { name: "Account", href: "/account" },
  { name: "Contact", href: "/contact" },
];
