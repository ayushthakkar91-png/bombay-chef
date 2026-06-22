"use client";

import { motion } from "framer-motion";
import { BookingStep } from "./types";

interface Props {
  currentStep: BookingStep;
  onStepClick: (step: BookingStep) => void;
}

const STEPS = [
  { num: 1, label: "Location" },
  { num: 2, label: "Experience" },
  { num: 3, label: "Date & Time" },
  { num: 4, label: "Guests" },
  { num: 5, label: "Details" },
  { num: 6, label: "Confirm" }
];

export function BookingProgress({ currentStep, onStepClick }: Props) {
  return (
    <div className="sticky top-[84px] lg:top-[88px] z-40 w-full bg-[#F6F2EA] border-b border-[#2A211C]/10 py-4 shadow-sm">
      <div className="max-w-[1200px] mx-auto px-6 overflow-x-auto hide-scrollbar">
        <div className="flex items-center min-w-max">
          
          {STEPS.map((step, index) => {
            const isCompleted = step.num < currentStep;
            const isActive = step.num === currentStep;
            const isFuture = step.num > currentStep;

            return (
              <div key={step.num} className="flex items-center">
                
                {/* Step Item */}
                <div 
                  onClick={() => isCompleted && onStepClick(step.num as BookingStep)}
                  className={`flex items-center gap-2 transition-colors duration-500 ${isCompleted ? "cursor-pointer hover:opacity-70" : ""} ${isActive ? "text-[#B08A3E]" : isCompleted ? "text-[#2A211C]" : "text-[#2A211C]/30"}`}
                >
                  <span className="font-serif text-[18px] lg:text-[22px]">
                    0{step.num}
                  </span>
                  <span className="font-sans text-[11px] uppercase tracking-[0.15em] font-medium hidden sm:block">
                    {step.label}
                  </span>
                </div>

                {/* Connector Line */}
                {index < STEPS.length - 1 && (
                  <div className="w-8 lg:w-16 h-[1px] mx-4 lg:mx-8 bg-[#2A211C]/10 relative">
                    <motion.div 
                      className="absolute left-0 top-0 bottom-0 bg-[#B08A3E]"
                      initial={{ width: "0%" }}
                      animate={{ width: isCompleted ? "100%" : "0%" }}
                      transition={{ duration: 0.6, ease: "easeInOut" }}
                    />
                  </div>
                )}

              </div>
            );
          })}

        </div>
      </div>
    </div>
  );
}
