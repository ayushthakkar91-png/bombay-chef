"use client";

import { useRef } from "react";
import { gsap } from "@/utils/gsap";
import { useGSAP } from "@gsap/react";
import Link from "next/link";

export function MenuCTA() {
  const bgRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.to(bgRef.current, {
        backgroundPosition: "200px 200px",
        duration: 10,
        ease: "none",
        repeat: -1,
      });
    });
  }, []);

  return (
    <section className="relative bg-[#2A211C] w-full py-24 lg:py-[180px] px-6 overflow-hidden">
      
      {/* Film grain texture */}
      <div 
        ref={bgRef}
        className="absolute inset-0 opacity-[0.05] pointer-events-none mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundSize: '200px 200px',
        }}
      />

      <div className="relative z-10 max-w-[900px] mx-auto text-center flex flex-col items-center">
        <h2 className="text-[48px] sm:text-[64px] md:text-[80px] lg:text-[100px] font-serif text-[#F6F2EA] leading-[1] mb-8">
          Reserve Your Table
        </h2>

        <p className="text-[18px] lg:text-[22px] text-[#F6F2EA]/70 max-w-[600px] mx-auto leading-[1.8] mb-16 font-sans">
          Whether it&apos;s a quick lunch in Balham or a celebration feast in Battersea, our tables are ready.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-6">
          <Link
            href="/reservations"
            className="inline-flex items-center justify-center h-[56px] px-12 border border-[#B08A3E] text-[#F6F2EA] text-[13px] tracking-[0.15em] font-medium uppercase font-sans hover:bg-[#B08A3E] hover:text-[#2A211C] transition-colors duration-500"
          >
            Reserve Table
          </Link>
          <Link
            href="https://www.bombaybicyclechef.uk/locator"
            className="inline-flex items-center justify-center h-[56px] px-12 bg-[#7A0E2E] border border-[#7A0E2E] text-[#F6F2EA] text-[13px] tracking-[0.15em] font-medium uppercase font-sans hover:bg-[#5D0925] hover:border-[#5D0925] transition-colors duration-500"
          >
            Order Online
          </Link>
        </div>
      </div>
    </section>
  );
}
