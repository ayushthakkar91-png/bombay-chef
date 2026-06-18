"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { gsap, ScrollTrigger } from "@/utils/gsap";
import { useGSAP } from "@gsap/react";
export function Hero() {
  const bgRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    // Cinematic background drift
    gsap.fromTo(
      bgRef.current,
      { scale: 1.08 },
      { scale: 1, duration: 20, ease: "none" }
    );

    // Staggered word reveal emerging from darkness
    if (headlineRef.current) {
      const words = headlineRef.current.querySelectorAll('.word');
      gsap.fromTo(
        words,
        { y: 40, opacity: 0 },
        { y: 0, opacity: 1, duration: 1.5, stagger: 0.05, ease: "power3.out", delay: 0.3 }
      );
    }

    // Cinematic scroll away when Chapter 2 enters
    if (contentRef.current) {
      gsap.to(contentRef.current, {
        y: -100,
        opacity: 0,
        scale: 0.95,
        filter: "blur(5px)",
        scrollTrigger: {
          trigger: "#chapter-family-kitchen", // Next section
          start: "top bottom", // When Chapter 2 touches the bottom of screen
          end: "top 40%", // When Chapter 2 is 40% up
          scrub: 1,
        }
      });
    }
  }, []);

  return (
    <section className="relative h-screen w-full flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div ref={bgRef} className="absolute inset-0 z-0">
        <Image
          src="/images/hero/hero-bg.png"
          alt="Bombay Bicycle Chef Interior"
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
        />
        {/* Cinematic treatments: Darken edges, vignette, and warmth */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/60 z-10" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/50 z-10" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0)_0%,rgba(0,0,0,0.6)_100%)] z-10 pointer-events-none" />
        <div className="absolute inset-0 mix-blend-overlay bg-[#5D0925] opacity-20 z-10" />
      </div>

      {/* Subtle dark gradient at the bottom */}
      <div 
        className="absolute inset-0 z-20 pointer-events-none" 
        style={{
          background: "linear-gradient(to bottom, transparent 70%, rgba(16,12,8,0.75) 100%)"
        }}
      />

      {/* Content */}
      <div 
        ref={contentRef}
        className="relative z-30 w-full max-w-[1440px] mx-auto px-6 md:px-12 pt-[18vh] lg:pt-[22vh] pb-[5vh] text-center flex flex-col items-center"
      >
        <div className="flex flex-col items-center">
          {/* Label */}
          <span 
            className="text-[#A88442] text-[0.85rem] tracking-[0.4em] opacity-70 font-medium uppercase mb-[4vh] font-sans"
          >
            Chapter I : The Arrival
          </span>

          {/* Heading */}
          <h1 
            ref={headlineRef}
            className="font-serif text-[#F5F0E6] mb-[5vh] tracking-wide font-normal max-w-[1200px]"
            style={{ fontSize: "clamp(5rem, 8vw, 8rem)", lineHeight: "0.95" }}
          >
            <span className="word inline-block">Inspired</span> <span className="word inline-block">By</span> <span className="word inline-block">Bombay.</span><br />
            <span className="word inline-block">Made</span> <span className="word inline-block">For</span> <span className="word inline-block">London.</span>
          </h1>

          {/* Subheading */}
          <p 
            className="text-[16px] lg:text-[20px] text-[#F5F0E6] opacity-90 max-w-[700px] mx-auto mb-[6vh] font-sans tracking-widest font-light"
            style={{ lineHeight: "1.9" }}
          >
            From the family kitchens of Bombay to the tables of London, every meal begins with a story.
          </p>

          {/* Buttons */}
          <div 
            className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-[8vh] w-full sm:w-auto"
          >
            <div className="w-full sm:w-auto">
              <Link
                href="#chapter-reservation"
                className="flex items-center justify-center w-full sm:w-auto h-[56px] px-10 rounded-none bg-[#5D0925] border border-[#5D0925] text-[#F8F4ED] text-[13px] tracking-[0.15em] font-medium uppercase font-sans hover:bg-[#420616] hover:border-[#420616] transition-all duration-500"
              >
                Reserve A Table
              </Link>
            </div>
            <div className="w-full sm:w-auto">
              <Link
                href="https://www.bombaybicyclechef.uk/locator"
                className="flex items-center justify-center w-full sm:w-auto h-[56px] px-10 rounded-none border border-white/30 text-[#F5F0E6] text-[13px] tracking-[0.15em] font-medium uppercase font-sans hover:bg-white/10 hover:border-white transition-all duration-500"
              >
                Order Online
              </Link>
            </div>
          </div>

          {/* Trust Line */}
          <div 
            className="flex flex-wrap justify-center items-center gap-4 text-[12px] lg:text-[13px] text-[#F5F0E6] opacity-60 tracking-[0.2em] font-sans uppercase font-medium absolute bottom-[4vh] left-0 w-full z-40"
          >
            <span className="w-full sm:w-auto text-center mt-2 sm:mt-0">Established 1987</span>
            <span className="opacity-40 hidden sm:inline">|</span>
            <span className="w-full sm:w-auto text-center mt-2 sm:mt-0">Three London Locations</span>
            <span className="opacity-40 hidden sm:inline">|</span>
            <span className="w-full sm:w-auto text-center mt-2 sm:mt-0">Inspired By Bombay</span>
          </div>
        </div>
      </div>
    </section>
  );
}
