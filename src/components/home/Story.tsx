"use client";

import { useRef } from "react";
import { gsap, ScrollTrigger } from "@/utils/gsap";
import { useGSAP } from "@gsap/react";
import Image from "next/image";

const TIMELINE = [
  { year: "1987", text: "The first memories" },
  { year: "2009", text: "London begins" },
  { year: "2016", text: "A second home" },
  { year: "Today", text: "Still bringing people together" },
];

export function Story() {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);

  useGSAP(() => {
    gsap.to(imageRef.current, {
      yPercent: 15,
      ease: "none",
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top bottom",
        end: "bottom top",
        scrub: true,
      },
    });

    if (headlineRef.current) {
      gsap.fromTo(
        headlineRef.current,
        { y: 60, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          scrollTrigger: {
            trigger: "#chapter-family-kitchen",
            start: "top 80%",
            end: "top 30%",
            scrub: 1,
          }
        }
      );
    }
  }, []);

  return (
    <section className="bg-[#F5F0E6] w-full pt-20 pb-20 lg:pt-[100px] lg:pb-[100px] px-6">
      <div className="max-w-[1200px] mx-auto">
        
        {/* Top Centered Intro */}
        <div className="flex flex-col items-center text-center max-w-[900px] mx-auto mb-12 lg:mb-16">
          <span className="text-[#5D0925] text-[13px] tracking-[0.2em] font-semibold uppercase mb-4 font-sans">
            Chapter II : The Family Kitchen
          </span>

          <h2 ref={headlineRef} className="text-[32px] sm:text-[40px] md:text-[56px] lg:text-[72px] font-serif text-[#2B241D] leading-[1.15] mb-6">
            Some Flavours<br />Never Leave You
          </h2>

          <div className="flex flex-col space-y-2 text-[#5E564D] font-serif text-lg md:text-xl lg:text-[24px] leading-[1.5]">
            <p>The aroma of spices drifting from a family kitchen.</p>
            <p>The sound of loved ones gathering around a table.</p>
            <p>The dishes ordered for every celebration.</p>
          </div>
        </div>

        {/* Two Column Layout */}
        <div ref={containerRef} className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-start">
          
          {/* Left: Image */}
          <div className="relative w-full aspect-[3/4] lg:aspect-[4/5] overflow-hidden bg-[#2B241D]">
            <div ref={imageRef} className="absolute inset-0 w-full h-[115%] -top-[15%]">
              <Image
                src="/images/dishes/chapter-2-new.jpg"
                alt="The Family Kitchen"
                fill
                className="object-cover object-center"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
              {/* Fallback overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent z-10" />
            </div>
          </div>

          {/* Right: Story Copy & Timeline */}
          <div className="flex flex-col lg:pt-12">
            <div className="flex flex-col space-y-5 text-[#5E564D] text-[18px] leading-[1.9] mb-12 font-sans">
              <p>
                Bombay Bicycle Chef was built around memories.
              </p>
              <p>
                Inspired by the spirit of Bombay and shaped by life in London, our kitchens bring people together through food that feels familiar, comforting and unforgettable.
              </p>
              <p>
                Because every great meal is more than food.
              </p>
              <p className="text-[#2B241D] text-2xl lg:text-3xl font-serif mt-6">
                It&apos;s a memory being made.
              </p>
            </div>

            {/* Subtly Timeline */}
            <div className="flex flex-col space-y-5 pt-12 border-t border-[rgba(43,36,29,0.1)]">
              {TIMELINE.map((item, index) => (
                <div key={index} className="flex items-baseline space-x-6">
                  <span className="text-[#A88442] font-serif tracking-wider whitespace-nowrap min-w-[50px]">
                    {item.year}
                  </span>
                  <span className="text-[#2B241D]/20 text-xs">—</span>
                  <span className="text-[#5E564D] text-[15px] lg:text-base">
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
