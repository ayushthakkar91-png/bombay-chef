import { MenuHero } from "@/components/menu/MenuHero";
import { StickyMenuNav } from "@/components/menu/StickyMenuNav";
import { FullMenu } from "@/components/menu/FullMenu";
import { DineInTakeaway } from "@/components/menu/DineInTakeaway";
import { ChefRecommendations } from "@/components/menu/ChefRecommendations";
import { DrinksMenu } from "@/components/menu/DrinksMenu";
import { PrivateDining } from "@/components/menu/PrivateDining";
import { MenuCTA } from "@/components/menu/MenuCTA";
import { getMenu } from "@/lib/repositories/menu";

export const metadata = {
  title: "Menu — Modern Indian Dishes for Collection, Delivery & Dine-In | Bombay Bicycle Chef",
  description: "Explore the Bombay Bicycle Chef menu — tandoori grills, signature curries, biryanis and street-food classics crafted daily in London. Order online for collection or delivery, or reserve a table.",
  alternates: { canonical: "/menu" },
  openGraph: { title: "The Menu | Bombay Bicycle Chef", description: "Modern Indian dishes inspired by Bombay, crafted daily in London. Order online or reserve a table.", url: "/menu", type: "website" },
};

// Re-fetch the menu at most once a minute so dashboard edits go live quickly
// without rebuilding. Falls back to seed data when Supabase isn't connected.
export const revalidate = 60;

export default async function MenuPage() {
  const categories = await getMenu();

  return (
    <main className="min-h-screen bg-[#F6F2EA] selection:bg-[#B08A3E] selection:text-[#F6F2EA]">
      <MenuHero />
      <StickyMenuNav />
      <FullMenu categories={categories} />
      <DineInTakeaway />
      <ChefRecommendations />
      <DrinksMenu />
      <PrivateDining />
      <MenuCTA />
    </main>
  );
}
