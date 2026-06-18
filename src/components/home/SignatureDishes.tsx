"use client";

import { useRef } from "react";
import { gsap, ScrollTrigger } from "@/utils/gsap";
import { useGSAP } from "@gsap/react";
import Image from "next/image";

const DISHES = [
  {
    title: "Black House Daal",
    description: "Simmered for 24 hours over a slow fire. A rich, dark, deeply comforting bowl of heritage.",
  },
  {
    title: "Tandoori Lamb Chops",
    description: "Marinated overnight in dark spices and ginger. Charred to perfection in the clay oven.",
  },
  {
    title: "Bicycle Biryani",
    description: "Fragrant basmati rice layered with tender meat and saffron. Memories of grand celebrations.",
  }
];

export function SignatureDishes() {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageWrapperRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    // Mask reveal animation as user scrolls
    gsap.fromTo(
      imageWrapperRef.current,
      { clipPath: "inset(20% 10% 20% 10%)" },
      {
        clipPath: "inset(0% 0% 0% 0%)",
        ease: "none",
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top center",
          end: "bottom bottom",
          scrub: true,
        },
      }
    );
  }, []);

  return (
    <section ref={containerRef} className="bg-[#F5F0E6] relative w-full pt-20 pb-20 lg:pt-[100px] lg:pb-[100px] border-t border-[rgba(43,36,29,0.05)]">
      <div className="max-w-[1200px] mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-24 items-start">
        
        {/* Left Side: Editorial Typography Menu */}
        <div className="lg:col-span-7 flex flex-col lg:pr-12 py-10">
          <span className="text-[#5D0925] text-[13px] tracking-[0.2em] font-semibold uppercase mb-6 font-sans block">
            Chapter IV : The Signature Dishes
          </span>
          
          <h2 className="text-[32px] sm:text-[40px] md:text-[56px] lg:text-[72px] font-serif text-[#2B241D] leading-[1.1] mb-12 lg:mb-16">
            The Dishes People<br />Come Back For
          </h2>

          <div className="flex flex-col">
            {DISHES.map((dish, i) => (
              <div 
                key={i}
                className={`flex flex-col py-10 ${i === 0 ? 'border-t border-b' : 'border-b'} border-[rgba(43,36,29,0.1)]`}
              >
                <h3 className="text-3xl md:text-4xl font-serif text-[#2B241D] mb-4 tracking-wide">
                  {dish.title}
                </h3>
                <p className="text-[18px] text-[#5E564D] leading-[1.9] max-w-lg font-sans">
                  {dish.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: Single Featured Image */}
        <div className="lg:col-span-5 relative w-full h-[60vh] lg:h-[80vh] lg:sticky lg:top-[10vh] overflow-hidden">
          <div ref={imageWrapperRef} className="absolute inset-0 w-full h-full bg-[#2B241D]">
            <Image
              src="/images/dishes/chapter-2-new.jpg"
              alt="Tandoori Lamb Chops"
              fill
              className="object-cover object-center"
              sizes="(max-width: 1024px) 100vw, 40vw"
            />
            {/* Fallback overlay */}
            <div className="absolute inset-0 bg-black/10 mix-blend-overlay" />
          </div>
        </div>

      </div>
    </section>
  );
}
