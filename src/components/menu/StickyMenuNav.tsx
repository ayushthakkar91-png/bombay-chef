"use client";

import { useState } from "react";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "@/utils/gsap";
import { MENU_DATA } from "@/data/menu";

// Additional non-data sections
const SECTIONS = [
  ...MENU_DATA.map(c => ({ id: `menu-${c.id}`, label: c.title })),
  { id: "menu-drinks", label: "DRINKS" }
];

export function StickyMenuNav() {
  const [activeId, setActiveId] = useState(SECTIONS[0].id);

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
            }
          });
        }
      });
    }, 500); // Give DOM time to render
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      window.scrollTo({
        top: element.offsetTop - 170, // Offset for main navbar + sticky nav
        behavior: "smooth"
      });
    }
  };

  return (
    <div className="sticky top-[90px] lg:top-[110px] z-[40] w-full bg-[#F6F2EA]/95 backdrop-blur-md border-b border-[#2A211C]/10 hidden md:block transition-all duration-500">
      <div className="max-w-[1200px] mx-auto px-6 h-[60px] flex items-center justify-center overflow-x-auto hide-scrollbar">
        <ul className="flex items-center gap-8 lg:gap-12 w-max">
          {SECTIONS.map((section) => (
            <li key={section.id} className="relative">
              <button
                onClick={() => scrollToSection(section.id)}
                className={`text-[11px] font-sans tracking-[0.15em] uppercase transition-colors duration-300 ${
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
