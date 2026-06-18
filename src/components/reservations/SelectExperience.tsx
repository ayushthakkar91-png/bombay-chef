"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const EXPERIENCES = [
  { id: "lunch", title: "Lunch", desc: "A brief escape. Bright, flavorful, and perfectly paced." },
  { id: "dinner", title: "Dinner", desc: "The main event. Dim lights, deep spices, and shared stories." },
  { id: "brunch", title: "Weekend Brunch", desc: "Leisurely mornings melting into afternoons with signature dishes." },
  { id: "private", title: "Private Dining", desc: "Exclusive spaces tailored for your most important gatherings." },
  { id: "celebration", title: "Celebration Booking", desc: "For the moments that matter. Let us handle the details." }
];

interface SelectExperienceProps {
  onSelect: (expId: string) => void;
  selectedExperience: string | null;
}

export function SelectExperience({ onSelect, selectedExperience }: SelectExperienceProps) {
  const [hoveredExp, setHoveredExp] = useState<string | null>(null);

  return (
    <section className="w-full bg-[#2A211C] py-24 lg:py-[160px] px-6 border-t border-[#F6F2EA]/5">
      <div className="max-w-[1000px] mx-auto">
        
        <div className="text-center mb-16 lg:mb-24">
          <span className="text-[#B08A3E] text-[13px] tracking-[0.2em] font-semibold uppercase mb-6 block font-sans">
            Step 02
          </span>
          <h2 className="text-[40px] md:text-[56px] lg:text-[72px] font-serif text-[#F6F2EA] leading-[1.1]">
            Select Your Experience
          </h2>
        </div>

        <div className="flex flex-col border-t border-[#F6F2EA]/10">
          {EXPERIENCES.map((exp) => {
            const isHovered = hoveredExp === exp.id;
            const isSelected = selectedExperience === exp.id;

            return (
              <div 
                key={exp.id}
                onMouseEnter={() => setHoveredExp(exp.id)}
                onMouseLeave={() => setHoveredExp(null)}
                onClick={() => onSelect(exp.id)}
                className="relative flex flex-col justify-center border-b border-[#F6F2EA]/10 py-8 lg:py-12 cursor-pointer group overflow-hidden"
              >
                {/* Background Hover Tint */}
                <div 
                  className={`absolute inset-0 bg-[#B08A3E]/5 transition-opacity duration-500 pointer-events-none ${isSelected ? "opacity-100" : isHovered ? "opacity-100" : "opacity-0"}`}
                />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between px-4 lg:px-8">
                  <h3 className={`text-[28px] lg:text-[40px] font-serif transition-colors duration-500 ${isSelected || isHovered ? "text-[#B08A3E]" : "text-[#F6F2EA]"}`}>
                    {exp.title}
                  </h3>

                  <AnimatePresence>
                    {(isHovered || isSelected) && (
                      <motion.p 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                        className="text-[#F6F2EA]/60 font-sans text-[14px] lg:text-[16px] max-w-[300px] mt-4 md:mt-0 md:text-right"
                      >
                        {exp.desc}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>

                {/* Animated Left Border */}
                <div 
                  className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#B08A3E] transition-all duration-500 ease-in-out"
                  style={{ height: isSelected ? "100%" : isHovered ? "40%" : "0%", top: "50%", transform: "translateY(-50%)" }}
                />
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
