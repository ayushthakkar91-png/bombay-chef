"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const LOCATIONS = [
  {
    name: "Balham",
    address: "12-14 Bedford Hill, SW12 9RG",
    phone: "020 8123 4567",
    vibe: "Intimate, warm, and constantly buzzing. Our original dining room.",
    image: "/images/locations/balham.jpg"
  },
  {
    name: "Battersea",
    address: "89 Northcote Road, SW11 6PL",
    phone: "020 8123 4568",
    vibe: "High ceilings, large tables, perfect for Sunday gatherings.",
    image: "/images/locations/battersea.jpg"
  },
  {
    name: "Kilburn",
    address: "244 High Road, NW6 2BS",
    phone: "020 8123 4569",
    vibe: "Cozy booths and a lively bar serving spice-infused cocktails.",
    image: "/images/locations/kilburn.jpg"
  }
];

export function Locations() {
  return (
    <section className="bg-[#2B241D] w-full pt-20 pb-20 lg:pt-[120px] lg:pb-[120px] px-6">
      <div className="max-w-[1200px] mx-auto">

        {/* Heading */}
        <div className="text-center max-w-[900px] mx-auto mb-16 lg:mb-24">
          <span className="text-[#A88442] text-[13px] tracking-[0.2em] font-semibold uppercase mb-6 block font-sans">
            Chapter VI : London Locations
          </span>
          <h2 className="text-[28px] sm:text-[36px] md:text-[48px] lg:text-[56px] font-serif text-[#F5F0E6] leading-[1.15] mb-6">
            Three Neighbourhoods.<br/>One Bombay Spirit.
          </h2>
          <p className="text-[18px] text-[#EFE6D8]/70 max-w-[700px] mx-auto leading-[1.9] font-sans">
            Each dining room carries the same spirit, shaped by its own street.
          </p>
        </div>

        {/* Typographical Grid with Depth Images */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 border-t border-[rgba(245,240,230,0.1)] pt-12">
          {LOCATIONS.map((loc) => (
            <div 
              key={loc.name}
              className="flex flex-col group cursor-pointer"
            >
              <div className="relative w-full aspect-[4/5] overflow-hidden mb-8 bg-[#1A1510]">
                <motion.div 
                  className="absolute inset-0 w-full h-full"
                  whileHover={{ scale: 1.03 }}
                  transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div
                    className="absolute inset-0 bg-cover bg-center opacity-60 mix-blend-luminosity"
                    style={{ backgroundImage: `url(${loc.image})` }}
                  />
                  {/* Luxury tint */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#2B241D] via-transparent to-transparent opacity-80" />
                </motion.div>
              </div>

              <h3 className="text-3xl lg:text-4xl font-serif text-[#F5F0E6] mb-4">
                {loc.name}
              </h3>
              <p className="text-[#EFE6D8]/60 text-[15px] font-sans uppercase tracking-[0.1em] mb-4">
                {loc.address}
              </p>
              <p className="text-[#EFE6D8]/80 text-[18px] font-sans leading-[1.8] flex-grow mb-8">
                {loc.vibe}
              </p>
              
              <Link 
                href="/reservations"
                className="inline-flex items-center text-[#A88442] text-[13px] tracking-[0.15em] font-medium uppercase hover:text-[#F5F0E6] transition-colors duration-300"
              >
                Book {loc.name} <span className="ml-2 transition-transform duration-300 group-hover:translate-x-2">→</span>
              </Link>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
