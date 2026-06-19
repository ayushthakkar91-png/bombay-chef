"use client";

import { useRef } from "react";
import { gsap } from "@/utils/gsap";
import { useGSAP } from "@gsap/react";

export function MenuHero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const grainRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    // Grain animation
    gsap.to(grainRef.current, {
      backgroundPosition: "200px 200px",
      duration: 8,
      ease: "none",
      repeat: -1,
    });

    // Text reveal
    if (textRef.current) {
      const elements = textRef.current.children;
      gsap.fromTo(
        elements,
        { opacity: 0, y: 40 },
        {
          opacity: 1,
          y: 0,
          duration: 1.5,
          stagger: 0.2,
          ease: "power3.out",
          delay: 0.2
        }
      );
    }
  }, []);

  return (
    <section 
      ref={containerRef}
      className="relative w-full h-screen bg-[#2A211C] flex flex-col items-center justify-center overflow-hidden"
    >
      {/* Subtle Grain Overlay */}
      <div 
        ref={grainRef}
        className="absolute inset-0 opacity-[0.04] pointer-events-none mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundSize: '200px 200px',
        }}
      />

      <div ref={textRef} className="relative z-10 text-center flex flex-col items-center px-6">
        <span className="text-[#C8A96B]/80 text-[10px] sm:text-[11px] tracking-[0.4em] font-normal uppercase mb-[4vh] sm:mb-[6vh] font-sans block">
          Chapter V &middot; The Offerings
        </span>
        
        <h1 className="text-[48px] sm:text-[64px] md:text-[80px] font-serif text-[#F3EEE8] leading-[1.1] mb-[4vh] sm:mb-[6vh] tracking-wide font-normal">
          The Menu.
        </h1>
        
        <p className="text-[#F3EEE8]/80 text-[16px] sm:text-[18px] italic tracking-[0.05em] font-light mb-[6vh] sm:mb-[10vh] block max-w-md mx-auto">
          A collection of dishes inspired by Bombay, crafted daily in London.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-10 text-[#C8A96B] text-[10px] sm:text-[11px] font-sans tracking-[0.3em] uppercase">
          <span className="hover:text-[#F3EEE8] transition-colors duration-300 cursor-pointer">Dine In</span>
          <span className="hidden sm:block opacity-30 text-[#F3EEE8]">&bull;</span>
          <span className="hover:text-[#F3EEE8] transition-colors duration-300 cursor-pointer">Takeaway</span>
          <span className="hidden sm:block opacity-30 text-[#F3EEE8]">&bull;</span>
          <span className="hover:text-[#F3EEE8] transition-colors duration-300 cursor-pointer">Private Dining</span>
        </div>
      </div>
    </section>
  );
}
