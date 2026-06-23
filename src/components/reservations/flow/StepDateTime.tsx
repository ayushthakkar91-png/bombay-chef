"use client";

import { useEffect, useState } from "react";
import { BookingState, toDateISO } from "./types";
import { motion, AnimatePresence } from "framer-motion";
import { BOOKING_HORIZON_DAYS } from "@/lib/reservations/constants";
import { ORDER_URL } from "@/lib/flags";

interface Props {
  state: BookingState;
  updateState: (updates: Partial<BookingState>) => void;
  nextStep: () => void;
  prevStep: () => void;
}

export function StepDateTime({ state, updateState, nextStep, prevStep }: Props) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Default to TODAY so available times appear immediately — no "select a date" gate.
  const effectiveDate = state.date ?? today;
  const isTodaySelected = effectiveDate.toDateString() === today.toDateString();

  // Availability is DERIVED from a (location|date|experience) signature; the effect
  // only setState()s inside its async callback.
  const sig = state.location ? `${state.location}|${toDateISO(effectiveDate)}|${state.experience ?? ""}` : "";
  const [avail, setAvail] = useState<{ sig: string; times: string[] }>({ sig: "", times: [] });
  const loadingTimes = sig !== "" && avail.sig !== sig;
  const times = avail.sig === sig ? avail.times : [];

  // Calendar Logic
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sunday
  const startingDayOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
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
    updateState({ date: effectiveDate, time, mode: "reservation" });
    setTimeout(() => {
      nextStep();
    }, 400);
  };

  const handleJoinWaitlist = () => {
    updateState({ mode: "waitlist", time: null });
    nextStep();
  };

  // Fetch real availability whenever the signature changes (location|date|experience
  // is all encoded in `sig`, so this is the single, stable dependency).
  useEffect(() => {
    if (!sig) return;
    const [location, dateISO, experience] = sig.split("|");
    const controller = new AbortController();
    const params = new URLSearchParams({ location, date: dateISO });
    if (experience) params.set("experience", experience);
    fetch(`/api/reservations/availability?${params.toString()}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((d: { times?: string[] }) => setAvail({ sig, times: d.times ?? [] }))
      .catch((e: Error) => {
        if (e.name !== "AbortError") setAvail({ sig, times: [] });
      });
    return () => controller.abort();
  }, [sig]);

  const isSelectedDate = (day: number) =>
    effectiveDate.getDate() === day && effectiveDate.getMonth() === month && effectiveDate.getFullYear() === year;

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
          {(
            <motion.div
              key={toDateISO(effectiveDate)}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="border-t border-[#2A211C]/10 pt-8"
            >
              <h4 className="text-center text-[#2B221D] text-[20px] font-serif mb-1.5">
                {isTodaySelected ? "Today — Available" : effectiveDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
              </h4>
              {!loadingTimes && times.length > 0 && (
                <p className="text-center text-[#B08A3E] text-[11px] tracking-[0.15em] uppercase font-sans font-semibold mb-6">{times.length} slots available · tap to continue</p>
              )}

              {loadingTimes ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 py-2">
                  {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-[56px] bg-[#2A211C]/5 animate-pulse" />)}
                </div>
              ) : times.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {times.map((time) => (
                    <button
                      key={time}
                      onClick={() => handleTimeSelect(time)}
                      className={`h-[56px] text-[16px] font-serif transition-all duration-300 border
                        ${state.time === time
                          ? "bg-[#2A211C] border-[#2A211C] text-[#F6F2EA] shadow-[0_4px_14px_rgba(42,33,28,0.25)]"
                          : "border-[#2A211C]/20 text-[#2B221D] hover:border-[#B08A3E] hover:bg-[#B08A3E]/5 hover:text-[#B08A3E] hover:-translate-y-0.5"}`}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-[#2B221D] text-[18px] font-serif mb-1.5">Fully booked for this date</p>
                  <p className="text-[#5A524B] text-[15px] font-sans mb-7">We&apos;d still love to welcome you — join the waitlist, or enjoy us at home tonight.</p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                      onClick={handleJoinWaitlist}
                      className="inline-flex items-center justify-center h-[52px] px-8 bg-[#B08A3E] text-[#2A211C] text-[12px] tracking-[0.15em] font-medium uppercase font-sans hover:bg-[#2A211C] hover:text-[#F6F2EA] transition-colors duration-500"
                    >
                      Join the Waitlist
                    </button>
                    <a
                      href={ORDER_URL}
                      className="inline-flex items-center justify-center h-[52px] px-8 border border-[#5D0925] text-[#5D0925] text-[12px] tracking-[0.15em] font-medium uppercase font-sans hover:bg-[#5D0925] hover:text-[#F6F2EA] transition-colors duration-500"
                    >
                      Order Online
                    </a>
                  </div>
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
