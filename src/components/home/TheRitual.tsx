"use client";

import { useRef } from "react";
import { gsap } from "@/utils/gsap";
import { useGSAP } from "@gsap/react";

const RITUAL_LINES = [
  "The fire is lit before the city wakes.",
  "The spices arrive before the first guest.",
  "Some traditions are never rushed."
];

export function TheRitual() {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (textRef.current) {
      const lines = textRef.current.querySelectorAll('.ritual-line-inner');
      
      gsap.fromTo(lines,
        { y: "120%" },
        {
          y: "0%",
          duration: 1.5,
          stagger: 0.3,
          ease: "power4.out",
          scrollTrigger: {
            trigger: containerRef.current,
            start: "top 60%", // Start when section is 40% into view
            end: "center center",
            toggleActions: "play none none reverse",
          }
        }
      );
    }
  }, []);

  return (
    <section 
      ref={containerRef}
      className="bg-[#2A211C] w-full min-h-[80vh] lg:min-h-screen flex items-center justify-center px-6 relative z-10"
    >
      <div 
        ref={textRef}
        className="max-w-[1000px] mx-auto text-center flex flex-col items-center justify-center"
      >
        <span className="text-[#A88442] text-[13px] tracking-[0.2em] font-semibold uppercase mb-16 font-sans block opacity-80">
          Chapter III &middot; The Ritual
        </span>
        
        <div className="flex flex-col space-y-8 lg:space-y-12">
          {RITUAL_LINES.map((line, i) => (
            <div key={i} className="overflow-hidden">
              <h2 className="ritual-line-inner text-[32px] sm:text-[40px] md:text-[52px] lg:text-[64px] font-serif text-[#F5F0E6] leading-[1.1] tracking-wide">
                {line}
              </h2>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
