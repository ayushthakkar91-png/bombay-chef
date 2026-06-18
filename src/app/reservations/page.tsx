"use client";

import { Navbar } from "@/components/Navbar";
import { SmoothScroll } from "@/components/motion/SmoothScroll";
import { ReservationFlow } from "@/components/reservations/flow/ReservationFlow";

export default function ReservationsPage() {
  return (
    <SmoothScroll>
      <Navbar />
      <main className="min-h-screen bg-[#F6F2EA] selection:bg-[#B08A3E] selection:text-[#F6F2EA]">
        <ReservationFlow />
      </main>
    </SmoothScroll>
  );
}
