"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const LOCATIONS = [
  {
    name: "Balham",
    address: "12-14 Bedford Hill, SW12 9RG",
    phone: "020 8123 4567",
    vibe: "Intimate, warm, and constantly buzzing. Our original dining room where the story began.",
    image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=2000&auto=format&fit=crop"
  },
  {
    name: "Battersea",
    address: "89 Northcote Road, SW11 6PL",
    phone: "020 8123 4568",
    vibe: "High ceilings, large tables, perfect for Sunday gatherings and evening celebrations.",
    image: "https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?q=80&w=2000&auto=format&fit=crop"
  },
  {
    name: "Kilburn",
    address: "244 High Road, NW6 2BS",
    phone: "020 8123 4569",
    vibe: "Cozy booths and a lively bar serving spice-infused cocktails late into the night.",
    image: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?q=80&w=2000&auto=format&fit=crop"
  }
];

export function Locations() {
  return (
    <section className="bg-[#2B241D] w-full pt-20 pb-32 lg:pt-[140px] lg:pb-[160px] px-6">
      <div className="max-w-[1200px] mx-auto">

        {/* Heading */}
        <div className="text-center max-w-[900px] mx-auto mb-20 lg:mb-32">
          <span className="text-[#A88442] text-[13px] tracking-[0.2em] font-semibold uppercase mb-8 block font-sans">
            Chapter VI &middot; London Locations
          </span>
          <h2 className="text-[36px] sm:text-[48px] md:text-[56px] lg:text-[72px] font-serif text-[#F5F0E6] leading-[1.1] mb-8">
            Three Neighbourhoods.<br/>One Bombay Spirit.
          </h2>
          <p className="text-[18px] lg:text-[20px] text-[#EFE6D8]/70 max-w-[700px] mx-auto leading-[1.9] font-sans">
            Each dining room carries the same spirit, shaped by its own street.
          </p>
        </div>

        {/* Alternating Editorial Layouts */}
        <div className="flex flex-col space-y-24 lg:space-y-40">
          {LOCATIONS.map((loc, index) => {
            const isEven = index % 2 === 1;
            
            return (
              <div 
                key={loc.name}
                className={`flex flex-col ${isEven ? 'lg:flex-row-reverse' : 'lg:flex-row'} items-center gap-12 lg:gap-24 group`}
              >
                {/* Image Side */}
                <div className="w-full lg:w-1/2">
                  <div className="relative w-full aspect-[4/5] overflow-hidden bg-[#1A1510]">
                    <motion.div 
                      className="absolute inset-0 w-full h-full"
                      whileHover={{ scale: 1.05 }}
                      transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <div
                        className="absolute inset-0 bg-cover bg-center opacity-80"
                        style={{ backgroundImage: `url(${loc.image})` }}
                      />
                      <div className="absolute inset-0 bg-black/20 mix-blend-overlay" />
                    </motion.div>
                  </div>
                </div>

                {/* Text Side */}
                <div className="w-full lg:w-1/2 flex flex-col justify-center">
                  <span className="text-[#A88442] text-[12px] font-sans tracking-[0.2em] uppercase mb-4">
                    Destination {index + 1}
                  </span>
                  <h3 className="text-[40px] lg:text-[56px] font-serif text-[#F5F0E6] leading-[1.1] mb-6">
                    {loc.name}
                  </h3>
                  <p className="text-[#EFE6D8]/60 text-[14px] font-sans uppercase tracking-[0.15em] mb-6">
                    {loc.address}
                  </p>
                  <p className="text-[#EFE6D8]/80 text-[18px] lg:text-[20px] font-sans leading-[1.9] mb-10 max-w-md">
                    {loc.vibe}
                  </p>
                  
                  <div>
                    <Link 
                      href="#chapter-reservation"
                      className="inline-flex items-center justify-center h-[52px] px-8 border border-[rgba(245,240,230,0.2)] text-[#F5F0E6] text-[12px] tracking-[0.15em] font-medium uppercase hover:bg-[#F5F0E6] hover:text-[#2B241D] transition-colors duration-500"
                    >
                      Book {loc.name}
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
