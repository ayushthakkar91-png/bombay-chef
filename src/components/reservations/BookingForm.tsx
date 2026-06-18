"use client";

import { useState } from "react";
import { motion } from "framer-motion";

export function BookingForm() {
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleFocus = (field: string) => setFocusedField(field);
  const handleBlur = () => setFocusedField(null);

  return (
    <section id="booking-form" className="w-full bg-[#F6F2EA] py-24 lg:py-[160px] px-6">
      <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-32">
        
        {/* Left Side: Editorial Story */}
        <div className="flex flex-col justify-center">
          <span className="text-[#B08A3E] text-[13px] tracking-[0.2em] font-semibold uppercase mb-8 block font-sans">
            Step 03
          </span>
          <h2 className="text-[40px] md:text-[56px] lg:text-[72px] font-serif text-[#2B221D] leading-[1.1] mb-12">
            The Booking<br />Experience
          </h2>
          <div className="text-[18px] lg:text-[22px] text-[#5A524B] leading-[1.9] font-sans">
            <p className="mb-6">
              Whether it&apos;s a quiet dinner,
              <br />a family gathering,
              <br />or a special celebration,
              <br />we look forward to welcoming you.
            </p>
            <p>
              Please provide your details below. Our reservations team will confirm your table shortly.
            </p>
          </div>
        </div>

        {/* Right Side: Custom Form */}
        <div className="flex flex-col justify-center w-full">
          <form className="flex flex-col space-y-12 w-full max-w-[500px]" onSubmit={(e) => e.preventDefault()}>
            
            {/* Form Fields Array */}
            {[
              { id: "date", label: "Date", type: "date" },
              { id: "time", label: "Time", type: "time" },
              { id: "guests", label: "Number of Guests", type: "number", min: "1", max: "20" },
              { id: "name", label: "Full Name", type: "text", placeholder: "Your Name" },
              { id: "email", label: "Email Address", type: "email", placeholder: "your@email.com" },
              { id: "phone", label: "Phone Number", type: "tel", placeholder: "+44" },
            ].map((field) => (
              <div key={field.id} className="relative flex flex-col group">
                <label 
                  htmlFor={field.id} 
                  className={`text-[12px] uppercase tracking-[0.15em] font-medium transition-colors duration-300 mb-2 ${focusedField === field.id ? "text-[#B08A3E]" : "text-[#5A524B]"}`}
                >
                  {field.label}
                </label>
                <input
                  id={field.id}
                  type={field.type}
                  {...(field.min && { min: field.min })}
                  {...(field.max && { max: field.max })}
                  placeholder={field.placeholder}
                  onFocus={() => handleFocus(field.id)}
                  onBlur={handleBlur}
                  className="w-full bg-transparent border-b border-[#2A211C]/20 py-2 text-[18px] text-[#2B221D] font-serif focus:outline-none transition-colors placeholder:text-[#2A211C]/20 appearance-none rounded-none"
                  style={{ colorScheme: "light" }} // For date/time pickers
                />
                {/* Animated Bottom Border */}
                <motion.div 
                  className="absolute bottom-0 left-0 h-[1px] bg-[#B08A3E]"
                  initial={{ width: 0 }}
                  animate={{ width: focusedField === field.id ? "100%" : 0 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                />
              </div>
            ))}

            {/* Special Requests textarea */}
            <div className="relative flex flex-col group">
              <label 
                htmlFor="requests" 
                className={`text-[12px] uppercase tracking-[0.15em] font-medium transition-colors duration-300 mb-2 ${focusedField === "requests" ? "text-[#B08A3E]" : "text-[#5A524B]"}`}
              >
                Special Requests
              </label>
              <textarea
                id="requests"
                rows={3}
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

            {/* Submit Button */}
            <div className="pt-8">
              <button
                type="submit"
                className="w-full lg:w-auto inline-flex items-center justify-center h-[56px] px-16 bg-[#2B221D] text-[#F6F2EA] text-[13px] tracking-[0.15em] font-medium uppercase font-sans hover:bg-[#B08A3E] transition-colors duration-500"
              >
                Request Reservation
              </button>
            </div>

          </form>
        </div>

      </div>
    </section>
  );
}
