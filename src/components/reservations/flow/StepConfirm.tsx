"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { BookingState, toDateISO } from "./types";
import { submitReservation, joinWaitlist, type BookingInput } from "@/app/reservations/actions";
import { EXPERIENCES, OCCASIONS } from "@/lib/reservations/constants";

interface Props {
  state: BookingState;
  prevStep: () => void;
}

type Outcome =
  | { kind: "confirmed"; reference: string; token: string }
  | { kind: "waitlisted" };

const GOLD = "text-[#B08A3E]";

/** Dark, film-grained panel shared by the review + success states. */
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full flex flex-col pt-8 max-w-[800px] mx-auto bg-[#2A211C] p-8 lg:p-16 relative overflow-hidden text-center">
      <div
        className="absolute inset-0 opacity-[0.05] pointer-events-none mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundSize: "200px 200px",
        }}
      />
      <div className="relative z-10 flex flex-col items-center w-full">{children}</div>
    </div>
  );
}

export function StepConfirm({ state, prevStep }: Props) {
  const { location, experience, date, time, guests, details, mode } = state;
  const [pending, startTransition] = useTransition();
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [offerWaitlist, setOfferWaitlist] = useState(mode === "waitlist");

  const experienceLabel = EXPERIENCES.find((e) => e.id === experience)?.label;
  const occasionLabel = OCCASIONS.find((o) => o.id === details.occasion)?.label;

  const input: BookingInput = {
    locationSlug: location ?? "",
    experience,
    dateISO: date ? toDateISO(date) : "",
    time,
    guests: guests ?? 0,
    name: details.name,
    email: details.email,
    phone: details.phone,
    occasion: details.occasion,
    requests: details.requests,
  };

  const submit = () => {
    setError(null);
    startTransition(async () => {
      if (offerWaitlist) {
        const r = await joinWaitlist(input);
        if (r.ok) setOutcome({ kind: "waitlisted" });
        else setError(r.error ?? "Something went wrong.");
        return;
      }
      const r = await submitReservation(input);
      if (r.ok) {
        setOutcome({ kind: "confirmed", reference: r.reference, token: r.manageToken });
      } else if (r.full) {
        setOfferWaitlist(true);
        setError("That time was just taken. Join the waitlist and we'll be in touch the moment a table opens.");
      } else {
        setError(r.error);
      }
    });
  };

  /* ---- Success states ---- */
  if (outcome?.kind === "confirmed") {
    return (
      <Frame>
        <span className={`${GOLD} text-[13px] tracking-[0.2em] font-semibold uppercase mb-6 block font-sans`}>Confirmed</span>
        <h2 className="text-[36px] md:text-[56px] lg:text-[64px] font-serif text-[#F6F2EA] leading-[1.1] mb-8 font-light tracking-wide">
          We&apos;ll See You Soon
        </h2>
        <p className="text-[#F6F2EA]/70 font-sans text-[15px] max-w-[460px] mb-2">
          A confirmation is on its way to <span className="text-[#F6F2EA]">{details.email}</span>.
        </p>
        <p className="text-[#F6F2EA]/70 font-sans text-[14px] mb-10">
          Your reference is <span className={`${GOLD} font-semibold tracking-wide`}>{outcome.reference}</span>
        </p>
        <Link
          href={`/reservations/manage/${outcome.token}`}
          className="inline-flex items-center justify-center h-[56px] px-12 bg-[#B08A3E] text-[#2A211C] text-[13px] tracking-[0.15em] font-medium uppercase font-sans hover:bg-[#F6F2EA] transition-colors duration-500"
        >
          View or Change Booking
        </Link>
      </Frame>
    );
  }

  if (outcome?.kind === "waitlisted") {
    return (
      <Frame>
        <span className={`${GOLD} text-[13px] tracking-[0.2em] font-semibold uppercase mb-6 block font-sans`}>On the Waitlist</span>
        <h2 className="text-[36px] md:text-[56px] lg:text-[64px] font-serif text-[#F6F2EA] leading-[1.1] mb-8 font-light tracking-wide">
          You&apos;re on the List
        </h2>
        <p className="text-[#F6F2EA]/70 font-sans text-[15px] max-w-[460px]">
          Thank you, {details.name.split(" ")[0]}. We&apos;ll email <span className="text-[#F6F2EA]">{details.email}</span> the
          moment a table opens for your date.
        </p>
      </Frame>
    );
  }

  /* ---- Review + submit ---- */
  return (
    <Frame>
      <span className={`${GOLD} text-[13px] tracking-[0.2em] font-semibold uppercase mb-6 block font-sans`}>
        {offerWaitlist ? "Join the Waitlist" : "Review Booking"}
      </span>
      <h2 className="text-[36px] md:text-[56px] lg:text-[64px] font-serif text-[#F6F2EA] leading-[1.1] mb-12 font-light tracking-wide">
        {offerWaitlist ? "Almost There" : "Your Table Awaits"}
      </h2>

      <div className="w-full grid grid-cols-2 md:grid-cols-4 gap-y-12 gap-x-6 text-left border-y border-[#F6F2EA]/10 py-12 mb-10">
        <div className="flex flex-col">
          <h4 className={`${GOLD} text-[10px] tracking-[0.2em] uppercase font-semibold font-sans mb-3`}>Location</h4>
          <p className="text-[#F6F2EA] font-serif text-[24px] capitalize">{location || "N/A"}</p>
        </div>
        <div className="flex flex-col">
          <h4 className={`${GOLD} text-[10px] tracking-[0.2em] uppercase font-semibold font-sans mb-3`}>Date &amp; Time</h4>
          <p className="text-[#F6F2EA] font-serif text-[24px]">
            {date ? date.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "N/A"}
            <br />
            <span className="text-[18px] text-[#F6F2EA]/70 mt-1 block">{offerWaitlist ? "Any time" : time || "N/A"}</span>
          </p>
        </div>
        <div className="flex flex-col">
          <h4 className={`${GOLD} text-[10px] tracking-[0.2em] uppercase font-semibold font-sans mb-3`}>Guests</h4>
          <p className="text-[#F6F2EA] font-serif text-[24px]">{guests || "N/A"}</p>
        </div>
        <div className="flex flex-col">
          <h4 className={`${GOLD} text-[10px] tracking-[0.2em] uppercase font-semibold font-sans mb-3`}>Experience</h4>
          <p className="text-[#F6F2EA] font-serif text-[24px]">{experienceLabel || "N/A"}</p>
        </div>
        <div className="col-span-2 md:col-span-4 mt-4">
          <h4 className={`${GOLD} text-[10px] tracking-[0.2em] uppercase font-semibold font-sans mb-3`}>Guest Details</h4>
          <p className="text-[#F6F2EA]/70 font-sans text-[14px]">
            {details.name} &bull; {details.email}
            {details.phone ? ` • ${details.phone}` : ""}
            {occasionLabel ? ` • ${occasionLabel}` : ""}
          </p>
        </div>
      </div>

      {error && (
        <p role="alert" className="text-[#E8B4A0] font-sans text-[14px] mb-6 max-w-[480px]">
          {error}
        </p>
      )}

      <div className="flex flex-col sm:flex-row items-center gap-6 w-full justify-center">
        <button
          onClick={submit}
          disabled={pending}
          className="w-full sm:w-auto inline-flex items-center justify-center h-[56px] px-12 bg-[#B08A3E] text-[#2A211C] text-[13px] tracking-[0.15em] font-medium uppercase font-sans hover:bg-[#F6F2EA] transition-colors duration-500 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {pending ? "Please wait…" : offerWaitlist ? "Join the Waitlist" : "Confirm Reservation"}
        </button>
        <button
          onClick={prevStep}
          disabled={pending}
          className="text-[#F6F2EA]/50 text-[12px] uppercase tracking-[0.15em] font-medium hover:text-[#B08A3E] transition-colors w-full sm:w-auto mt-4 sm:mt-0 disabled:opacity-40"
        >
          Edit Details
        </button>
      </div>
    </Frame>
  );
}
