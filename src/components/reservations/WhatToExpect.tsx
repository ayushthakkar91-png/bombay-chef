"use client";

import { useRef } from "react";
import { gsap } from "@/utils/gsap";
import { useGSAP } from "@gsap/react";

const EXPECTATIONS = [
  {
    title: "The Welcome",
    desc: "Warm hospitality inspired by old Bombay. Every guest is received like an old friend."
  },
  {
    title: "The Craft",
    desc: "Freshly prepared dishes cooked with patience, honoring centuries-old spice blending techniques."
  },
  {
    title: "The Celebration",
    desc: "Tables designed for sharing stories and food. A dining room built for the moments that matter."
  }
];

export function WhatToExpect() {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (itemsRef.current) {
      gsap.fromTo(
        itemsRef.current.children,
        { opacity: 0, y: 40 },
        {
          opacity: 1,
          y: 0,
          duration: 1.2,
          stagger: 0.2,
          ease: "power3.out",
          scrollTrigger: {
            trigger: containerRef.current,
            start: "top 70%",
          }
        }
      );
    }
  }, []);

  return (
    <section ref={containerRef} className="w-full bg-[#F6F2EA] py-24 lg:py-[160px] px-6">
      <div className="max-w-[1200px] mx-auto">
        
        <div className="text-center mb-20 lg:mb-24">
          <span className="text-[#B08A3E] text-[13px] tracking-[0.2em] font-semibold uppercase mb-6 block font-sans">
            Our Promise
          </span>
          <h2 className="text-[40px] md:text-[56px] font-serif text-[#2B221D] leading-[1.1]">
            What to Expect
          </h2>
        </div>

        <div ref={itemsRef} className="grid grid-cols-1 md:grid-cols-3 gap-16 lg:gap-24">
          {EXPECTATIONS.map((item, index) => (
            <div key={index} className="flex flex-col items-center text-center">
              <span className="text-[#B08A3E] font-serif text-[40px] leading-none mb-6 opacity-30">
                0{index + 1}
              </span>
              <h3 className="text-[24px] lg:text-[28px] font-serif text-[#2B221D] mb-4">
                {item.title}
              </h3>
              <p className="text-[#5A524B] text-[15px] font-sans leading-[1.8] max-w-[300px]">
                {item.desc}
              </p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
