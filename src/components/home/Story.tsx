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
    // Content renders visible by default; motion (parallax + headline reveal)
    // only runs when the visitor hasn't requested reduced motion.
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
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
    });
  }, []);

  return (
    <section className="bg-[#F5F0E6] w-full pt-24 pb-24 lg:pt-[160px] lg:pb-[160px] px-6">
      <div className="max-w-[1200px] mx-auto">
        
        {/* Top Centered Intro */}
        <div className="flex flex-col items-center text-center max-w-[900px] mx-auto mb-20 lg:mb-32">
          <span className="text-[#C8A96B] text-[10px] sm:text-[11px] tracking-[0.35em] font-medium uppercase mb-8 font-sans">
            Chapter II &middot; The Family Kitchen
          </span>

          <span className="text-[#2B241D]/60 text-[16px] tracking-[0.06em] font-light mb-6 italic">
            कुछ स्वाद कभी साथ नहीं छोड़ते
          </span>

          <h2 ref={headlineRef} className="text-[36px] sm:text-[48px] md:text-[60px] font-serif text-[#1A1411] leading-[1.1] mb-12 tracking-wide font-light">
            Some Flavours<br />Never Leave You.
          </h2>

          <div className="flex flex-col space-y-6 text-[#1A1411]/70 font-serif text-[18px] md:text-[22px] lg:text-[24px] leading-[1.6] max-w-[800px] italic">
            <p>Long before there was a restaurant, there was a family table.</p>
            <p className="font-light">There were recipes passed from one generation to the next. Spices measured by memory. Meals prepared slowly, shared generously, and remembered long after the plates were cleared.</p>
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
            <div className="flex flex-col space-y-6 text-[#5E564D] text-[15px] lg:text-[17px] leading-[2.1] mb-16 font-sans tracking-[0.02em]">
              <p>
                Bombay Bicycle Chef was built around those moments.
              </p>
              <p>
                Inspired by the warmth of Bombay&apos;s family kitchens and shaped by life in London, we create food that feels familiar, comforting, and deeply personal.
              </p>
              <p className="text-[#2B241D] text-[20px] lg:text-[24px] font-serif mt-8 leading-[1.4] tracking-wide">
                Because every great meal begins long before it reaches the table.
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
