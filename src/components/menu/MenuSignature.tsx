"use client";

import { useRef, useState } from "react";
import { gsap, ScrollTrigger } from "@/utils/gsap";
import { useGSAP } from "@gsap/react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

const SIGNATURES = [
  {
    title: "BLACK HOUSE DAAL",
    description: "Slow cooked for 24 hours.\nRich, buttery and deeply comforting.",
    image: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?q=80&w=2000&auto=format&fit=crop"
  },
  {
    title: "TANDOORI LAMB CHOPS",
    description: "Charred over open flame.\nMarinated overnight in dark spices.",
    image: "https://images.unsplash.com/photo-1544025162-811114cdb83b?q=80&w=2000&auto=format&fit=crop"
  },
  {
    title: "BUTTER CHICKEN",
    description: "Silky tomato and fenugreek sauce.\nVelvet texture, sweet and smoky.",
    image: "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?q=80&w=2000&auto=format&fit=crop"
  },
  {
    title: "CHICKEN BIRYANI",
    description: "Fragrant rice and dark spices.\nLayered, steamed, perfect.",
    image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?q=80&w=2000&auto=format&fit=crop"
  }
];

export function MenuSignature() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const dishRefs = useRef<(HTMLDivElement | null)[]>([]);

  useGSAP(() => {
    dishRefs.current.forEach((dish, index) => {
      if (!dish) return;
      ScrollTrigger.create({
        trigger: dish,
        start: "top center",
        end: "bottom center",
        onEnter: () => setActiveIndex(index),
        onEnterBack: () => setActiveIndex(index),
      });
    });
  }, []);

  return (
    <section ref={containerRef} id="menu-signatures" className="bg-[#F6F2EA] relative w-full pt-32 pb-32 lg:pt-[180px] lg:pb-[180px]">
      <div className="max-w-[1400px] mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-24 items-start relative">
        
        {/* Left Side: Typography */}
        <div className="lg:col-span-5 flex flex-col z-10 lg:pl-12">
          <span className="text-[#B08A3E] text-[12px] tracking-[0.2em] font-semibold uppercase mb-16 font-sans block">
            Signature Experience
          </span>
          
          <div className="flex flex-col space-y-[40vh] lg:pb-[40vh]">
            {SIGNATURES.map((dish, i) => (
              <div 
                key={i}
                ref={(el) => { dishRefs.current[i] = el; }}
                className="flex flex-col transition-all duration-700"
                style={{ opacity: activeIndex === i ? 1 : 0.2, transform: `translateX(${activeIndex === i ? '0px' : '-20px'})` }}
              >
                <h3 className="text-[32px] sm:text-[40px] md:text-[52px] lg:text-[64px] font-serif text-[#2B221D] leading-[1.1] mb-8 tracking-wide">
                  {dish.title}
                </h3>
                <div className="text-[18px] lg:text-[20px] text-[#5A524B] leading-[1.9] font-sans whitespace-pre-line">
                  {dish.description}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: Pinned Cinematic Image */}
        <div className="lg:col-span-7 relative w-full h-[60vh] lg:h-[85vh] lg:sticky lg:top-[7.5vh] overflow-hidden bg-[#2A211C]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeIndex}
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2, ease: "easeInOut" }}
              className="absolute inset-0 w-full h-full"
            >
              <Image
                src={SIGNATURES[activeIndex].image}
                alt={SIGNATURES[activeIndex].title}
                fill
                className="object-cover object-center"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
              <div className="absolute inset-0 bg-black/10 mix-blend-overlay" />
            </motion.div>
          </AnimatePresence>
        </div>

      </div>
    </section>
  );
}
