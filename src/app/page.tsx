import { Hero } from "@/components/home/Hero";
import { Story } from "@/components/home/Story";
import { TheRitual } from "@/components/home/TheRitual";
import { SignatureDishes } from "@/components/home/SignatureDishes";
import { MenuPreview } from "@/components/home/MenuPreview";
import { Locations } from "@/components/home/LocationsPreview";
import { ReservationCTA } from "@/components/home/ReservationCTA";
import { ChapterIndicator } from "@/components/motion/ChapterIndicator";
import { DineInTakeaway } from "@/components/menu/DineInTakeaway";

export default function Home() {
  return (
    <div className="w-full relative bg-[#F5F0E6]">
      <ChapterIndicator />
      
      {/* Chapter 1: The Arrival (Sticky to allow overlap) */}
      <div id="chapter-arrival" className="sticky top-0 z-0 w-full h-screen">
        <Hero />
      </div>
      
      {/* Content wrapper slides over the sticky hero */}
      <div className="relative z-10 w-full bg-[#F5F0E6] shadow-[0_-20px_50px_rgba(0,0,0,0.3)]">
        <div id="chapter-family-kitchen"><Story /></div>
        <div id="chapter-ritual"><TheRitual /></div>
        <div id="chapter-signature-dishes"><SignatureDishes /></div>
        <div id="chapter-dine-in-takeaway"><DineInTakeaway /></div>
        <div id="chapter-offerings"><MenuPreview /></div>
        <div id="chapter-locations"><Locations /></div>
        <div id="chapter-reservation"><ReservationCTA /></div>
      </div>
    </div>
  );
}
