"use client";

import { motion } from "framer-motion";
import { BookingState } from "./types";

interface Props {
  state: BookingState;
  updateState: (updates: Partial<BookingState>) => void;
  nextStep: () => void;
  prevStep: () => void;
}

const GUEST_OPTIONS = [
  { value: 1, label: "1 Guest" },
  { value: 2, label: "2 Guests" },
  { value: 3, label: "3 Guests" },
  { value: 4, label: "4 Guests" },
  { value: 5, label: "5 Guests" },
  { value: 6, label: "6 Guests" },
  { value: 7, label: "7 Guests" },
  { value: 8, label: "8 Guests" },
  { value: 9, label: "9 Guests" },
  { value: 10, label: "10+ Guests" }
];

export function StepGuests({ state, updateState, nextStep, prevStep }: Props) {
  const handleSelect = (num: number) => {
    updateState({ guests: num });
    setTimeout(() => {
      nextStep();
    }, 400);
  };

  return (
    <div className="w-full flex flex-col pt-8 max-w-[800px] mx-auto">
      
      <div className="text-center mb-16">
        <h2 className="text-[40px] md:text-[56px] font-serif text-[#2B221D] leading-none mb-6">
          Party Size
        </h2>
        <p className="text-[#5A524B] text-[16px] font-sans">
          How many guests will be joining?
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {GUEST_OPTIONS.map((opt) => {
          const isSelected = state.guests === opt.value;

          return (
            <div
              key={opt.value}
              onClick={() => handleSelect(opt.value)}
              className="relative h-[120px] flex items-center justify-center cursor-pointer group"
            >
              {/* Animated borders */}
              <div className="absolute inset-0 border border-[#2A211C]/10 transition-colors duration-300 group-hover:border-[#B08A3E]/50" />
              
              {isSelected && (
                <motion.div 
                  layoutId="guestSelection"
                  className="absolute inset-0 border-2 border-[#B08A3E] bg-[#B08A3E]/5 z-10"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}

              <span className={`relative z-20 font-serif text-[24px] transition-colors duration-300 ${isSelected ? "text-[#B08A3E]" : "text-[#2B221D]"}`}>
                {opt.label.split(' ')[0]}
              </span>
              <span className={`absolute bottom-4 z-20 text-[10px] font-sans uppercase tracking-[0.2em] transition-colors duration-300 ${isSelected ? "text-[#B08A3E]" : "text-[#5A524B]"}`}>
                {opt.label.split(' ')[1] || 'Guests'}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-16 flex justify-center">
        <button 
          onClick={prevStep}
          className="text-[#2B221D] text-[12px] uppercase tracking-[0.15em] font-medium hover:text-[#B08A3E] transition-colors"
        >
          &larr; Back to Date & Time
        </button>
      </div>

    </div>
  );
}
