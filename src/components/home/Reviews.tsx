"use client";

import { motion, Variants, useReducedMotion } from "framer-motion";

const TESTIMONIALS = [
  {
    quote: "The lamb chops alone are worth crossing London for.",
    author: "James L.",
    location: "Battersea"
  },
  {
    quote: "Service like silk. Food like home.",
    author: "Priya M.",
    location: "Balham"
  },
  {
    quote: "We come every birthday. It wouldn\u0027t feel right anywhere else.",
    author: "Sarah & David K.",
    location: "Kilburn"
  }
];

const fade: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 1.5, ease: "easeOut" } }
};

export function Reviews() {
  const reduceMotion = useReducedMotion();
  return (
    <section className="bg-[#2B241D] w-full pt-20 pb-20 lg:pt-[90px] lg:pb-[90px] px-6">
      <div className="max-w-[1200px] mx-auto">

        {/* Heading */}
        <div className="text-center max-w-[900px] mx-auto mb-12 lg:mb-16">
          <span className="text-[#806515] text-[13px] tracking-[0.2em] font-semibold uppercase mb-4 block font-sans">
            Guest Stories
          </span>
          <h2 className="text-[36px] md:text-[48px] lg:text-[56px] font-serif text-[#F5F0E6] leading-[1.15] mb-4">
            Loved In London
          </h2>
          <p className="text-[18px] md:text-xl text-[#EFE6D8]/70 max-w-[700px] mx-auto leading-[1.9] font-sans">
            Thousands of meals. Thousands of memories.
          </p>
        </div>

        {/* Testimonials */}
        <motion.div
          initial={reduceMotion ? "show" : "hidden"}
          whileInView="show"
          viewport={{ once: true, margin: "-10%" }}
          variants={{
            hidden: { opacity: 0 },
            show: { opacity: 1, transition: { staggerChildren: reduceMotion ? 0 : 0.2 } }
          }}
          className="grid grid-cols-1 md:grid-cols-3 gap-16 lg:gap-24"
        >
          {TESTIMONIALS.map((t, i) => (
            <motion.div key={i} variants={fade} className="flex flex-col items-center text-center">
              {/* Large decorative quote mark */}
              <span className="text-[#806515]/40 text-[80px] leading-none font-serif select-none mb-4">&ldquo;</span>
              <p className="text-2xl md:text-3xl font-serif text-[#F5F0E6] leading-snug mb-8">
                {t.quote}
              </p>
              <div className="w-12 h-[1px] bg-[#806515]/40 mb-6" />
              <p className="text-[#EFE6D8]/60 text-sm tracking-[0.1em] uppercase">
                {t.author}
              </p>
              <p className="text-[#806515]/60 text-xs tracking-[0.15em] uppercase mt-1">
                {t.location}
              </p>
            </motion.div>
          ))}
        </motion.div>

      </div>
    </section>
  );
}
