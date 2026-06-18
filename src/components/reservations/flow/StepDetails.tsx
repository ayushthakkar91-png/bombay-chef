"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { BookingState } from "./types";

interface Props {
  state: BookingState;
  updateState: (updates: Partial<BookingState>) => void;
  nextStep: () => void;
  prevStep: () => void;
}

export function StepDetails({ state, updateState, nextStep, prevStep }: Props) {
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleFocus = (field: string) => setFocusedField(field);
  const handleBlur = () => setFocusedField(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (state.details.name && state.details.email) {
      nextStep();
    }
  };

  return (
    <div className="w-full flex flex-col pt-8 max-w-[600px] mx-auto">
      
      <div className="text-center mb-16">
        <h2 className="text-[40px] md:text-[56px] font-serif text-[#2B221D] leading-none mb-6">
          Guest Details
        </h2>
        <p className="text-[#5A524B] text-[16px] font-sans">
          Please provide your contact information.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col space-y-12">
        
        <div className="relative flex flex-col group">
          <label 
            htmlFor="name" 
            className={`text-[12px] uppercase tracking-[0.15em] font-medium transition-colors duration-300 mb-2 ${focusedField === "name" ? "text-[#B08A3E]" : "text-[#5A524B]"}`}
          >
            Full Name *
          </label>
          <input
            id="name"
            type="text"
            required
            value={state.details.name}
            onChange={(e) => updateState({ details: { ...state.details, name: e.target.value } })}
            onFocus={() => handleFocus("name")}
            onBlur={handleBlur}
            placeholder="Your Name"
            className="w-full bg-transparent border-b border-[#2A211C]/20 py-2 text-[18px] text-[#2B221D] font-serif focus:outline-none transition-colors placeholder:text-[#2A211C]/20 rounded-none"
          />
          <motion.div 
            className="absolute bottom-0 left-0 h-[1px] bg-[#B08A3E]"
            initial={{ width: 0 }}
            animate={{ width: focusedField === "name" ? "100%" : 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>

        <div className="relative flex flex-col group">
          <label 
            htmlFor="email" 
            className={`text-[12px] uppercase tracking-[0.15em] font-medium transition-colors duration-300 mb-2 ${focusedField === "email" ? "text-[#B08A3E]" : "text-[#5A524B]"}`}
          >
            Email Address *
          </label>
          <input
            id="email"
            type="email"
            required
            value={state.details.email}
            onChange={(e) => updateState({ details: { ...state.details, email: e.target.value } })}
            onFocus={() => handleFocus("email")}
            onBlur={handleBlur}
            placeholder="your@email.com"
            className="w-full bg-transparent border-b border-[#2A211C]/20 py-2 text-[18px] text-[#2B221D] font-serif focus:outline-none transition-colors placeholder:text-[#2A211C]/20 rounded-none"
          />
          <motion.div 
            className="absolute bottom-0 left-0 h-[1px] bg-[#B08A3E]"
            initial={{ width: 0 }}
            animate={{ width: focusedField === "email" ? "100%" : 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>

        <div className="relative flex flex-col group">
          <label 
            htmlFor="phone" 
            className={`text-[12px] uppercase tracking-[0.15em] font-medium transition-colors duration-300 mb-2 ${focusedField === "phone" ? "text-[#B08A3E]" : "text-[#5A524B]"}`}
          >
            Phone Number
          </label>
          <input
            id="phone"
            type="tel"
            value={state.details.phone}
            onChange={(e) => updateState({ details: { ...state.details, phone: e.target.value } })}
            onFocus={() => handleFocus("phone")}
            onBlur={handleBlur}
            placeholder="+44"
            className="w-full bg-transparent border-b border-[#2A211C]/20 py-2 text-[18px] text-[#2B221D] font-serif focus:outline-none transition-colors placeholder:text-[#2A211C]/20 rounded-none"
          />
          <motion.div 
            className="absolute bottom-0 left-0 h-[1px] bg-[#B08A3E]"
            initial={{ width: 0 }}
            animate={{ width: focusedField === "phone" ? "100%" : 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>

        <div className="relative flex flex-col group">
          <label 
            htmlFor="requests" 
            className={`text-[12px] uppercase tracking-[0.15em] font-medium transition-colors duration-300 mb-2 ${focusedField === "requests" ? "text-[#B08A3E]" : "text-[#5A524B]"}`}
          >
            Special Requests
          </label>
          <textarea
            id="requests"
            rows={2}
            value={state.details.requests}
            onChange={(e) => updateState({ details: { ...state.details, requests: e.target.value } })}
            onFocus={() => handleFocus("requests")}
            onBlur={handleBlur}
            placeholder="Dietary requirements, celebrations..."
            className="w-full bg-transparent border-b border-[#2A211C]/20 py-2 text-[18px] text-[#2B221D] font-serif focus:outline-none transition-colors resize-none placeholder:text-[#2A211C]/20"
          />
          <motion.div 
            className="absolute bottom-0 left-0 h-[1px] bg-[#B08A3E]"
            initial={{ width: 0 }}
            animate={{ width: focusedField === "requests" ? "100%" : 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>

        <div className="pt-8 flex flex-col items-center gap-6">
          <button
            type="submit"
            className="w-full inline-flex items-center justify-center h-[56px] px-16 bg-[#2B221D] text-[#F6F2EA] text-[13px] tracking-[0.15em] font-medium uppercase font-sans hover:bg-[#B08A3E] transition-colors duration-500"
          >
            Review Details
          </button>
          
          <button 
            type="button"
            onClick={prevStep}
            className="text-[#2B221D] text-[12px] uppercase tracking-[0.15em] font-medium hover:text-[#B08A3E] transition-colors"
          >
            &larr; Back to Guests
          </button>
        </div>

      </form>

    </div>
  );
}
