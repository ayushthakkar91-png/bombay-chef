"use client";

import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { SmoothScroll } from "@/components/motion/SmoothScroll";
import { motion } from "framer-motion";

export default function ContactPage() {
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleFocus = (field: string) => setFocusedField(field);
  const handleBlur = () => setFocusedField(null);

  return (
    <SmoothScroll>
      <Navbar />
      <main className="min-h-screen bg-[#F6F2EA] selection:bg-[#B08A3E] selection:text-[#F6F2EA] pt-[110px]">
        
        <div className="max-w-[1200px] mx-auto px-6 py-16 lg:py-24 grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-32">
          
          {/* Left Side: Contact Info */}
          <div className="flex flex-col">
            <span className="text-[#B08A3E] text-[13px] tracking-[0.2em] font-semibold uppercase mb-8 block font-sans">
              Get in Touch
            </span>
            <h1 className="text-[56px] md:text-[80px] font-serif text-[#2B221D] leading-[1.1] mb-12">
              We&apos;d Love to Hear From You
            </h1>
            
            <div className="flex flex-col space-y-12 text-[#5A524B] font-sans text-[16px] leading-[1.8]">
              <div>
                <h4 className="text-[#B08A3E] text-[12px] tracking-[0.2em] uppercase font-semibold font-sans mb-3">
                  General Enquiries
                </h4>
                <p>For general questions, feedback, or press requests.</p>
                <a href="mailto:hello@bombaybicyclechef.uk" className="text-[#2B221D] font-medium hover:text-[#B08A3E] transition-colors">
                  hello@bombaybicyclechef.uk
                </a>
              </div>

              <div>
                <h4 className="text-[#B08A3E] text-[12px] tracking-[0.2em] uppercase font-semibold font-sans mb-3">
                  Private Events & Catering
                </h4>
                <p>Host your next event with us. From corporate lunches to large celebrations.</p>
                <a href="mailto:events@bombaybicyclechef.uk" className="text-[#2B221D] font-medium hover:text-[#B08A3E] transition-colors">
                  events@bombaybicyclechef.uk
                </a>
              </div>

              <div>
                <h4 className="text-[#B08A3E] text-[12px] tracking-[0.2em] uppercase font-semibold font-sans mb-3">
                  Careers
                </h4>
                <p>Join our team of passionate chefs and hospitality professionals.</p>
                <a href="mailto:careers@bombaybicyclechef.uk" className="text-[#2B221D] font-medium hover:text-[#B08A3E] transition-colors">
                  careers@bombaybicyclechef.uk
                </a>
              </div>
            </div>
          </div>

          {/* Right Side: Form */}
          <div className="flex flex-col justify-center">
            <form className="flex flex-col space-y-12 w-full max-w-[500px]" onSubmit={(e) => e.preventDefault()}>
              
              {[
                { id: "name", label: "Full Name", type: "text", placeholder: "Your Name" },
                { id: "email", label: "Email Address", type: "email", placeholder: "your@email.com" },
                { id: "subject", label: "Subject", type: "text", placeholder: "How can we help?" },
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
                    placeholder={field.placeholder}
                    onFocus={() => handleFocus(field.id)}
                    onBlur={handleBlur}
                    className="w-full bg-transparent border-b border-[#2A211C]/20 py-2 text-[18px] text-[#2B221D] font-serif focus:outline-none transition-colors placeholder:text-[#2A211C]/20 rounded-none"
                  />
                  <motion.div 
                    className="absolute bottom-0 left-0 h-[1px] bg-[#B08A3E]"
                    initial={{ width: 0 }}
                    animate={{ width: focusedField === field.id ? "100%" : 0 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                  />
                </div>
              ))}

              <div className="relative flex flex-col group">
                <label 
                  htmlFor="message" 
                  className={`text-[12px] uppercase tracking-[0.15em] font-medium transition-colors duration-300 mb-2 ${focusedField === "message" ? "text-[#B08A3E]" : "text-[#5A524B]"}`}
                >
                  Message
                </label>
                <textarea
                  id="message"
                  rows={4}
                  onFocus={() => handleFocus("message")}
                  onBlur={handleBlur}
                  placeholder="Your message..."
                  className="w-full bg-transparent border-b border-[#2A211C]/20 py-2 text-[18px] text-[#2B221D] font-serif focus:outline-none transition-colors resize-none placeholder:text-[#2A211C]/20"
                />
                <motion.div 
                  className="absolute bottom-0 left-0 h-[1px] bg-[#B08A3E]"
                  initial={{ width: 0 }}
                  animate={{ width: focusedField === "message" ? "100%" : 0 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                />
              </div>

              <div className="pt-8">
                <button
                  type="submit"
                  className="w-full lg:w-auto inline-flex items-center justify-center h-[56px] px-16 bg-[#2B221D] text-[#F6F2EA] text-[13px] tracking-[0.15em] font-medium uppercase font-sans hover:bg-[#B08A3E] transition-colors duration-500"
                >
                  Send Message
                </button>
              </div>

            </form>
          </div>

        </div>

      </main>
    </SmoothScroll>
  );
}
