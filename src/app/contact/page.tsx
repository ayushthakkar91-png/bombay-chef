"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";

import { submitEnquiry } from "./actions";

export default function ContactPage() {
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFocus = (field: string) => setFocusedField(field);
  const handleBlur = () => setFocusedField(null);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const input = {
      name: String(fd.get("name") ?? ""),
      email: String(fd.get("email") ?? ""),
      subject: String(fd.get("subject") ?? ""),
      message: String(fd.get("message") ?? ""),
    };
    start(async () => {
      const r = await submitEnquiry(input);
      if (r.ok) setSent(true);
      else setError(r.error ?? "Something went wrong — please try again.");
    });
  };

  // Navbar, footer and smooth scroll come from PublicChrome (root layout);
  // wrapping them again here double-mounted Lenis and broke scrolling.
  return (
    <div className="min-h-screen bg-[#F6F2EA] selection:bg-[#B08A3E] selection:text-[#F6F2EA] pt-[110px]">
        
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
                <a href="mailto:info@bombaybicyclechef.com" className="text-[#2B221D] font-medium hover:text-[#B08A3E] transition-colors">
                  info@bombaybicyclechef.com
                </a>
              </div>

              <div>
                <h4 className="text-[#B08A3E] text-[12px] tracking-[0.2em] uppercase font-semibold font-sans mb-3">
                  Private Events & Catering
                </h4>
                <p>Host your next event with us. From corporate lunches to large celebrations.</p>
                <a href="mailto:info@bombaybicyclechef.com" className="text-[#2B221D] font-medium hover:text-[#B08A3E] transition-colors">
                  info@bombaybicyclechef.com
                </a>
              </div>

              <div>
                <h4 className="text-[#B08A3E] text-[12px] tracking-[0.2em] uppercase font-semibold font-sans mb-3">
                  Careers
                </h4>
                <p>Join our team of passionate chefs and hospitality professionals.</p>
                <a href="mailto:info@bombaybicyclechef.com" className="text-[#2B221D] font-medium hover:text-[#B08A3E] transition-colors">
                  info@bombaybicyclechef.com
                </a>
              </div>
            </div>
          </div>

          {/* Right Side: Form */}
          <div className="flex flex-col justify-center">
            <form className="flex flex-col space-y-12 w-full max-w-[500px]" onSubmit={onSubmit}>
              
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
                    name={field.id}
                    type={field.type}
                    required={field.id !== "subject"}
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
                  name="message"
                  required
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
                {sent ? (
                  <p className="font-sans text-[15px] text-[#2B221D]">
                    Thank you — your message has been sent. We&apos;ll be in touch shortly.
                  </p>
                ) : (
                  <>
                    <button
                      type="submit"
                      disabled={pending}
                      className="w-full lg:w-auto inline-flex items-center justify-center h-[56px] px-16 bg-[#2B221D] text-[#F6F2EA] text-[13px] tracking-[0.15em] font-medium uppercase font-sans hover:bg-[#B08A3E] transition-colors duration-500 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {pending ? "Sending…" : "Send Message"}
                    </button>
                    {error && <p className="mt-4 font-sans text-[14px] text-[#5D0925]">{error}</p>}
                  </>
                )}
              </div>

            </form>
          </div>

        </div>

    </div>
  );
}
