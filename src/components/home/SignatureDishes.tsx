"use client";

import { useRef, useState } from "react";
import { gsap, ScrollTrigger } from "@/utils/gsap";
import { useGSAP } from "@gsap/react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

const DISHES = [
  {
    title: "Black House Daal",
    description: "Slow-cooked for 24 hours over wood fire, enriched with cream and butter.",
    whyItMatters: "A true labour of love. The rich, smoky depth of this daal represents the patience and tradition at the heart of our kitchen.",
    image: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?q=80&w=2000&auto=format&fit=crop"
  },
  {
    title: "Tandoori Lamb Chops",
    description: "Tender lamb cutlets marinated overnight in ginger, garlic, and Kashmiri chilli.",
    whyItMatters: "Kissed by the intense heat of the tandoor charcoal. It perfectly balances robust spice with a delicate, melt-in-the-mouth texture.",
    image: "https://images.unsplash.com/photo-1544025162-811114cdb83b?q=80&w=2000&auto=format&fit=crop"
  },
  {
    title: "Bicycle Biryani",
    description: "Aromatic basmati rice layered with marinated meat, saffron, and slow-cooked in a sealed handi.",
    whyItMatters: "Our ultimate tribute to celebration. The theatrical unsealing of the dough lid reveals aromas that immediately transport you to a Bombay feast.",
    image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?q=80&w=2000&auto=format&fit=crop"
  }
];

export function SignatureDishes() {
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
    <section ref={containerRef} className="bg-[#F5F0E6] relative w-full pt-24 pb-24 lg:pt-[160px] lg:pb-[160px] border-t border-[rgba(43,36,29,0.05)]">
      <div className="max-w-[1200px] mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-24 items-start relative">
        
        {/* Left Side: Story & Menu */}
        <div className="lg:col-span-6 flex flex-col lg:pr-12 py-10 z-10">
          <span className="text-[#A88442] text-[11px] tracking-[0.35em] font-normal uppercase mb-6 font-sans">
            Chapter IV &middot; The Signature Dishes
          </span>

          <span className="text-[#2B241D]/60 text-[16px] tracking-[0.06em] font-light mb-8 italic">
            याद रह जाने वाले स्वाद
          </span>
          
          <h2 className="text-[36px] sm:text-[48px] md:text-[60px] font-serif text-[#2B241D] leading-[1.1] mb-10 tracking-[0.01em]">
            The Dishes People<br />Return For.
          </h2>

          <div className="flex flex-col space-y-6 text-[#5E564D] text-[17px] leading-[2.1] mb-16 font-sans tracking-[0.02em]">
            <p>Some recipes earn their place through time.</p>
          </div>

          <div className="flex flex-col space-y-24 lg:pb-[30vh]">
            {DISHES.map((dish, i) => (
              <div 
                key={i}
                ref={(el) => { dishRefs.current[i] = el; }}
                className="flex flex-col transition-opacity duration-700"
                style={{ opacity: activeIndex === i ? 1 : 0.25 }}
              >
                <h3 className="text-[28px] md:text-[36px] font-serif text-[#2B241D] mb-4 tracking-wide">
                  {dish.title}
                </h3>
                <p className="text-[15px] lg:text-[16px] text-[#5E564D] leading-[1.8] max-w-md font-sans mb-8">
                  {dish.description}
                </p>
                <div className="flex flex-col border-l border-[#B08A3E]/30 pl-6 max-w-md">
                  <span className="text-[#A88442] text-[10px] tracking-[0.25em] uppercase font-medium mb-3 font-sans">Why It Matters</span>
                  <p className="text-[16px] text-[#2B241D]/80 leading-[1.7] italic font-light">
                    "{dish.whyItMatters}"
                  </p>
                </div>
              </div>
            ))}

            {/* Outro Text (Appears after scrolling past the dishes) */}
            <div className="flex flex-col space-y-6 text-[#5E564D] text-[16px] leading-[2.1] font-sans tracking-[0.02em] pt-12">
              <p>Each dish tells a story of tradition, craftsmanship and flavour.</p>
              <p>Prepared with respect for where it came from.<br />Served with pride for where it is today.</p>
              <p className="text-[#2B241D] text-[20px] lg:text-[24px] font-serif mt-4 leading-[1.4] tracking-wide">
                These are the dishes that bring people back.<br />Again and again.
              </p>
            </div>
          </div>
        </div>

        {/* Right Side: Pinned Featured Image */}
        <div className="lg:col-span-6 relative w-full h-[60vh] lg:h-[85vh] lg:sticky lg:top-[7.5vh] overflow-hidden bg-[#2B241D]">
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
                src={DISHES[activeIndex].image}
                alt={DISHES[activeIndex].title}
                fill
                className="object-cover object-center"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
              <div className="absolute inset-0 bg-black/15 mix-blend-overlay" />
            </motion.div>
          </AnimatePresence>
        </div>

      </div>
    </section>
  );
}
