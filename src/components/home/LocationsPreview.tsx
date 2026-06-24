"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { branchBySlug } from "@/data/locations";
import { RESERVATIONS_ONLINE } from "@/lib/flags";

const LOCATIONS = [
  {
    name: "Balham",
    address: "88 Balham High Rd, London SW12 9AG",
    phone: "020 8772 3222",
    atmosphere: "Intimate, warm, and constantly buzzing. Our original dining room where the story began, featuring vintage Irani café mirrors and dark wood panelling.",
    image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=2000&auto=format&fit=crop"
  },
  {
    name: "Battersea",
    address: "28 Queenstown Rd, London SW8 3RX",
    phone: "020 7720 0500",
    atmosphere: "High ceilings, large tables, perfect for Sunday gatherings and evening celebrations. The air smells of charred tandoor and celebration.",
    image: "https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?q=80&w=2000&auto=format&fit=crop"
  },
  {
    name: "Kilburn",
    address: "24 Willesden Ln, London NW6 7ST",
    phone: "020 7624 0300",
    atmosphere: "Cozy leather booths and a lively brass bar serving spice-infused cocktails late into the night. A vibrant escape from the High Road.",
    image: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?q=80&w=2000&auto=format&fit=crop"
  }
];

export function Locations() {
  return (
    <section className="bg-[#2B241D] w-full pt-20 pb-32 lg:pt-[140px] lg:pb-[160px] px-6">
      <div className="max-w-[1200px] mx-auto">

        {/* Heading */}
        <div className="text-center max-w-[900px] mx-auto mb-20 lg:mb-32">
          <span className="text-[#C8A96B] text-[10px] sm:text-[11px] tracking-[0.35em] font-normal uppercase mb-8 block font-sans">
            Chapter VI &middot; London Locations
          </span>
          <h2 className="text-[36px] sm:text-[48px] md:text-[56px] lg:text-[72px] font-serif text-[#F3EEE8] leading-[1.1] mb-8">
            Three Neighbourhoods.<br/>One Bombay Spirit.
          </h2>
          <p className="text-[16px] lg:text-[18px] text-[#F3EEE8]/70 max-w-[700px] mx-auto leading-[1.9] font-sans font-light">
            Each dining room carries the same spirit, shaped by its own street.
          </p>
        </div>

        {/* Alternating Editorial Layouts */}
        <div className="flex flex-col space-y-24 lg:space-y-40">
          {LOCATIONS.map((loc, index) => {
            const isEven = index % 2 === 1;
            const branch = branchBySlug(loc.name.toLowerCase());
            const canBookOnline = RESERVATIONS_ONLINE && Boolean(branch?.reservable);

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
                  <span className="text-[#C8A96B] text-[10px] font-sans tracking-[0.3em] uppercase mb-4 block">
                    Destination {index + 1}
                  </span>
                  <h3 className="text-[40px] lg:text-[56px] font-serif text-[#F3EEE8] leading-[1.1] mb-8">
                    {loc.name}
                  </h3>
                  
                  <p className="text-[#F3EEE8]/80 text-[16px] lg:text-[18px] font-light font-serif leading-[1.8] mb-10 max-w-md italic">
                    &ldquo;{loc.atmosphere}&rdquo;
                  </p>

                  <div className="flex flex-col space-y-2 mb-10">
                    <p className="text-[#C8A96B] text-[10px] font-sans uppercase tracking-[0.25em] mb-2">Details</p>
                    <p className="text-[#F3EEE8]/60 text-[13px] font-sans font-light tracking-wide">{loc.address}</p>
                    <p className="text-[#F3EEE8]/60 text-[13px] font-sans font-light tracking-wide">{loc.phone}</p>
                  </div>
                  
                  {branch?.reservable && (
                    <div className="flex items-center gap-6">
                      {canBookOnline ? (
                        <Link
                          href="/reservations"
                          className="inline-flex items-center justify-center h-[44px] px-10 border border-[#C8A96B]/30 text-[#C8A96B] text-[10px] tracking-[0.2em] uppercase font-sans hover:border-[#C8A96B] hover:text-[#F3EEE8] transition-all duration-500"
                        >
                          Book {loc.name}
                        </Link>
                      ) : (
                        <a
                          href={`tel:${loc.phone.replace(/\s/g, "")}`}
                          className="inline-flex items-center justify-center h-[44px] px-10 border border-[#C8A96B]/30 text-[#C8A96B] text-[10px] tracking-[0.2em] uppercase font-sans hover:border-[#C8A96B] hover:text-[#F3EEE8] transition-all duration-500"
                        >
                          Call to Book
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
