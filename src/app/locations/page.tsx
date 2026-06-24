"use client";

import Image from "next/image";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { SmoothScroll } from "@/components/motion/SmoothScroll";
import { OpeningHours } from "@/components/locations/OpeningHours";
import { branchBySlug } from "@/data/locations";
import { RESERVATIONS_ONLINE } from "@/lib/flags";

const LOCATIONS_DATA = [
  {
    id: "balham",
    name: "Balham",
    address: "88 Balham High Rd\nLondon SW12 9AG",
    phone: "020 8772 3222",
    image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=2000&auto=format&fit=crop",
    mapUrl: "https://maps.google.com"
  },
  {
    id: "battersea",
    name: "Battersea",
    address: "28 Queenstown Rd\nLondon SW8 3RX",
    phone: "020 7720 0500",
    image: "https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?q=80&w=2000&auto=format&fit=crop",
    mapUrl: "https://maps.google.com"
  },
  {
    id: "kilburn",
    name: "Kilburn",
    address: "24 Willesden Ln\nLondon NW6 7ST",
    phone: "020 7624 0300",
    image: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?q=80&w=2000&auto=format&fit=crop",
    mapUrl: "https://maps.google.com"
  }
];

export default function LocationsPage() {
  return (
    <SmoothScroll>
      <Navbar />
      <main className="min-h-screen bg-[#F6F2EA] selection:bg-[#B08A3E] selection:text-[#F6F2EA] pt-[110px]">
        
        <div className="max-w-[1200px] mx-auto px-6 py-16 lg:py-24">
          <div className="text-center mb-24">
            <h1 className="text-[56px] md:text-[80px] font-serif text-[#2B221D] leading-none mb-6">
              Our Locations
            </h1>
            <p className="text-[18px] text-[#5A524B] font-sans max-w-[600px] mx-auto leading-[1.8]">
              Three distinct neighbourhoods, one shared philosophy. Discover Bombay Bicycle Chef across London.
            </p>
          </div>

          <div className="flex flex-col space-y-32">
            {LOCATIONS_DATA.map((loc, index) => {
              const branch = branchBySlug(loc.id);
              const canBookOnline = RESERVATIONS_ONLINE && Boolean(branch?.reservable);
              return (
              <div key={loc.id} className={`flex flex-col ${index % 2 !== 0 ? 'lg:flex-row-reverse' : 'lg:flex-row'} gap-12 lg:gap-24 items-center`}>
                
                {/* Image */}
                <div className="w-full lg:w-3/5">
                  <div className="relative w-full aspect-[4/3] bg-[#2A211C] overflow-hidden">
                    <Image
                      src={loc.image}
                      alt={loc.name}
                      fill
                      className="object-cover transition-transform duration-[2s] hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/10 mix-blend-overlay" />
                  </div>
                </div>

                {/* Content */}
                <div className="w-full lg:w-2/5 flex flex-col justify-center">
                  <h2 className="text-[48px] lg:text-[64px] font-serif text-[#2B221D] leading-none mb-8">
                    {loc.name}
                  </h2>
                  
                  <div className="flex flex-col space-y-6 mb-12">
                    <div>
                      <h4 className="text-[#B08A3E] text-[12px] tracking-[0.2em] uppercase font-semibold font-sans mb-2">Address</h4>
                      <p className="text-[#5A524B] font-sans text-[16px] whitespace-pre-line leading-[1.6]">
                        {loc.address}
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="text-[#B08A3E] text-[12px] tracking-[0.2em] uppercase font-semibold font-sans mb-2">Hours</h4>
                      {branch ? (
                        <OpeningHours services={branch.hours} className="max-w-[320px] text-[15px] text-[#5A524B]" />
                      ) : null}
                    </div>

                    <div>
                      <h4 className="text-[#B08A3E] text-[12px] tracking-[0.2em] uppercase font-semibold font-sans mb-2">Contact</h4>
                      <p className="text-[#5A524B] font-sans text-[16px]">
                        {loc.phone}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4">
                    {branch?.reservable && (canBookOnline ? (
                      <Link
                        href="/reservations"
                        className="inline-flex items-center justify-center h-[52px] px-8 bg-[#2A211C] text-[#F6F2EA] text-[12px] tracking-[0.15em] font-medium uppercase font-sans hover:bg-[#B08A3E] hover:text-[#2A211C] transition-colors duration-500"
                      >
                        Book a Table
                      </Link>
                    ) : (
                      <a
                        href={`tel:${loc.phone.replace(/\s/g, "")}`}
                        className="inline-flex items-center justify-center h-[52px] px-8 bg-[#2A211C] text-[#F6F2EA] text-[12px] tracking-[0.15em] font-medium uppercase font-sans hover:bg-[#B08A3E] hover:text-[#2A211C] transition-colors duration-500"
                      >
                        Call to Book
                      </a>
                    ))}
                    <a
                      href={loc.mapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center h-[52px] px-8 border border-[#2A211C]/20 text-[#2B221D] text-[12px] tracking-[0.15em] font-medium uppercase font-sans hover:border-[#2A211C] transition-colors duration-500"
                    >
                      Get Directions
                    </a>
                  </div>

                </div>

              </div>
              );
            })}
          </div>
        </div>

      </main>
    </SmoothScroll>
  );
}
