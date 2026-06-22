"use client";

import { useRef } from "react";
import { gsap } from "@/utils/gsap";
import { useGSAP } from "@gsap/react";
import Image from "next/image";
import Link from "next/link";

export function PrivateDining() {
  const containerRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      if (bgRef.current && containerRef.current) {
        gsap.fromTo(
          bgRef.current,
          { y: "-15%" },
          {
            y: "15%",
            ease: "none",
            scrollTrigger: {
              trigger: containerRef.current,
              start: "top bottom",
              end: "bottom top",
              scrub: true,
            }
          }
        );
      }
    });
  }, []);

  return (
    <section ref={containerRef} className="relative w-full h-[80vh] lg:h-[100vh] overflow-hidden flex items-center justify-center">
      
      {/* Parallax Background */}
      <div ref={bgRef} className="absolute inset-0 w-full h-[130%] -top-[15%]">
        <Image
          src="https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?q=80&w=2000&auto=format&fit=crop"
          alt="Private Dining at Bombay Bicycle Chef"
          fill
          className="object-cover"
        />
        {/* Luxury dark tint */}
        <div className="absolute inset-0 bg-[#2A211C]/60 mix-blend-multiply" />
        <div className="absolute inset-0 bg-black/40" />
      </div>

      <div className="relative z-10 text-center px-6 max-w-[800px] flex flex-col items-center">
        <span className="text-[#B08A3E] text-[13px] tracking-[0.2em] font-semibold uppercase mb-8 font-sans">
          Exclusive Experiences
        </span>
        
        <h2 className="text-[48px] sm:text-[64px] md:text-[80px] lg:text-[100px] font-serif text-[#F6F2EA] leading-[1] mb-12">
          Celebrate Together
        </h2>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-12 text-[#F6F2EA]/80 font-sans text-[14px] uppercase tracking-[0.15em] mb-16">
          <span>Family Gatherings</span>
          <span className="hidden sm:block opacity-50">&bull;</span>
          <span>Corporate Events</span>
          <span className="hidden sm:block opacity-50">&bull;</span>
          <span>Special Occasions</span>
        </div>

        <Link
          href="/contact"
          className="inline-flex items-center justify-center h-[56px] px-12 border border-[#B08A3E] text-[#F6F2EA] text-[13px] tracking-[0.15em] font-medium uppercase font-sans hover:bg-[#B08A3E] hover:text-[#2A211C] transition-colors duration-500"
        >
          Enquire Now
        </Link>
      </div>

    </section>
  );
}
