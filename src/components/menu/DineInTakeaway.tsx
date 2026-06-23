"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { ORDER_URL } from "@/lib/flags";

export function DineInTakeaway() {
  return (
    <section className="w-full h-[80vh] lg:h-screen flex flex-col md:flex-row overflow-hidden bg-[#1A1411]">
      
      {/* Left: DINE IN */}
      <div className="relative w-full h-1/2 md:w-1/2 md:h-full flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-[#F3EEE8]/10 group">
        <div className="absolute inset-0 w-full h-full">
          <Image
            src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=2000&auto=format&fit=crop"
            alt="Dine In"
            fill
            className="object-cover opacity-30 group-hover:opacity-40 transition-opacity duration-1000"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1A1411] via-[#1A1411]/80 to-[#1A1411]/40" />
        </div>

        <div className="relative z-10 text-center px-6">
          <span className="text-[#C8A96B] text-[10px] sm:text-[11px] tracking-[0.3em] uppercase font-sans mb-4 block">
            Dine In
          </span>
          <h2 className="text-[32px] md:text-[44px] lg:text-[56px] font-serif text-[#F3EEE8] mb-8 leading-tight">
            The Restaurant<br />Experience
          </h2>
          <Link 
            href="/reservations" 
            className="inline-flex items-center justify-center h-[40px] px-8 border border-[#C8A96B]/30 text-[#C8A96B] text-[10px] tracking-[0.2em] uppercase font-sans hover:border-[#C8A96B] hover:text-[#F3EEE8] transition-all duration-300"
          >
            Reserve A Table
          </Link>
        </div>
      </div>

      {/* Right: TAKEAWAY */}
      <div className="relative w-full h-1/2 md:w-1/2 md:h-full flex flex-col items-center justify-center group">
        <div className="absolute inset-0 w-full h-full">
          <Image
            src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=2000&auto=format&fit=crop"
            alt="Takeaway"
            fill
            className="object-cover opacity-30 group-hover:opacity-40 transition-opacity duration-1000"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1A1411] via-[#1A1411]/80 to-[#1A1411]/40" />
        </div>

        <div className="relative z-10 text-center px-6">
          <span className="text-[#C8A96B] text-[10px] sm:text-[11px] tracking-[0.3em] uppercase font-sans mb-4 block">
            Takeaway &amp; Delivery
          </span>
          <h2 className="text-[32px] md:text-[44px] lg:text-[56px] font-serif text-[#F3EEE8] mb-8 leading-tight">
            Bombay At<br />Home
          </h2>
          <Link
            href={ORDER_URL}
            className="inline-flex items-center justify-center h-[40px] px-8 border border-[#C8A96B]/30 text-[#C8A96B] text-[10px] tracking-[0.2em] uppercase font-sans hover:border-[#C8A96B] hover:text-[#F3EEE8] transition-all duration-300"
          >
            Order Online
          </Link>
        </div>
      </div>

    </section>
  );
}
