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

export const metadata = {
  title: "The Menu | Bombay Bicycle Chef",
  description: "A collection of dishes inspired by Bombay, crafted daily in London.",
};

export default function MenuPage() {
  return (
    <SmoothScroll>
      <Navbar />
      <main className="min-h-screen bg-[#F6F2EA] selection:bg-[#B08A3E] selection:text-[#F6F2EA]">
        <MenuHero />
        <StickyMenuNav />
        <FullMenu />
        <DineInTakeaway />
        <ChefRecommendations />
        <DrinksMenu />
        <PrivateDining />
        <MenuCTA />
      </main>
    </SmoothScroll>
  );
}
