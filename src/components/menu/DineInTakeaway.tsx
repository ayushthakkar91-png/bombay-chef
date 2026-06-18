"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";

export function DineInTakeaway() {
  const [hoveredSide, setHoveredSide] = useState<"left" | "right" | null>(null);

  return (
    <section className="w-full h-[80vh] lg:h-screen flex flex-col md:flex-row overflow-hidden bg-[#2A211C]">
      
      {/* Left: DINE IN */}
      <motion.div 
        className="relative w-full h-1/2 md:w-auto md:h-full flex flex-col items-center justify-center cursor-pointer group border-b md:border-b-0 md:border-r border-[#F6F2EA]/10"
        animate={{
          flex: hoveredSide === "left" ? 1.8 : hoveredSide === "right" ? 0.6 : 1
        }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        onMouseEnter={() => setHoveredSide("left")}
        onMouseLeave={() => setHoveredSide(null)}
      >
        <div className="absolute inset-0 w-full h-full">
          <Image
            src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=2000&auto=format&fit=crop"
            alt="Dine In"
            fill
            className="object-cover opacity-30 group-hover:opacity-60 transition-opacity duration-1000"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#2A211C] via-[#2A211C]/80 to-[#2A211C]/40" />
        </div>

        <div className="relative z-10 text-center px-6">
          <h2 className="text-[40px] md:text-[56px] lg:text-[72px] font-serif text-[#F6F2EA] mb-6">
            DINE IN
          </h2>
          <div className={`flex flex-col items-center space-y-4 text-[#F6F2EA]/80 font-sans text-[15px] uppercase tracking-[0.2em] overflow-hidden transition-all duration-700 ${hoveredSide === "left" ? "opacity-100 max-h-40" : "opacity-0 max-h-0"}`}>
            <span>Elegant Atmosphere</span>
            <span>Table Service</span>
            <span>Cocktails</span>
            <Link 
              href="/reservations" 
              className="mt-6 inline-flex items-center text-[#B08A3E] hover:text-[#F6F2EA] transition-colors"
            >
              Book A Table <span className="ml-2">→</span>
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Right: TAKEAWAY */}
      <motion.div 
        className="relative w-full h-1/2 md:w-auto md:h-full flex flex-col items-center justify-center cursor-pointer group"
        animate={{
          flex: hoveredSide === "right" ? 1.8 : hoveredSide === "left" ? 0.6 : 1
        }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        onMouseEnter={() => setHoveredSide("right")}
        onMouseLeave={() => setHoveredSide(null)}
      >
        <div className="absolute inset-0 w-full h-full">
          <Image
            src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=2000&auto=format&fit=crop"
            alt="Takeaway"
            fill
            className="object-cover opacity-30 group-hover:opacity-60 transition-opacity duration-1000"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#2A211C] via-[#2A211C]/80 to-[#2A211C]/40" />
        </div>

        <div className="relative z-10 text-center px-6">
          <h2 className="text-[40px] md:text-[56px] lg:text-[72px] font-serif text-[#F6F2EA] mb-6">
            TAKEAWAY
          </h2>
          <div className={`flex flex-col items-center space-y-4 text-[#F6F2EA]/80 font-sans text-[15px] uppercase tracking-[0.2em] overflow-hidden transition-all duration-700 ${hoveredSide === "right" ? "opacity-100 max-h-40" : "opacity-0 max-h-0"}`}>
            <span>Freshly Prepared</span>
            <span>Collection</span>
            <span>Delivery</span>
            <Link 
              href="https://www.bombaybicyclechef.uk/locator" 
              className="mt-6 inline-flex items-center text-[#B08A3E] hover:text-[#F6F2EA] transition-colors"
            >
              Order Online <span className="ml-2">→</span>
            </Link>
          </div>
        </div>
      </motion.div>

    </section>
  );
}
