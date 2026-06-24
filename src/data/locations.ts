/** Canonical branch data — one source for the locations page, SEO landing pages,
 *  and JSON-LD schema. (Ordering is gated per branch via `orderingEnabled`,
 *  online table booking via `reservable`.) */

import type { ServiceHours } from "@/lib/hours";

export type Branch = {
  slug: string;
  name: string;
  street: string;
  locality: string;
  postcode: string;
  region: string;
  phone: string;
  /** One schedule per service. The first entry is the dine-in/primary service
   *  and drives the JSON-LD opening hours. */
  hours: ServiceHours[];
  outcodes: string[];
  orderingEnabled: boolean; // only Balham today; flip on as branches go live
  reservable: boolean; // online table booking — only Balham today
  image: string;
  blurb: string;
};

export const BRANCHES: Branch[] = [
  {
    slug: "balham",
    name: "Balham",
    street: "88 Balham High Rd",
    locality: "London",
    postcode: "SW12 9AG",
    region: "Greater London",
    phone: "020 8772 3222",
    hours: [
      {
        label: "Restaurant",
        weekly: [
          { open: "17:30", close: "23:00" }, // Mon
          { open: "17:30", close: "23:00" }, // Tue
          { open: "17:30", close: "23:00" }, // Wed
          { open: "17:30", close: "22:30" }, // Thu
          { open: "17:00", close: "23:00" }, // Fri
          { open: "17:00", close: "23:00" }, // Sat
          { open: "17:00", close: "22:00" }, // Sun
        ],
      },
      {
        label: "Delivery",
        weekly: [
          { open: "17:30", close: "22:00" }, // Mon
          { open: "17:30", close: "22:00" }, // Tue
          { open: "17:30", close: "22:00" }, // Wed
          { open: "17:30", close: "22:30" }, // Thu
          { open: "17:00", close: "22:30" }, // Fri
          { open: "16:00", close: "22:30" }, // Sat
          { open: "16:00", close: "22:00" }, // Sun
        ],
      },
      {
        label: "Takeaway",
        weekly: [
          { open: "16:00", close: "23:00" }, // Mon
          { open: "16:00", close: "23:00" }, // Tue
          { open: "16:00", close: "23:00" }, // Wed
          { open: "17:30", close: "22:30" }, // Thu
          { open: "12:00", close: "23:00" }, // Fri
          { open: "12:00", close: "23:00" }, // Sat
          { open: "12:00", close: "22:00" }, // Sun
        ],
      },
    ],
    outcodes: ["SW12", "SW17", "SW11", "SW16"],
    orderingEnabled: true,
    reservable: true,
    image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=2000&auto=format&fit=crop",
    blurb: "Our Balham kitchen on Balham High Road — the lamplit room where the Bombay Bicycle Chef story began. Collection and delivery across South West London.",
  },
  {
    slug: "battersea",
    name: "Battersea",
    street: "28 Queenstown Rd",
    locality: "London",
    postcode: "SW8 3RX",
    region: "Greater London",
    phone: "020 7720 0500",
    hours: [
      {
        label: "Restaurant",
        weekly: [
          { open: "16:00", close: "23:00" }, // Mon
          { open: "15:00", close: "23:00" }, // Tue
          { open: "15:00", close: "23:00" }, // Wed
          { open: "15:00", close: "23:00" }, // Thu
          { open: "15:00", close: "23:00" }, // Fri
          { open: "12:00", close: "23:00" }, // Sat
          { open: "12:00", close: "22:30" }, // Sun
        ],
      },
    ],
    outcodes: ["SW11", "SW18", "SW8", "SW15"],
    orderingEnabled: false,
    reservable: false,
    image: "https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?q=80&w=2000&auto=format&fit=crop",
    blurb: "On the buzz of Queenstown Road — modern Indian cooking, warm hospitality and a room made for gathering.",
  },
  {
    slug: "kilburn",
    name: "Kilburn",
    street: "24 Willesden Ln",
    locality: "London",
    postcode: "NW6 7ST",
    region: "Greater London",
    phone: "020 7624 0300",
    hours: [
      {
        label: "Restaurant",
        weekly: [
          { open: "16:00", close: "22:45" }, // Mon
          { open: "15:00", close: "22:45" }, // Tue
          { open: "15:00", close: "22:45" }, // Wed
          { open: "15:00", close: "22:45" }, // Thu
          { open: "15:00", close: "22:45" }, // Fri
          { open: "12:00", close: "22:45" }, // Sat
          { open: "12:00", close: "22:15" }, // Sun
        ],
      },
    ],
    outcodes: ["NW6", "NW2", "NW10", "W9"],
    orderingEnabled: false,
    reservable: false,
    image: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?q=80&w=2000&auto=format&fit=crop",
    blurb: "Our North London home on Willesden Lane — the flavours of Bombay, reimagined for a modern London table.",
  },
];

export const branchBySlug = (slug: string): Branch | undefined => BRANCHES.find((b) => b.slug === slug);
