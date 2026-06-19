"use client";

import { useState } from "react";
import { gsap, ScrollTrigger } from "@/utils/gsap";
import { useGSAP } from "@gsap/react";

const CHAPTERS = [
  { id: "arrival", num: "I", label: "Arrival" },
  { id: "family-kitchen", num: "II", label: "Family Kitchen" },
  { id: "ritual", num: "III", label: "The Ritual" },
  { id: "signature-dishes", num: "IV", label: "Signature Dishes" },
  { id: "offerings", num: "V", label: "The Offerings" },
  { id: "locations", num: "VI", label: "Locations" },
  { id: "reservation", num: "VII", label: "Reservation" },
];

export function ChapterIndicator() {
  const [active, setActive] = useState("arrival");
  
  useGSAP(() => {
    // Small timeout to ensure DOM is ready
    setTimeout(() => {
      CHAPTERS.forEach((chapter) => {
        const element = document.getElementById(`chapter-${chapter.id}`);
        if (element) {
          ScrollTrigger.create({
            trigger: element,
            start: "top center",
            end: "bottom center",
            onToggle: (self) => {
              if (self.isActive) setActive(chapter.id);
            }
          });
        }
      });
      ScrollTrigger.refresh();
    }, 100);
  }, []);

  return (
    <div className="fixed left-6 xl:left-12 top-1/2 -translate-y-1/2 z-[100] hidden xl:flex flex-col gap-6 xl:gap-8 mix-blend-difference pointer-events-none">
      {CHAPTERS.map((chapter) => (
        <div 
          key={chapter.id}
          className={`flex items-center gap-4 xl:gap-6 transition-all duration-700 ease-in-out ${active === chapter.id ? "opacity-100 translate-x-0" : "opacity-30 -translate-x-2"}`}
        >
          <span className="text-[#F5F0E6] font-serif text-[12px] xl:text-[14px] tracking-[0.2em]">{chapter.num}</span>
          <div className={`overflow-hidden transition-all duration-700 ${active === chapter.id ? "max-w-[200px] opacity-100" : "max-w-0 opacity-0"}`}>
            <span className="text-[#F5F0E6] text-[11px] uppercase tracking-[0.3em] font-sans whitespace-nowrap block">
              {chapter.label}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
