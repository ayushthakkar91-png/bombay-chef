import { LocalSeoLanding } from "@/components/seo/LocalSeoLanding";
import { branchBySlug } from "@/data/locations";

const branch = branchBySlug("balham")!;

export const metadata = {
  title: "Indian Restaurant in Balham — Best Indian Food, Takeaway & Delivery | Bombay Bicycle Chef",
  description: "Bombay Bicycle Chef is a modern Indian restaurant in Balham (12–14 Bedford Hill, SW12). Dine in, order Indian takeaway or get delivery — the best Indian food near Balham. Book a table or order online.",
  keywords: ["Indian restaurant Balham", "Best Indian restaurant Balham", "Indian takeaway Balham", "Indian food near Balham", "Indian delivery Balham", "Indian food Balham SW12", "Bombay Bicycle Chef Balham"],
  alternates: { canonical: "/indian-restaurant-balham" },
  openGraph: { title: "Indian Restaurant in Balham | Bombay Bicycle Chef", description: "The best Indian food in Balham — dine in, takeaway and delivery. Modern Indian cooking on Bedford Hill, SW12.", url: "/indian-restaurant-balham", images: [branch.image], type: "website" },
};

export default function Page() {
  return <LocalSeoLanding branch={branch} />;
}
