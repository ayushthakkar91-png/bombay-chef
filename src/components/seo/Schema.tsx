import { BRANCHES, type Branch } from "@/data/locations";
import { SITE_URL as SITE, LOGO_URL } from "@/lib/site";
import { weeklyToSchema } from "@/lib/hours";

function Json({ data }: { data: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}

function address(b: Branch) {
  return { "@type": "PostalAddress", streetAddress: b.street, addressLocality: b.locality, addressRegion: b.region, postalCode: b.postcode, addressCountry: "GB" };
}
/** Per-day opening hours from the dine-in (primary) service. */
function hours(b: Branch) {
  return weeklyToSchema(b.hours[0].weekly);
}

/** Organization + logo — helps Google associate the brand with its logo. Render
 *  once site-wide (in the root layout). Add a square logo at /public/logo.png. */
export function OrganizationSchema() {
  const data = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE}/#organization`,
    name: "Bombay Bicycle Chef",
    alternateName: "Bombay Bicycle Chef London",
    url: SITE,
    logo: LOGO_URL,
    image: `${SITE}/images/hero/hero-bg.jpg`,
    description: "Modern Indian restaurant group in London — Balham, Battersea and Kilburn. Dine-in, collection and delivery.",
  };
  return <Json data={data} />;
}

/** Brand-level Restaurant + LocalBusiness, with each branch as a department.
 *  Render once on the homepage. */
export function RestaurantSchema() {
  const main = BRANCHES[0];
  const data = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    "@id": `${SITE}/#restaurant`,
    name: "Bombay Bicycle Chef",
    description: "Modern Indian kitchen inspired by old Bombay, with restaurants across London for dine-in, collection and delivery.",
    servesCuisine: "Indian",
    priceRange: "££",
    url: SITE,
    image: `${SITE}/images/hero/hero-bg.jpg`,
    telephone: main.phone,
    hasMenu: `${SITE}/menu`,
    acceptsReservations: "True",
    address: address(main),
    openingHoursSpecification: hours(main),
    department: BRANCHES.map((b) => ({
      "@type": "Restaurant",
      name: `Bombay Bicycle Chef — ${b.name}`,
      url: `${SITE}/locations/${b.slug}`,
      telephone: b.phone,
      servesCuisine: "Indian",
      address: address(b),
      openingHoursSpecification: hours(b),
    })),
    potentialAction: [
      { "@type": "ReserveAction", target: { "@type": "EntryPoint", urlTemplate: `${SITE}/reservations` }, result: { "@type": "FoodEstablishmentReservation", name: "Table reservation" } },
      { "@type": "OrderAction", target: { "@type": "EntryPoint", urlTemplate: `${SITE}/order` }, deliveryMethod: ["http://purl.org/goodrelations/v1#DeliveryModePickUp", "http://purl.org/goodrelations/v1#DeliveryModeOwnFleet"] },
    ],
  };
  return <Json data={data} />;
}

/** WebSite entity — reinforces the site name in results. Render site-wide. */
export function WebSiteSchema() {
  const data = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE}/#website`,
    name: "Bombay Bicycle Chef",
    url: SITE,
    inLanguage: "en-GB",
    publisher: { "@id": `${SITE}/#organization` },
  };
  return <Json data={data} />;
}

/** Breadcrumb trail for a page. Pass the path from Home → current page. */
export function BreadcrumbSchema({ items }: { items: { name: string; path: string }[] }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: `${SITE}${it.path}`,
    })),
  };
  return <Json data={data} />;
}

/** Per-branch Restaurant/LocalBusiness — render on each location landing page. */
export function BranchSchema({ branch }: { branch: Branch }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    "@id": `${SITE}/locations/${branch.slug}/#restaurant`,
    name: `Bombay Bicycle Chef — ${branch.name}`,
    description: branch.blurb,
    servesCuisine: "Indian",
    priceRange: "££",
    url: `${SITE}/locations/${branch.slug}`,
    image: branch.image,
    telephone: branch.phone,
    hasMenu: `${SITE}/menu`,
    acceptsReservations: "True",
    address: address(branch),
    openingHoursSpecification: hours(branch),
    areaServed: branch.outcodes.map((o) => ({ "@type": "AdministrativeArea", name: o })),
    parentOrganization: { "@type": "Restaurant", name: "Bombay Bicycle Chef", "@id": `${SITE}/#restaurant` },
  };
  return <Json data={data} />;
}
