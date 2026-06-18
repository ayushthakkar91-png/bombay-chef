"use client";

import { motion } from "framer-motion";

const NARRATIVE = [
  {
    title: "The Fire",
    text: "Freshly prepared over charcoal and flame. Every dish begins with patience, heat, and craftsmanship. In our kitchens, the tandoor never truly sleeps. It breathes with the rhythm of service, baking breads that blister perfectly and charring meats that have steeped in dark spices overnight."
  },
  {
    title: "The Welcome",
    text: "Hospitality inspired by old Bombay. Warm, genuine, and always personal. From the moment the door opens, you are not merely a customer; you are a guest in our home. We pour the chai hot, we serve the food family-style, and we make sure your glass is never empty."
  }
];

export function Experience() {
  return (
    <section className="w-full relative bg-[#F5F0E6] overflow-hidden pt-20 pb-20 lg:pt-[120px] lg:pb-[120px] px-6">
      
      {/* Drifting Atmosphere */}
      <motion.div 
        animate={{ 
          backgroundPosition: ["0% 0%", "100% 100%", "0% 0%"],
        }}
        transition={{ 
          duration: 40, 
          ease: "linear", 
          repeat: Infinity 
        }}
        className="absolute inset-0 z-0 opacity-40 pointer-events-none"
        style={{
          background: "radial-gradient(circle at center, rgba(168,132,66,0.08) 0%, transparent 60%)",
          backgroundSize: "200% 200%"
        }}
      />

      <div className="max-w-[1200px] mx-auto flex flex-col lg:flex-row gap-16 lg:gap-24 relative z-10">
        
        {/* Left: Chapter Intro */}
        <div className="w-full lg:w-[40%] flex flex-col">
          <span className="text-[#5D0925] text-[13px] tracking-[0.2em] font-semibold uppercase mb-6 block font-sans">
            Chapter V : The Dining Experience
          </span>
          <h2 className="text-[32px] sm:text-[40px] md:text-[56px] lg:text-[72px] font-serif text-[#2B241D] leading-[1.1] mb-6">
            More Than<br />A Meal
          </h2>
          <div className="w-24 h-[1px] bg-[#A88442] origin-left mb-8" />
        </div>

        {/* Right: Narrative Text */}
        <div className="w-full lg:w-[60%] flex flex-col space-y-16 lg:pt-8">
          {NARRATIVE.map((item, index) => (
            <div key={index} className="flex flex-col">
              <h3 className="text-2xl md:text-3xl font-serif text-[#2B241D] mb-4">
                {item.title}
              </h3>
              <p className="text-[18px] md:text-xl text-[#5E564D] leading-[1.9] font-sans max-w-xl">
                {item.text}
              </p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
