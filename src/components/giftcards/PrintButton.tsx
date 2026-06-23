"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="print:hidden inline-flex items-center justify-center gap-2 h-[48px] px-7 bg-[#2B221D] text-[#F6F2EA] text-[12px] tracking-[0.15em] uppercase font-sans hover:bg-[#B08A3E] transition-colors"
    >
      <Printer className="h-4 w-4" /> Print / Save as PDF
    </button>
  );
}
