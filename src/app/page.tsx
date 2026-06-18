import { Hero } from "@/components/home/Hero";
import { Story } from "@/components/home/Story";
import { CelebrationTable } from "@/components/home/CelebrationTable";
import { SignatureDishes } from "@/components/home/SignatureDishes";
import { Experience } from "@/components/home/Experience";
import { Locations } from "@/components/home/LocationsPreview";
import { ReservationCTA } from "@/components/home/ReservationCTA";
import { ChapterIndicator } from "@/components/motion/ChapterIndicator";

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
        <div id="chapter-celebration-table"><CelebrationTable /></div>
        <div id="chapter-signature-dishes"><SignatureDishes /></div>
        <div id="chapter-experience"><Experience /></div>
        <div id="chapter-locations"><Locations /></div>
        <div id="chapter-reservation"><ReservationCTA /></div>
      </div>
    </div>
  );
}
