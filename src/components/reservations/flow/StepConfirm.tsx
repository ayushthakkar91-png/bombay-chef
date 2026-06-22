"use client";

import Link from "next/link";
import { BookingState } from "./types";

interface Props {
  state: BookingState;
  prevStep: () => void;
}

export function StepConfirm({ state, prevStep }: Props) {
  const { location, experience, date, time, guests, details } = state;

  return (
    <div className="w-full flex flex-col pt-8 max-w-[800px] mx-auto bg-[#2A211C] p-8 lg:p-16 relative overflow-hidden text-center">

      {/* Film grain texture */}
      <div
        className="absolute inset-0 opacity-[0.05] pointer-events-none mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundSize: '200px 200px',
        }}
      />

      <div className="relative z-10 flex flex-col items-center w-full">
        <span className="text-[#B08A3E] text-[13px] tracking-[0.2em] font-semibold uppercase mb-6 block font-sans">
          Review Booking
        </span>
        <h2 className="text-[36px] md:text-[56px] lg:text-[64px] font-serif text-[#F6F2EA] leading-[1.1] mb-12 font-light tracking-wide">
          Your Table Awaits
        </h2>

        <div className="w-full grid grid-cols-2 md:grid-cols-4 gap-y-12 gap-x-6 text-left border-y border-[#F6F2EA]/10 py-12 mb-16">

          <div className="flex flex-col">
            <h4 className="text-[#B08A3E] text-[10px] tracking-[0.2em] uppercase font-semibold font-sans mb-3">Location</h4>
            <p className="text-[#F6F2EA] font-serif text-[24px] capitalize">{location || "N/A"}</p>
          </div>

          <div className="flex flex-col">
            <h4 className="text-[#B08A3E] text-[10px] tracking-[0.2em] uppercase font-semibold font-sans mb-3">Date & Time</h4>
            <p className="text-[#F6F2EA] font-serif text-[24px]">
              {date ? date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : "N/A"}
              <br />
              <span className="text-[18px] text-[#F6F2EA]/70 mt-1 block">{time || "N/A"}</span>
            </p>
          </div>

          <div className="flex flex-col">
            <h4 className="text-[#B08A3E] text-[10px] tracking-[0.2em] uppercase font-semibold font-sans mb-3">Guests</h4>
            <p className="text-[#F6F2EA] font-serif text-[24px]">{guests || "N/A"}</p>
          </div>

          <div className="flex flex-col">
            <h4 className="text-[#B08A3E] text-[10px] tracking-[0.2em] uppercase font-semibold font-sans mb-3">Experience</h4>
            <p className="text-[#F6F2EA] font-serif text-[24px] capitalize">{experience || "N/A"}</p>
          </div>

          <div className="col-span-2 md:col-span-4 mt-4">
            <h4 className="text-[#B08A3E] text-[10px] tracking-[0.2em] uppercase font-semibold font-sans mb-3">Guest Details</h4>
            <p className="text-[#F6F2EA]/70 font-sans text-[14px]">
              {details.name} &bull; {details.email} {details.phone ? `• ${details.phone}` : ''}
            </p>
          </div>

        </div>

        <div className="flex flex-col sm:flex-row items-center gap-6 w-full justify-center">
          <button
            onClick={() => alert("Reservation Confirmed! (Demo)")}
            className="w-full sm:w-auto inline-flex items-center justify-center h-[56px] px-12 bg-[#B08A3E] text-[#2A211C] text-[13px] tracking-[0.15em] font-medium uppercase font-sans hover:bg-[#F6F2EA] transition-colors duration-500"
          >
            Confirm Reservation
          </button>

          <button
            onClick={prevStep}
            className="text-[#F6F2EA]/50 text-[12px] uppercase tracking-[0.15em] font-medium hover:text-[#B08A3E] transition-colors w-full sm:w-auto mt-4 sm:mt-0"
          >
            Edit Details
          </button>
        </div>

      </div>
    </div>
  );
}
