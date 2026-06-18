"use client";

import { motion } from "framer-motion";
import Link from "next/link";

export function ReservationCTA() {
  return (
    <section className="relative bg-[#5D0925] w-full py-24 lg:py-[120px] px-6 overflow-hidden">
      {/* Subtle floating texture */}
      <motion.div 
        className="absolute inset-0 opacity-[0.03]"
        animate={{ 
          backgroundPosition: ['0px 0px', '120px 120px'],
        }}
        transition={{ 
          repeat: Infinity, 
          duration: 30, 
          ease: "linear" 
        }}
        style={{
          backgroundImage: `radial-gradient(circle at 20% 50%, #F5F0E6 1px, transparent 1px), radial-gradient(circle at 80% 20%, #F5F0E6 1px, transparent 1px), radial-gradient(circle at 60% 80%, #F5F0E6 1px, transparent 1px)`,
          backgroundSize: '120px 120px, 80px 80px, 160px 160px'
        }}
      />

      <div className="relative z-10 max-w-[900px] mx-auto text-center flex flex-col items-center">
        <span className="text-[#A88442] text-[13px] tracking-[0.2em] font-semibold uppercase mb-6 font-sans block">
          Chapter VII : The Next Chapter
        </span>
        <h2 className="text-[32px] sm:text-[36px] md:text-[48px] lg:text-[56px] font-serif text-[#F5F0E6] leading-[1.15] mb-5">
          Reserve Your Table
        </h2>

        <p className="text-[18px] md:text-xl text-[#EFE6D8]/70 max-w-[700px] mx-auto leading-[1.9] mb-10 font-sans">
          Whether it’s a quick lunch in Balham or a celebration feast in Battersea, our tables are ready.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <Link
            href="/reservations"
            className="inline-flex items-center justify-center h-[56px] px-10 border border-[#A88442] text-[#F5F0E6] text-[14px] tracking-[0.15em] font-medium uppercase font-sans hover:bg-[#A88442] hover:text-[#2B241D] transition-colors duration-500"
          >
            Find a Table
          </Link>
          <Link
            href="/order"
            className="inline-flex items-center justify-center h-[56px] px-10 bg-[#5D0925] border border-[#5D0925] text-[#F5F0E6] text-[14px] tracking-[0.15em] font-medium uppercase font-sans hover:bg-[#420616] hover:border-[#420616] transition-colors duration-500"
          >
            Order Online
          </Link>
        </div>
      </div>
    </section>
  );
}
