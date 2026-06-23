import { BRANCHES, type Branch } from "@/data/locations";

const SITE = "https://www.bombaybicyclechef.uk";
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function Json({ data }: { data: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}

function address(b: Branch) {
  return { "@type": "PostalAddress", streetAddress: b.street, addressLocality: b.locality, addressRegion: b.region, postalCode: b.postcode, addressCountry: "GB" };
}
function hours(b: Branch) {
  return { "@type": "OpeningHoursSpecification", dayOfWeek: DAYS, opens: b.opens, closes: b.closes };
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
    logo: `${SITE}/logo.png`,
    image: `${SITE}/images/hero/hero-bg.png`,
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
    image: `${SITE}/images/hero/hero-bg.png`,
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
