"use client";

import { useRef } from "react";
import { gsap } from "@/utils/gsap";
import { useGSAP } from "@gsap/react";
import Link from "next/link";

export function ReservationCTA() {
  const bgRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    // The slow infinite grain drift only runs when the visitor hasn't requested
    // reduced motion; the texture stays in place otherwise.
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.to(bgRef.current, {
        backgroundPosition: "120px 120px",
        duration: 30,
        ease: "none",
        repeat: -1,
      });
    });
  }, []);

  return (
    <section className="relative bg-[#2A211C] w-full py-24 lg:py-[140px] px-6 overflow-hidden">
      {/* Subtle floating texture */}
      {/* Film grain texture */}
      <div 
        ref={bgRef}
        className="absolute inset-0 opacity-[0.04] pointer-events-none mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundSize: '200px 200px',
        }}
      />

      <div className="relative z-10 max-w-[900px] mx-auto text-center flex flex-col items-center">
        <span className="text-[#A88442] text-[11px] tracking-[0.35em] font-normal uppercase mb-6 font-sans block">
          Chapter VII &middot; Reserve Your Table
        </span>
        <h2 className="text-[32px] sm:text-[36px] md:text-[48px] lg:text-[56px] font-serif text-[#F5F0E6] leading-[1.15] mb-5">
          Reserve Your Table
        </h2>

        <p className="text-[18px] md:text-xl text-[#EFE6D8]/70 max-w-[700px] mx-auto leading-[1.9] mb-10 font-sans">
          Whether it’s a quick lunch in Balham or a celebration feast in Battersea, our tables are ready.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <Link
            href="/reservations"
            className="inline-flex items-center justify-center h-[56px] px-10 border border-[#A88442] text-[#F5F0E6] text-[14px] tracking-[0.15em] font-medium uppercase font-sans hover:bg-[#A88442] hover:text-[#2B241D] transition-colors duration-500"
          >
            Find a Table
          </Link>
          <Link
            href="https://www.bombaybicyclechef.uk/locator"
            className="inline-flex items-center justify-center h-[56px] px-10 bg-[#5D0925] border border-[#5D0925] text-[#F5F0E6] text-[14px] tracking-[0.15em] font-medium uppercase font-sans hover:bg-[#420616] hover:border-[#420616] transition-colors duration-500"
          >
            Order Online
          </Link>
        </div>
      </div>
    </section>
  );
}
