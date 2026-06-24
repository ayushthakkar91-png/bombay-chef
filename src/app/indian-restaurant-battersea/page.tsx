import { LocalSeoLanding } from "@/components/seo/LocalSeoLanding";
import { branchBySlug } from "@/data/locations";

const branch = branchBySlug("battersea")!;

export const metadata = {
  title: "Indian Restaurant in Battersea — Best Indian Food & Dining | Bombay Bicycle Chef",
  description: "Bombay Bicycle Chef is a modern Indian restaurant in Battersea (28 Queenstown Rd, SW8). Dine in on the buzz of Queenstown Road — the best Indian food near Battersea. Book a table.",
  keywords: ["Indian restaurant Battersea", "Best Indian restaurant Battersea", "Indian takeaway Battersea", "Indian food near Battersea", "Indian food Queenstown Road", "Bombay Bicycle Chef Battersea"],
  alternates: { canonical: "/indian-restaurant-battersea" },
  openGraph: { title: "Indian Restaurant in Battersea | Bombay Bicycle Chef", description: "The best Indian food in Battersea — modern Indian cooking on Queenstown Road, SW8.", url: "/indian-restaurant-battersea", images: [branch.image], type: "website" },
};

export default function Page() {
  return <LocalSeoLanding branch={branch} />;
}
