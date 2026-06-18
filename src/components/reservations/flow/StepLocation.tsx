"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { BookingState } from "./types";

interface Props {
  state: BookingState;
  updateState: (updates: Partial<BookingState>) => void;
  nextStep: () => void;
}

const LOCATIONS = [
  {
    id: "balham",
    name: "Balham",
    desc: "A neighbourhood favourite.",
    address: "12-14 Bedford Hill, SW12 9RG",
    image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=1000&auto=format&fit=crop"
  },
  {
    id: "battersea",
    name: "Battersea",
    desc: "Our flagship dining room.",
    address: "89 Northcote Road, SW11 6PL",
    image: "https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?q=80&w=1000&auto=format&fit=crop"
  },
  {
    id: "kilburn",
    name: "Kilburn",
    desc: "Warm hospitality and late evenings.",
    address: "244 High Road, NW6 2BS",
    image: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?q=80&w=1000&auto=format&fit=crop"
  }
];

export function StepLocation({ state, updateState, nextStep }: Props) {
  const handleSelect = (id: string) => {
    updateState({ location: id });
    // Small delay to show the gold highlight before transitioning
    setTimeout(() => {
      nextStep();
    }, 400);
  };

  return (
    <div className="w-full flex flex-col pt-8">
      
      <div className="text-center mb-16">
        <h2 className="text-[40px] md:text-[56px] font-serif text-[#2B221D] leading-none mb-6">
          Choose Your Location
        </h2>
        <p className="text-[#5A524B] text-[16px] font-sans">
          Three London neighbourhoods. One Bombay spirit.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
        {LOCATIONS.map((loc) => {
          const isSelected = state.location === loc.id;
          
          return (
            <div
              key={loc.id}
              onClick={() => handleSelect(loc.id)}
              className={`relative flex flex-col cursor-pointer group transition-all duration-700 ${state.location && !isSelected ? "opacity-40" : "opacity-100"}`}
            >
              {/* Image */}
              <div className="relative w-full aspect-[4/5] overflow-hidden mb-6 bg-[#2A211C]">
                <div className="absolute inset-0 w-full h-full transition-transform duration-[1.5s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105">
                  <Image
                    src={loc.image}
                    alt={loc.name}
                    fill
                    className={`object-cover transition-opacity duration-700 ${isSelected ? "opacity-100" : "opacity-70 group-hover:opacity-90"}`}
                  />
                  <div className="absolute inset-0 bg-black/10 mix-blend-overlay" />
                </div>
              </div>

              {/* Details */}
              <div className="flex flex-col relative pb-4">
                <h3 className={`text-[32px] font-serif transition-colors duration-500 mb-2 ${isSelected ? "text-[#B08A3E]" : "text-[#2B221D] group-hover:text-[#B08A3E]"}`}>
                  {loc.name}
                </h3>
                
                <p className="text-[#B08A3E] text-[12px] font-sans tracking-[0.15em] uppercase mb-3">
                  {loc.desc}
                </p>
                <p className="text-[#5A524B] text-[13px] font-sans">
                  {loc.address}
                </p>

                {/* Animated Gold Line */}
                <div className="absolute bottom-0 left-0 h-[1px] bg-[#B08A3E] transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]" style={{ width: isSelected ? "100%" : "0%" }} />
                
                {/* Hover line */}
                <div className="absolute bottom-0 left-0 h-[1px] bg-[#B08A3E]/30 w-0 group-hover:w-full transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]" />
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
