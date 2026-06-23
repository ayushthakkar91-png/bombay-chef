"use client";

import { useEffect, useState } from "react";
import { BookingState, toDateISO } from "./types";
import { motion, AnimatePresence } from "framer-motion";
import { BOOKING_HORIZON_DAYS } from "@/lib/reservations/constants";

interface Props {
  state: BookingState;
  updateState: (updates: Partial<BookingState>) => void;
  nextStep: () => void;
  prevStep: () => void;
}

export function StepDateTime({ state, updateState, nextStep, prevStep }: Props) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Availability is keyed by a signature of (location, date, experience). Loading
  // and the visible times are DERIVED from whether the cached signature matches
  // the current one — so the effect only setState()s in its async callback.
  const sig = state.date && state.location ? `${state.location}|${toDateISO(state.date)}|${state.experience ?? ""}` : "";
  const [avail, setAvail] = useState<{ sig: string; times: string[] }>({ sig: "", times: [] });
  const loadingTimes = sig !== "" && avail.sig !== sig;
  const times = avail.sig === sig ? avail.times : [];

  // Calendar Logic
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sunday

  // Adjust so Monday is first (1 = Mon, 0 = Sun -> 6)
  const startingDayOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const horizon = new Date(today);
  horizon.setDate(horizon.getDate() + BOOKING_HORIZON_DAYS);

  const handlePrevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));

  const dayIsDisabled = (day: number) => {
    const d = new Date(year, month, day);
    return d < today || d > horizon;
  };

  const handleDateSelect = (day: number) => {
    if (dayIsDisabled(day)) return;
    updateState({ date: new Date(year, month, day), time: null, mode: "reservation" });
  };

  const handleTimeSelect = (time: string) => {
    updateState({ time, mode: "reservation" });
    setTimeout(() => {
      nextStep();
    }, 400);
  };

  const handleJoinWaitlist = () => {
    updateState({ mode: "waitlist", time: null });
    nextStep();
  };

  // Fetch real availability whenever the date / location / experience changes.
  useEffect(() => {
    if (!state.date || !state.location) return;
    const controller = new AbortController();
    const params = new URLSearchParams({ location: state.location, date: toDateISO(state.date) });
    if (state.experience) params.set("experience", state.experience);
    fetch(`/api/reservations/availability?${params.toString()}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((d: { times?: string[] }) => setAvail({ sig, times: d.times ?? [] }))
      .catch((e: Error) => {
        if (e.name !== "AbortError") setAvail({ sig, times: [] });
      });
    return () => controller.abort();
  }, [state.date, state.location, state.experience, sig]);

  const isSelectedDate = (day: number) => {
    if (!state.date) return false;
    return (
      state.date.getDate() === day &&
      state.date.getMonth() === month &&
      state.date.getFullYear() === year
    );
  };

  const isToday = (day: number) => {
    const t = new Date();
    return (
      t.getDate() === day &&
      t.getMonth() === month &&
      t.getFullYear() === year
    );
  };

  return (
    <div className="w-full flex flex-col pt-8 max-w-[800px] mx-auto">

      <div className="text-center mb-12">
        <h2 className="text-[36px] md:text-[48px] lg:text-[56px] font-serif text-[#2B221D] leading-[1.1] mb-6 font-light tracking-wide">
          Date & Time
        </h2>
        <p className="text-[#5A524B] text-[16px] font-sans">
          When shall we expect you?
        </p>
      </div>

      <div className="bg-white/50 border border-[#2A211C]/10 p-6 lg:p-10 shadow-sm">

        {/* Calendar Header */}
        <div className="flex items-center justify-between mb-8">
          <button onClick={handlePrevMonth} className="text-[#2A211C] hover:text-[#B08A3E] transition-colors p-2">
            &larr;
          </button>
          <h3 className="text-[24px] font-serif text-[#2B221D] tracking-wide">
            {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </h3>
          <button onClick={handleNextMonth} className="text-[#2A211C] hover:text-[#B08A3E] transition-colors p-2">
            &rarr;
          </button>
        </div>

        {/* Days Header */}
        <div className="grid grid-cols-7 mb-4">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
            <div key={day} className="text-center text-[#B08A3E] text-[10px] tracking-[0.2em] uppercase font-semibold pb-2 border-b border-[#2A211C]/10">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-y-2 mb-8">
          {Array.from({ length: startingDayOffset }).map((_, i) => (
            <div key={`empty-${i}`} className="h-[48px]" />
          ))}

          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const selected = isSelectedDate(day);
            const current = isToday(day);
            const disabled = dayIsDisabled(day);

            return (
              <div key={day} className="flex items-center justify-center h-[48px]">
                <button
                  onClick={() => handleDateSelect(day)}
                  disabled={disabled}
                  className={`w-[40px] h-[40px] flex items-center justify-center rounded-full text-[15px] font-serif transition-all duration-300
                    ${disabled ? "text-[#2A211C]/20 cursor-not-allowed" :
                      selected ? "bg-[#B08A3E] text-[#F6F2EA] shadow-[0_4px_12px_rgba(176,138,62,0.4)] scale-110" :
                      current ? "text-[#B08A3E] border border-[#B08A3E]/30" :
                      "text-[#2B221D] hover:bg-[#2A211C]/5"}`}
                >
                  {day}
                </button>
              </div>
            );
          })}
        </div>

        {/* Time Selection */}
        <AnimatePresence>
          {state.date && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="border-t border-[#2A211C]/10 pt-8"
            >
              <h4 className="text-center text-[#2B221D] text-[18px] font-serif mb-6">
                Available Times for {state.date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
              </h4>

              {loadingTimes ? (
                <p className="text-center text-[#5A524B] text-[14px] font-sans py-6 animate-pulse">
                  Checking availability…
                </p>
              ) : times.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {times.map((time) => (
                    <button
                      key={time}
                      onClick={() => handleTimeSelect(time)}
                      className={`h-[44px] text-[13px] font-sans transition-all duration-300 border
                        ${state.time === time
                          ? "bg-[#2A211C] border-[#2A211C] text-[#F6F2EA]"
                          : "border-[#2A211C]/20 text-[#2B221D] hover:border-[#B08A3E] hover:text-[#B08A3E]"}`}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-[#5A524B] text-[15px] font-sans mb-6">
                    This date is fully booked. We&apos;d love to welcome you another way.
                  </p>
                  <button
                    onClick={handleJoinWaitlist}
                    className="inline-flex items-center justify-center h-[48px] px-8 bg-[#B08A3E] text-[#2A211C] text-[12px] tracking-[0.15em] font-medium uppercase font-sans hover:bg-[#2A211C] hover:text-[#F6F2EA] transition-colors duration-500"
                  >
                    Join the Waitlist
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      <div className="mt-12 flex justify-center">
        <button
          onClick={prevStep}
          className="text-[#2B221D] text-[12px] uppercase tracking-[0.15em] font-medium hover:text-[#B08A3E] transition-colors"
        >
          &larr; Back to Experience
        </button>
      </div>

    </div>
  );
}
