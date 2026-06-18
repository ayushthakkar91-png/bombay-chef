"use client";

import { motion, AnimatePresence } from "framer-motion";
import { BookingState } from "./types";

interface Props {
  state: BookingState;
  updateState: (updates: Partial<BookingState>) => void;
  nextStep: () => void;
  prevStep: () => void;
}

const EXPERIENCES = [
  { id: "lunch", title: "Lunch", desc: "A brief escape. Bright, flavorful, and perfectly paced." },
  { id: "dinner", title: "Dinner", desc: "The main event. Dim lights, deep spices, and shared stories." },
  { id: "brunch", title: "Weekend Gathering", desc: "Leisurely mornings melting into afternoons." },
  { id: "private", title: "Private Dining", desc: "Exclusive spaces tailored for your most important gatherings." },
  { id: "celebration", title: "Celebration", desc: "For the moments that matter. Let us handle the details." }
];

export function StepExperience({ state, updateState, nextStep, prevStep }: Props) {
  const handleSelect = (id: string) => {
    updateState({ experience: id });
    setTimeout(() => {
      nextStep();
    }, 400);
  };

  return (
    <div className="w-full flex flex-col pt-8 max-w-[800px] mx-auto">
      
      <div className="text-center mb-16">
        <h2 className="text-[40px] md:text-[56px] font-serif text-[#2B221D] leading-none mb-6">
          Select Experience
        </h2>
        <p className="text-[#5A524B] text-[16px] font-sans">
          How would you like to dine with us?
        </p>
      </div>

      <div className="flex flex-col border-t border-[#2A211C]/10">
        {EXPERIENCES.map((exp) => {
          const isSelected = state.experience === exp.id;

          return (
            <div 
              key={exp.id}
              onClick={() => handleSelect(exp.id)}
              className="relative flex flex-col justify-center border-b border-[#2A211C]/10 py-6 lg:py-10 cursor-pointer group overflow-hidden"
            >
              {/* Background Hover Tint */}
              <div className={`absolute inset-0 bg-[#B08A3E]/5 transition-opacity duration-500 pointer-events-none ${isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`} />

              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between px-4 lg:px-8">
                <h3 className={`text-[28px] lg:text-[40px] font-serif transition-colors duration-500 ${isSelected ? "text-[#B08A3E]" : "text-[#2B221D] group-hover:text-[#B08A3E]"}`}>
                  {exp.title}
                </h3>

                <AnimatePresence>
                  {/* Show description on hover or selection using CSS grouping mostly to avoid react re-renders for hover */}
                  <div className={`text-[#5A524B] font-sans text-[14px] lg:text-[15px] max-w-[300px] mt-2 md:mt-0 md:text-right transition-opacity duration-500 ${isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
                    {exp.desc}
                  </div>
                </AnimatePresence>
              </div>

              {/* Animated Left Border */}
              <div 
                className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#B08A3E] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
                style={{ height: isSelected ? "100%" : "0%", top: "50%", transform: "translateY(-50%)" }}
              />
              <div className="absolute left-0 top-[30%] bottom-[30%] w-[3px] bg-[#B08A3E]/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </div>
          );
        })}
      </div>

      <div className="mt-12 flex justify-center">
        <button 
          onClick={prevStep}
          className="text-[#2B221D] text-[12px] uppercase tracking-[0.15em] font-medium hover:text-[#B08A3E] transition-colors"
        >
          &larr; Back to Locations
        </button>
      </div>

    </div>
  );
}
