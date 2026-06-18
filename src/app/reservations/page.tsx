"use client";

import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { SmoothScroll } from "@/components/motion/SmoothScroll";
import { ReservationHero } from "@/components/reservations/ReservationHero";
import { ChooseLocation } from "@/components/reservations/ChooseLocation";
import { SelectExperience } from "@/components/reservations/SelectExperience";
import { BookingForm } from "@/components/reservations/BookingForm";
import { PrivateDiningCTA } from "@/components/reservations/PrivateDiningCTA";
import { WhatToExpect } from "@/components/reservations/WhatToExpect";
import { FinalReservationCTA } from "@/components/reservations/FinalReservationCTA";

export default function ReservationsPage() {
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [selectedExperience, setSelectedExperience] = useState<string | null>(null);

  const handleLocationSelect = (locId: string) => {
    setSelectedLocation(locId);
    // Smooth scroll to experiences
    const expSection = document.getElementById("select-experience");
    if (expSection) {
      window.scrollTo({
        top: expSection.offsetTop - 110,
        behavior: "smooth"
      });
    }
  };

  const handleExperienceSelect = (expId: string) => {
    setSelectedExperience(expId);
    // Smooth scroll to form
    const formSection = document.getElementById("booking-form");
    if (formSection) {
      window.scrollTo({
        top: formSection.offsetTop - 110,
        behavior: "smooth"
      });
    }
  };

  return (
    <SmoothScroll>
      <Navbar />
      <main className="min-h-screen bg-[#F6F2EA] selection:bg-[#B08A3E] selection:text-[#F6F2EA]">
        <ReservationHero />
        
        <div id="choose-location">
          <ChooseLocation 
            selectedLocation={selectedLocation} 
            onSelect={handleLocationSelect} 
          />
        </div>

        <div id="select-experience">
          <SelectExperience 
            selectedExperience={selectedExperience} 
            onSelect={handleExperienceSelect} 
          />
        </div>

        <BookingForm />
        <PrivateDiningCTA />
        <WhatToExpect />
        <FinalReservationCTA />
      </main>
    </SmoothScroll>
  );
}
