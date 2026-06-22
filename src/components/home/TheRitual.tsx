"use client";

import { useRef } from "react";
import { gsap } from "@/utils/gsap";
import { useGSAP } from "@gsap/react";

export function TheRitual() {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    // Text renders visible by default; the staggered reveal only runs when the
    // visitor hasn't requested reduced motion.
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      if (textRef.current) {
        const elements = textRef.current.children;

        gsap.fromTo(elements,
          { y: 40, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 1.2,
            stagger: 0.2,
            ease: "power3.out",
            scrollTrigger: {
              trigger: containerRef.current,
              start: "top 60%",
              end: "center center",
              toggleActions: "play none none reverse",
            }
          }
        );
      }
    });
  }, []);

  return (
    <section 
      ref={containerRef}
      className="bg-[#1A1512] w-full min-h-[80vh] lg:min-h-screen flex items-center justify-center px-6 py-24 relative z-10"
    >
      <div 
        ref={textRef}
        className="max-w-[800px] mx-auto text-center flex flex-col items-center justify-center"
      >
        <span className="text-[#C8A96B] text-[11px] tracking-[0.35em] font-normal uppercase mb-6 font-sans">
          Chapter III &middot; The Celebration Table
        </span>

        <span className="text-[#F3EEE8]/60 text-[16px] tracking-[0.06em] font-light mb-8 italic">
          जहाँ लोग मिलते हैं, कहानियाँ बनती हैं
        </span>
        
        <h2 className="text-[36px] sm:text-[48px] md:text-[60px] font-serif text-[#F3EEE8] leading-[1.1] tracking-[0.01em] mb-12">
          Where Every Story<br />Intersects.
        </h2>

        <div className="flex flex-col space-y-8 text-[#F3EEE8]/70 font-serif text-[18px] md:text-[22px] leading-[1.7] max-w-[650px] mx-auto">
          <p>
            In Bombay, the dining table is more than furniture.
          </p>
          <p>
            It is where families gather. Where friends reconnect. Where celebrations begin and memories are made.
          </p>
          <p>
            The best meals are rarely eaten alone.
          </p>
          <p>
            They are shared across crowded tables, passed from hand to hand, accompanied by conversation, laughter and stories that last long after the evening ends.
          </p>
          <p className="pt-6 border-t border-[#F3EEE8]/10 text-[#C8A96B] text-[20px] md:text-[24px] mt-6">
            We bring that same spirit to London.
          </p>
          <p className="text-[#F3EEE8] text-[16px] md:text-[18px] tracking-[0.05em] uppercase font-sans font-normal mt-4">
            A place where every guest becomes part of the story.
          </p>
        </div>
      </div>
    </section>
  );
}
