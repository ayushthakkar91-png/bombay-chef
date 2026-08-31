"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { branchBySlug, BRANCHES } from "@/data/locations";
import { RESERVATIONS_ONLINE } from "@/lib/flags";

// Name / address / phone come from BRANCHES (single source); the establishment
// year + atmosphere copy are presentation-only and live here.
const COPY: Record<string, { established: string; atmosphere: string }> = {
  balham: {
    established: "Est. 2014",
    atmosphere: "Bombay Bicycle Chef in Balham offers a diverse selection of Indian cuisine, featuring a blend of traditional and modern dishes. The menu includes popular items like Chicken Tikka Masala, Lamb Dum Biryani, and Shahi Paneer.",
  },
  battersea: {
    established: "Est. 2018",
    atmosphere: "Bombay Bicycle Chef in Battersea offers a diverse selection of Indian cuisine, featuring a blend of traditional and modern dishes. The menu includes popular items like Tandoori Lamb Chops, Shahi Paneer, and Chicken Biryani.",
  },
  kilburn: {
    established: "Est. 2021",
    atmosphere: "Bombay Bicycle Chef in Kilburn offers a diverse selection of Indian cuisine, featuring a blend of traditional and modern dishes. The menu includes popular items like Chicken Tikka Masala, Chicken Biryani, and Lamb Dum Biryani.",
  },
};

const LOCATIONS = BRANCHES.map((b) => ({
  name: b.name,
  established: COPY[b.slug].established,
  address: `${b.street}, ${b.locality} ${b.postcode}`,
  phone: b.phone,
  atmosphere: COPY[b.slug].atmosphere,
}));

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
                {/* Monogram Panel (placeholder until photography is added) */}
                <div className="w-full lg:w-1/2">
                  <div className="relative w-full aspect-[4/5] overflow-hidden bg-gradient-to-br from-[#1A1510] to-[#241D16] border border-[#C8A96B]/15">
                    {/* Decorative inner frame */}
                    <div className="absolute inset-5 lg:inset-7 border border-[#C8A96B]/15" />

                    <motion.div
                      className="absolute inset-0 flex flex-col items-center justify-center text-center px-8"
                      initial={{ opacity: 0.85 }}
                      whileHover={{ scale: 1.03 }}
                      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <span className="text-[#C8A96B]/80 text-[10px] tracking-[0.4em] uppercase font-sans mb-6">
                        {loc.established}
                      </span>
                      <span className="text-[#F3EEE8]/90 text-[120px] lg:text-[160px] font-serif leading-none">
                        {loc.name.charAt(0)}
                      </span>
                      <span className="mt-6 w-12 h-px bg-[#C8A96B]/40" />
                      <span className="mt-6 text-[#F3EEE8]/50 text-[11px] tracking-[0.35em] uppercase font-sans">
                        {loc.name}
                      </span>
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
