"use client";

import Link from "next/link";
import { motion, useScroll } from "framer-motion";
import { useState, useEffect } from "react";

export function MobileBottomBar() {
  const { scrollY } = useScroll();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    return scrollY.onChange((latest) => {
      // Show the bar only after scrolling past the hero section (approx 80vh)
      if (latest > window.innerHeight * 0.8) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    });
  }, [scrollY]);

  return (
    <motion.div 
      initial={{ y: "100%" }}
      animate={{ y: isVisible ? "0%" : "100%" }}
      transition={{ type: "tween", ease: [0.16, 1, 0.3, 1], duration: 0.6 }}
      className="fixed bottom-0 left-0 right-0 z-[80] lg:hidden w-full bg-[#2A211C] shadow-[0_-4px_20px_rgba(0,0,0,0.2)]"
    >
      <div className="flex h-[60px]">
        
        <Link
          href="/reservations"
          className="flex-1 flex items-center justify-center border-r border-[#F6F2EA]/10 text-[#F6F2EA] text-[12px] font-medium tracking-[0.15em] uppercase hover:bg-[#3A2F28] transition-colors"
        >
          Reserve Table
        </Link>
        
        <Link
          href="https://www.bombaybicyclechef.uk/locator"
          className="flex-1 flex items-center justify-center bg-[#7A0E2E] text-[#F6F2EA] text-[12px] font-medium tracking-[0.15em] uppercase hover:bg-[#5D0925] transition-colors"
        >
          Order Online
        </Link>
        
      </div>
    </motion.div>
  );
}
