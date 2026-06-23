"use client";

import { useState } from "react";
import { motion, AnimatePresence, Variants, useReducedMotion } from "framer-motion";
import { BookingState, BookingStep } from "./types";
import { BookingProgress } from "./BookingProgress";
import { StepLocation } from "./StepLocation";
import { StepExperience } from "./StepExperience";
import { StepDateTime } from "./StepDateTime";
import { StepGuests } from "./StepGuests";
import { StepDetails } from "./StepDetails";
import { StepConfirm } from "./StepConfirm";

export function ReservationFlow() {
  const reduceMotion = useReducedMotion();

  const [state, setState] = useState<BookingState>({
    step: 1,
    mode: "reservation",
    location: null,
    experience: null,
    date: null,
    time: null,
    guests: null,
    details: { name: "", email: "", phone: "", occasion: null, requests: "" }
  });

  const nextStep = () => {
    setState((prev) => ({ ...prev, step: Math.min(prev.step + 1, 6) as BookingStep }));
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
              <StepExperience state={state} updateState={updateState} nextStep={nextStep} prevStep={prevStep} />
            )}
            {state.step === 3 && (
              <StepDateTime state={state} updateState={updateState} nextStep={nextStep} prevStep={prevStep} />
            )}
            {state.step === 4 && (
              <StepGuests state={state} updateState={updateState} nextStep={nextStep} prevStep={prevStep} />
            )}
            {state.step === 5 && (
              <StepDetails state={state} updateState={updateState} nextStep={nextStep} prevStep={prevStep} />
            )}
            {state.step === 6 && (
              <StepConfirm state={state} prevStep={prevStep} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

    </div>
  );
}
