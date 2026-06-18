"use client";

import { useRef } from "react";
import { gsap } from "@/utils/gsap";
import { useGSAP } from "@gsap/react";

export function ReservationHero() {
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
          delay: 0.3
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
        className="absolute inset-0 opacity-[0.05] pointer-events-none mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundSize: '200px 200px',
        }}
      />

      <div ref={textRef} className="relative z-10 text-center flex flex-col items-center px-6">
        <span className="text-[#B08A3E] text-[13px] tracking-[0.25em] font-semibold uppercase mb-8 font-sans">
          The Invitation
        </span>
        <h1 className="text-[56px] sm:text-[72px] md:text-[96px] lg:text-[120px] font-serif text-[#F6F2EA] leading-none mb-8 tracking-wide">
          RESERVATIONS
        </h1>
        
        <p className="text-[18px] md:text-[22px] text-[#F6F2EA]/70 font-sans max-w-[600px] mx-auto leading-[1.8] mb-16">
          Every memorable meal begins with a seat at the table.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-6 text-[#F6F2EA]/50 text-[12px] font-sans tracking-[0.2em] uppercase">
          <span>Balham</span>
          <span className="hidden sm:block opacity-50">&bull;</span>
          <span>Battersea</span>
          <span className="hidden sm:block opacity-50">&bull;</span>
          <span>Kilburn</span>
        </div>
      </div>
    </section>
  );
}
