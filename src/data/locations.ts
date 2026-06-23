/** Canonical branch data — one source for the locations page, SEO landing pages,
 *  and JSON-LD schema. (Ordering is gated per branch via `orderingEnabled`.) */

export type Branch = {
  slug: string;
  name: string;
  street: string;
  locality: string;
  postcode: string;
  region: string;
  phone: string;
  hoursLabel: string;
  opens: string; // 24h "HH:MM"
  closes: string;
  outcodes: string[];
  orderingEnabled: boolean; // only Balham today; flip on as branches go live
  image: string;
  blurb: string;
};

export const BRANCHES: Branch[] = [
  {
    slug: "balham",
    name: "Balham",
    street: "12–14 Bedford Hill",
    locality: "London",
    postcode: "SW12 9RG",
    region: "Greater London",
    phone: "020 8673 3456",
    hoursLabel: "Mon–Sun · 12:00–23:00",
    opens: "12:00",
    closes: "23:00",
    outcodes: ["SW12", "SW17", "SW11", "SW16"],
    orderingEnabled: true,
    image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=2000&auto=format&fit=crop",
    blurb: "Our Balham kitchen on Bedford Hill — the lamplit room where the Bombay Bicycle Chef story began. Collection and delivery across South West London.",
  },
  {
    slug: "battersea",
    name: "Battersea",
    street: "89 Northcote Road",
    locality: "London",
    postcode: "SW11 6PL",
    region: "Greater London",
    phone: "020 7228 1122",
    hoursLabel: "Mon–Sun · 12:00–23:00",
    opens: "12:00",
    closes: "23:00",
    outcodes: ["SW11", "SW18", "SW8", "SW15"],
    orderingEnabled: false,
    image: "https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?q=80&w=2000&auto=format&fit=crop",
    blurb: "On the buzz of Northcote Road — modern Indian cooking, warm hospitality and a room made for gathering.",
  },
  {
    slug: "kilburn",
    name: "Kilburn",
    street: "244 High Road",
    locality: "London",
    postcode: "NW6 2BS",
    region: "Greater London",
    phone: "020 7624 3322",
    hoursLabel: "Mon–Sun · 12:00–23:30",
    opens: "12:00",
    closes: "23:30",
    outcodes: ["NW6", "NW2", "NW10", "W9"],
    orderingEnabled: false,
    image: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?q=80&w=2000&auto=format&fit=crop",
    blurb: "Our North London home on Kilburn High Road — the flavours of Bombay, reimagined for a modern London table.",
  },
];

export const branchBySlug = (slug: string): Branch | undefined => BRANCHES.find((b) => b.slug === slug);
