"use client";

import { useRef, useState } from "react";
import { gsap, ScrollTrigger } from "@/utils/gsap";
import { useGSAP } from "@gsap/react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

const DISHES = [
  {
    title: "Black House Daal",
    description: "Simmered for 24 hours over a slow fire. A rich, dark, deeply comforting bowl of heritage.",
    image: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?q=80&w=2000&auto=format&fit=crop"
  },
  {
    title: "Tandoori Lamb Chops",
    description: "Marinated overnight in dark spices and ginger. Charred to perfection in the clay oven.",
    image: "https://images.unsplash.com/photo-1544025162-811114cdb83b?q=80&w=2000&auto=format&fit=crop"
  },
  {
    title: "Bicycle Biryani",
    description: "Fragrant basmati rice layered with tender meat and saffron. Memories of grand celebrations.",
    image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?q=80&w=2000&auto=format&fit=crop"
  }
];

export function SignatureDishes() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const dishRefs = useRef<(HTMLDivElement | null)[]>([]);

  useGSAP(() => {
    // Set up scroll triggers for each dish to update the active index
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
    <section ref={containerRef} className="bg-[#F5F0E6] relative w-full pt-20 pb-20 lg:pt-[140px] lg:pb-[140px] border-t border-[rgba(43,36,29,0.05)]">
      <div className="max-w-[1200px] mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-24 items-start relative">
        
        {/* Left Side: Editorial Typography Menu */}
        <div className="lg:col-span-6 flex flex-col lg:pr-12 py-10 z-10">
          <span className="text-[#5D0925] text-[13px] tracking-[0.2em] font-semibold uppercase mb-8 font-sans block">
            Chapter IV &middot; The Signature Dishes
          </span>
          
          <h2 className="text-[32px] sm:text-[40px] md:text-[56px] lg:text-[64px] font-serif text-[#2B241D] leading-[1.1] mb-20">
            The Dishes People<br />Come Back For
          </h2>

          <div className="flex flex-col space-y-32 lg:pb-[40vh]">
            {DISHES.map((dish, i) => (
              <div 
                key={i}
                ref={(el) => { dishRefs.current[i] = el; }}
                className="flex flex-col transition-opacity duration-500"
                style={{ opacity: activeIndex === i ? 1 : 0.3 }}
              >
                <h3 className="text-3xl md:text-4xl font-serif text-[#2B241D] mb-4 tracking-wide">
                  {dish.title}
                </h3>
                <p className="text-[18px] text-[#5E564D] leading-[1.9] max-w-md font-sans">
                  {dish.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: Pinned Featured Image */}
        <div className="lg:col-span-6 relative w-full h-[60vh] lg:h-[80vh] lg:sticky lg:top-[10vh] overflow-hidden bg-[#2B241D]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeIndex}
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
              className="absolute inset-0 w-full h-full"
            >
              <Image
                src={DISHES[activeIndex].image}
                alt={DISHES[activeIndex].title}
                fill
                className="object-cover object-center"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
              {/* Luxury tint */}
              <div className="absolute inset-0 bg-black/10 mix-blend-overlay" />
            </motion.div>
          </AnimatePresence>
        </div>

      </div>
    </section>
  );
}
