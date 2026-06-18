"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { gsap } from "@/utils/gsap";
import { useGSAP } from "@gsap/react";
export function Hero() {
  const bgRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    gsap.fromTo(
      bgRef.current,
      { scale: 1.12 },
      { scale: 1, duration: 18, ease: "none" }
    );
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
        <div 
          className="absolute inset-0"
          style={{
            background: "linear-gradient(rgba(20, 10, 5, 0.45), rgba(20, 10, 5, 0.65))"
          }}
        />
      </div>

      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.55)_0%,transparent_75%)]" />

      {/* Content */}
      <div className="relative z-10 w-full max-w-[1440px] mx-auto px-6 md:px-12 pt-[12vh] lg:pt-[15vh] pb-[5vh] text-center flex flex-col items-center">
        <div className="flex flex-col items-center">
          {/* Label */}
          <span 
            className="text-[#A88442] text-[13px] tracking-[0.25em] font-semibold uppercase mb-[2vh] md:mb-[3vh] font-sans"
          >
            Chapter I : The Arrival
          </span>

          {/* Heading */}
          <h1 
            className="font-serif text-[#F5F0E6] mb-[3vh] md:mb-[4vh] tracking-wide font-medium"
            style={{ fontSize: "clamp(2.5rem, min(8vw, 12vh), 7rem)", lineHeight: "0.95" }}
          >
            Inspired By Bombay.<br />
            Made For London.
          </h1>

          {/* Subheading */}
          <p 
            className="text-[16px] lg:text-[18px] text-[#F5F0E6] opacity-90 max-w-[700px] mx-auto mb-[4vh] font-sans tracking-wide"
            style={{ lineHeight: "1.8" }}
          >
            A warm Indian dining experience inspired by family kitchens, spice markets and the timeless spirit of Bombay.
          </p>

          {/* Buttons */}
          <div 
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-[6vh] w-full sm:w-auto"
          >
            <div className="w-full sm:w-auto">
              <Link
                href="#chapter-reservation"
                className="flex items-center justify-center w-full sm:w-auto h-[52px] px-8 rounded-full border border-[rgba(245,240,230,0.35)] text-[#F5F0E6] text-[14px] tracking-[0.12em] font-medium uppercase font-sans hover:bg-[#F5F0E6] hover:text-[#2B241D] transition-colors duration-500"
              >
                Reserve A Table
              </Link>
            </div>
            <div className="w-full sm:w-auto">
              <Link
                href="https://www.bombaybicyclechef.uk/locator"
                className="flex items-center justify-center w-full sm:w-auto h-[52px] px-8 rounded-full bg-[#5D0925] border border-[#5D0925] text-[#F5F0E6] text-[14px] tracking-[0.12em] font-medium uppercase font-sans hover:bg-[#420616] hover:border-[#420616] transition-colors duration-500"
              >
                Order Online
              </Link>
            </div>
          </div>

          {/* Trust Line */}
          <div 
            className="flex flex-wrap justify-center items-center gap-2 text-sm text-[#F5F0E6] opacity-80 tracking-wide font-sans"
          >
            <span className="text-[#A88442]">★★★★★</span>
            <span>4.6 Google Rating</span>
            <span className="opacity-50 px-2 hidden sm:inline">·</span>
            <span className="w-full sm:w-auto text-center mt-2 sm:mt-0">3 London Locations</span>
            <span className="opacity-50 px-2 hidden sm:inline">·</span>
            <span className="w-full sm:w-auto text-center mt-2 sm:mt-0">Fresh Tandoor Daily</span>
          </div>
        </div>
      </div>
    </section>
  );
}
