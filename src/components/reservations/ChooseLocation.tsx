"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

const LOCATIONS = [
  {
    id: "balham",
    name: "Balham",
    address: "12-14 Bedford Hill, SW12 9RG",
    hours: "Mon-Sun: 12pm - 11pm",
    image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=1000&auto=format&fit=crop"
  },
  {
    id: "battersea",
    name: "Battersea",
    address: "89 Northcote Road, SW11 6PL",
    hours: "Mon-Sun: 12pm - 11pm",
    image: "https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?q=80&w=1000&auto=format&fit=crop"
  },
  {
    id: "kilburn",
    name: "Kilburn",
    address: "244 High Road, NW6 2BS",
    hours: "Mon-Sun: 12pm - 11.30pm",
    image: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?q=80&w=1000&auto=format&fit=crop"
  }
];

interface ChooseLocationProps {
  onSelect: (locationId: string) => void;
  selectedLocation: string | null;
}

export function ChooseLocation({ onSelect, selectedLocation }: ChooseLocationProps) {
  const [hoveredLocation, setHoveredLocation] = useState<string | null>(null);

  return (
    <section className="w-full bg-[#F6F2EA] py-24 lg:py-[160px] px-6">
      <div className="max-w-[1200px] mx-auto">
        
        <div className="text-center mb-20 lg:mb-24">
          <span className="text-[#B08A3E] text-[13px] tracking-[0.2em] font-semibold uppercase mb-6 block font-sans">
            Step 01
          </span>
          <h2 className="text-[40px] md:text-[56px] lg:text-[72px] font-serif text-[#2B221D] leading-[1.1]">
            Choose Your Location
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
          {LOCATIONS.map((loc) => {
            const isHovered = hoveredLocation === loc.id;
            const isSelected = selectedLocation === loc.id;

            return (
              <motion.div
                key={loc.id}
                onMouseEnter={() => setHoveredLocation(loc.id)}
                onMouseLeave={() => setHoveredLocation(null)}
                onClick={() => onSelect(loc.id)}
                className={`relative flex flex-col cursor-pointer transition-all duration-700 ${isSelected ? "opacity-100" : selectedLocation ? "opacity-40" : "opacity-100"}`}
                animate={{ y: isHovered ? -10 : 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              >
                {/* Atmosphere Image */}
                <div className="relative w-full aspect-[4/5] overflow-hidden mb-8 bg-[#2A211C]">
                  <motion.div 
                    className="absolute inset-0 w-full h-full"
                    animate={{ scale: isHovered || isSelected ? 1.05 : 1 }}
                    transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <Image
                      src={loc.image}
                      alt={loc.name}
                      fill
                      className={`object-cover transition-opacity duration-700 ${isSelected ? "opacity-100" : isHovered ? "opacity-80" : "opacity-60"}`}
                    />
                    <div className="absolute inset-0 bg-black/10 mix-blend-overlay" />
                  </motion.div>
                </div>

                {/* Details */}
                <div className="flex flex-col relative pb-6">
                  <h3 className={`text-[32px] lg:text-[40px] font-serif transition-colors duration-500 mb-2 ${isHovered || isSelected ? "text-[#B08A3E]" : "text-[#2B221D]"}`}>
                    {loc.name}
                  </h3>
                  
                  <p className="text-[#5A524B] text-[14px] font-sans tracking-[0.15em] uppercase mb-2">
                    {loc.address}
                  </p>
                  <p className="text-[#5A524B]/70 text-[13px] font-sans">
                    {loc.hours}
                  </p>

                  {/* Animated Gold Line */}
                  <div className="absolute bottom-0 left-0 h-[1px] bg-[#B08A3E] transition-all duration-700 ease-in-out" style={{ width: isHovered || isSelected ? "100%" : "0%" }} />
                  <div className="absolute bottom-0 left-0 h-[1px] bg-[#2A211C]/10 w-full -z-10" />
                </div>
              </motion.div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
