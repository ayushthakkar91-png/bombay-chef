"use client";

import { useRef } from "react";
import { gsap } from "@/utils/gsap";
import { useGSAP } from "@gsap/react";

const RECOMMENDATIONS = [
  "Black House Daal",
  "Tandoori Lamb Chops",
  "Chicken Biryani",
  "Butter Chicken",
  "Garlic Naan"
];

export function ChefRecommendations() {
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      if (listRef.current) {
        gsap.fromTo(
          listRef.current.children,
          { opacity: 0, x: -30 },
          {
            opacity: 1,
            x: 0,
            duration: 1.2,
            stagger: 0.2,
            ease: "power3.out",
            scrollTrigger: {
              trigger: containerRef.current,
              start: "top 60%",
            }
          }
        );
      }
    });
  }, []);

  return (
    <section ref={containerRef} className="w-full bg-[#2A211C] py-24 lg:py-[160px] px-6">
      <div className="max-w-[1000px] mx-auto grid grid-cols-1 md:grid-cols-12 gap-16 lg:gap-24">
        
        {/* Left: Heading */}
        <div className="md:col-span-5 flex flex-col">
          <span className="text-[#B08A3E] text-[12px] tracking-[0.2em] font-semibold uppercase mb-6 font-sans">
            The Essentials
          </span>
          <h2 className="text-[40px] lg:text-[56px] font-serif text-[#F6F2EA] leading-[1.1]">
            Chef&apos;s<br />Recommendations
          </h2>
        </div>

        {/* Right: List */}
        <div className="md:col-span-7 flex flex-col justify-center" ref={listRef}>
          {RECOMMENDATIONS.map((item, index) => (
            <div key={index} className="flex items-center gap-8 mb-10 last:mb-0 group cursor-default">
              <span className="text-[#B08A3E] font-serif text-[20px] lg:text-[24px] opacity-70 group-hover:opacity-100 transition-opacity">
                0{index + 1}
              </span>
              <h3 className="text-[28px] lg:text-[36px] font-serif text-[#F6F2EA] group-hover:text-[#B08A3E] transition-colors duration-500">
                {item}
              </h3>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
