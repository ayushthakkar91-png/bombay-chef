import Link from "next/link";

import { MenuHero } from "@/components/menu/MenuHero";
import { StickyMenuNav } from "@/components/menu/StickyMenuNav";
import { FullMenu } from "@/components/menu/FullMenu";
import { DineInTakeaway } from "@/components/menu/DineInTakeaway";
import { ChefRecommendations } from "@/components/menu/ChefRecommendations";
import { DrinksMenu } from "@/components/menu/DrinksMenu";
import { PrivateDining } from "@/components/menu/PrivateDining";
import { MenuCTA } from "@/components/menu/MenuCTA";
import { SmoothScroll } from "@/components/motion/SmoothScroll";
import { Navbar } from "@/components/Navbar";
import { getMenu } from "@/lib/repositories/menu";
import { ORDER_URL } from "@/lib/flags";

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
    <SmoothScroll>
      <Navbar />
      <main className="min-h-screen bg-[#F6F2EA] selection:bg-[#B08A3E] selection:text-[#F6F2EA]">
        <MenuHero />

        {/* Conversion CTAs — clear next actions, near the top of the menu. */}
        <section className="bg-[#F6F2EA] px-6 pt-10 lg:pt-12">
          <div className="mx-auto flex max-w-[1200px] flex-col items-center gap-4 border-b border-[#2A211C]/10 pb-10 text-center sm:flex-row sm:justify-center">
            <a
              href={ORDER_URL}
              className="inline-flex h-[54px] w-full items-center justify-center bg-[#5D0925] px-10 font-sans text-[12px] uppercase tracking-[0.18em] text-[#F6F2EA] transition-colors duration-500 hover:bg-[#420616] sm:w-auto"
            >
              Order Online
            </a>
            <Link
              href="/reservations"
              className="inline-flex h-[54px] w-full items-center justify-center border border-[#2B221D] px-10 font-sans text-[12px] uppercase tracking-[0.18em] text-[#2B221D] transition-colors duration-500 hover:bg-[#2B221D] hover:text-[#F6F2EA] sm:w-auto"
            >
              Reserve a Table
            </Link>
          </div>
        </section>

        <StickyMenuNav />
        <FullMenu categories={categories} />
        <DineInTakeaway />
        <ChefRecommendations />
        <DrinksMenu />
        <PrivateDining />
        <MenuCTA />
      </main>
    </SmoothScroll>
  );
}
