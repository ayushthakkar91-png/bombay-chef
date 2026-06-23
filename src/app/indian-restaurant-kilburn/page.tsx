import { LocalSeoLanding } from "@/components/seo/LocalSeoLanding";
import { branchBySlug } from "@/data/locations";

const branch = branchBySlug("kilburn")!;

export const metadata = {
  title: "Indian Restaurant in Kilburn — Best Indian Food & Dining | Bombay Bicycle Chef",
  description: "Bombay Bicycle Chef is a modern Indian restaurant in Kilburn (244 High Road, NW6). Dine in for modern Indian cooking — the best Indian food near Kilburn. Book a table.",
  keywords: ["Indian restaurant Kilburn", "Best Indian restaurant Kilburn", "Indian takeaway Kilburn", "Indian food near Kilburn", "Indian food Kilburn High Road", "Bombay Bicycle Chef Kilburn"],
  alternates: { canonical: "/indian-restaurant-kilburn" },
  openGraph: { title: "Indian Restaurant in Kilburn | Bombay Bicycle Chef", description: "The best Indian food in Kilburn — modern Indian cooking on Kilburn High Road, NW6.", url: "/indian-restaurant-kilburn", images: [branch.image], type: "website" },
};

export default function Page() {
  return <LocalSeoLanding branch={branch} />;
}
