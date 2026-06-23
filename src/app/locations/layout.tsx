import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Our Restaurants — Balham, Battersea & Kilburn | Bombay Bicycle Chef",
  description: "Find Bombay Bicycle Chef across London — Balham, Battersea and Kilburn. Addresses, opening hours, table reservations and online ordering for collection & delivery.",
  alternates: { canonical: "/locations" },
  openGraph: { title: "Our Restaurants | Bombay Bicycle Chef", description: "Bombay Bicycle Chef across London — Balham, Battersea and Kilburn.", url: "/locations", type: "website" },
};

export default function LocationsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
