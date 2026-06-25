"use client";

import { useState } from "react";
import { useGSAP } from "@gsap/react";
import { useLenis } from "lenis/react";
import { ScrollTrigger } from "@/utils/gsap";
import type { MenuCategory } from "@/data/menu";

export function StickyMenuNav({
  food,
  hasDrinks = true,
}: {
  food: MenuCategory[];
  hasDrinks?: boolean;
}) {
  // Build the nav from the same DB-sourced categories the page renders, so the
  // tabs always match the content and stay in the database's sort order.
  const SECTIONS = [
    ...food.map((c) => ({ id: `menu-${c.id}`, label: c.title })),
    ...(hasDrinks ? [{ id: "menu-drinks", label: "DRINKS" }] : []),
  ];

  const [activeId, setActiveId] = useState(SECTIONS[0]?.id ?? "");

  useGSAP(() => {
    // Setup ScrollTrigger for each section to update the active nav link
    setTimeout(() => {
      SECTIONS.forEach((section) => {
        const element = document.getElementById(section.id);
        if (element) {
          ScrollTrigger.create({
            trigger: element,
            start: "top center",
            end: "bottom center",
            onToggle: (self) => {
              if (self.isActive) {
                setActiveId(section.id);
              }
            },
          });
        }
      });
    }, 500); // Give DOM time to render
  }, []);

  const lenis = useLenis();

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      if (lenis) {
        lenis.scrollTo(element, { offset: -170 });
      } else {
        window.scrollTo({
          top: element.offsetTop - 170, // Offset for main navbar + sticky nav
          behavior: "smooth",
        });
      }
    }
  };

  return (
    <div className="sticky top-[84px] lg:top-[88px] z-[40] w-full bg-[#F6F2EA]/95 backdrop-blur-md border-b border-[#2A211C]/10 block transition-all duration-500">
      <div className="max-w-[1200px] mx-auto px-4 md:px-6 h-[50px] md:h-[60px] flex items-center justify-start overflow-x-auto hide-scrollbar">
        <ul className="flex items-center gap-6 md:gap-8 lg:gap-12 w-max pr-6 md:pr-0">
          {SECTIONS.map((section) => (
            <li key={section.id} className="relative shrink-0">
              <button
                onClick={() => scrollToSection(section.id)}
                className={`cursor-pointer text-[10px] md:text-[11px] font-sans tracking-[0.15em] uppercase transition-colors duration-300 ${
                  activeId === section.id ? "text-[#B08A3E]" : "text-[#2A211C]/60 hover:text-[#2A211C]"
                }`}
              >
                {section.label}
              </button>
              {activeId === section.id && (
                <span className="absolute -bottom-[21px] left-0 w-full h-[2px] bg-[#B08A3E] layout-id-nav-indicator" />
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
