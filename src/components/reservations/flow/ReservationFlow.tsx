"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence, Variants, useReducedMotion } from "framer-motion";
import { BookingState, BookingStep } from "./types";
import { BookingProgress } from "./BookingProgress";
import { StepLocation } from "./StepLocation";

// Only step 1 (StepLocation) is needed for first paint; the rest are code-split
// and fetched when the guest advances, cutting initial JS on this heavy flow
// (large mobile Real-Experience-Score win — the page loaded every step upfront).
const StepDateTime = dynamic(() => import("./StepDateTime").then((m) => ({ default: m.StepDateTime })));
const StepGuests = dynamic(() => import("./StepGuests").then((m) => ({ default: m.StepGuests })));
const StepDetails = dynamic(() => import("./StepDetails").then((m) => ({ default: m.StepDetails })));
const StepConfirm = dynamic(() => import("./StepConfirm").then((m) => ({ default: m.StepConfirm })));

const LAST_STEP: BookingStep = 5;

export function ReservationFlow({ isLoggedIn = false }: { isLoggedIn?: boolean }) {
  const reduceMotion = useReducedMotion();

  const [state, setState] = useState<BookingState>({
    step: 1,
    mode: "reservation",
    location: null,
    // Dinner is the only bookable experience (Balham's booking hours are
    // evening-only), so it's pre-selected and there's no Experience step.
    experience: "dinner",
    date: null,
    time: null,
    guests: null,
    details: { name: "", email: "", phone: "", occasion: null, requests: "" }
  });

  const nextStep = () => {
    setState((prev) => ({ ...prev, step: Math.min(prev.step + 1, LAST_STEP) as BookingStep }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const prevStep = () => {
    setState((prev) => ({ ...prev, step: Math.max(prev.step - 1, 1) as BookingStep }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const updateState = (updates: Partial<BookingState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  };

  const jumpToStep = (targetStep: BookingStep) => {
    // Only allow jumping back, not forward past completed steps
    if (targetStep < state.step) {
      setState((prev) => ({ ...prev, step: targetStep }));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Framer Motion variants for smooth slide transitions
  const variants: Variants = {
    initial: { opacity: reduceMotion ? 1 : 0, y: reduceMotion ? 0 : 30 },
    enter: { opacity: 1, y: 0, transition: { duration: reduceMotion ? 0 : 0.8, ease: "easeOut" } },
    exit: { opacity: reduceMotion ? 1 : 0, y: reduceMotion ? 0 : -30, transition: { duration: reduceMotion ? 0 : 0.5, ease: "easeOut" } }
  };

  return (
    <div className="min-h-screen bg-[#F6F2EA] flex flex-col relative pt-[84px] lg:pt-[88px]">

      {/* Fixed Progress Indicator */}
      <BookingProgress currentStep={state.step} onStepClick={jumpToStep} />

      <div className="flex-1 w-full max-w-[1200px] mx-auto px-6 py-12 lg:py-20 relative">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={state.step}
            variants={variants}
            initial="initial"
            animate="enter"
            exit="exit"
            className="w-full"
          >
            {state.step === 1 && (
              <StepLocation state={state} updateState={updateState} nextStep={nextStep} />
            )}
            {state.step === 2 && (
              <StepDateTime state={state} updateState={updateState} nextStep={nextStep} prevStep={prevStep} />
            )}
            {state.step === 3 && (
              <StepGuests state={state} updateState={updateState} nextStep={nextStep} prevStep={prevStep} />
            )}
            {state.step === 4 && (
              <StepDetails state={state} updateState={updateState} nextStep={nextStep} prevStep={prevStep} />
            )}
            {state.step === 5 && (
              <StepConfirm state={state} prevStep={prevStep} isLoggedIn={isLoggedIn} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

    </div>
  );
}
