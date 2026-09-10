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

type DayReason = "ok" | "closed" | "past" | "full";
type Avail = { sig: string; found: boolean; times: string[] };

function isoToLocalDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

const longDate = (d: Date) => d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

export function StepDateTime({ state, updateState, nextStep, prevStep }: Props) {
  const [currentMonth, setCurrentMonth] = useState(() => state.date ?? new Date());

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Start on today; if today has no tables left we jump to the next date that does.
  const effectiveDate = state.date ?? today;
  const isTodaySelected = effectiveDate.toDateString() === today.toDateString();

  // When the requested day has no tables, remember it (and why) so we can show a
  // short note — and offer the waitlist only if that day was fully booked.
  const [jumpedFrom, setJumpedFrom] = useState<{ date: Date; reason: DayReason } | null>(null);

  // Availability is DERIVED from a (location|date|experience) signature; the effect
  // only setState()s inside its async callback.
  const sig = state.location ? `${state.location}|${toDateISO(effectiveDate)}|${state.experience ?? ""}` : "";
  const [avail, setAvail] = useState<Avail>({ sig: "", found: true, times: [] });
  const loadingTimes = sig !== "" && avail.sig !== sig;
  const times = avail.sig === sig ? avail.times : [];
  const nothingSoon = !loadingTimes && avail.sig === sig && !avail.found;

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
    setJumpedFrom(null);
    updateState({ date: new Date(year, month, day), time: null, mode: "reservation" });
  };

  const handleTimeSelect = (time: string) => {
    updateState({ date: effectiveDate, time, mode: "reservation" });
    setTimeout(() => {
      nextStep();
    }, 400);
  };

  const handleJoinWaitlist = (date: Date) => {
    updateState({ date, mode: "waitlist", time: null });
    nextStep();
  };

  // Ask for the first day ON/AFTER the selected date that has tables. If that's a
  // later day, move the selection there (the new date's signature re-runs this and
  // lands on the same day, so there's no loop).
  useEffect(() => {
    if (!sig) return;
    const [location, dateISO, experience] = sig.split("|");
    const controller = new AbortController();
    const params = new URLSearchParams({ location, date: dateISO, next: "1" });
    if (experience) params.set("experience", experience);
    fetch(`/api/reservations/availability?${params.toString()}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((d: { date?: string | null; times?: string[]; requestedReason?: DayReason }) => {
        const foundISO = d.date ?? null;
        if (foundISO && foundISO !== dateISO) {
          const target = isoToLocalDate(foundISO);
          setJumpedFrom({ date: isoToLocalDate(dateISO), reason: d.requestedReason ?? "closed" });
          setCurrentMonth(new Date(target.getFullYear(), target.getMonth(), 1));
          updateState({ date: target, time: null, mode: "reservation" });
          return;
        }
        setAvail({ sig, found: Boolean(foundISO), times: d.times ?? [] });
      })
      .catch((e: Error) => {
        if (e.name !== "AbortError") setAvail({ sig, found: false, times: [] });
      });
    return () => controller.abort();
    // updateState's identity isn't stable across renders; `sig` encodes every real input.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const jumpedLabel = jumpedFrom
    ? jumpedFrom.date.toDateString() === today.toDateString()
      ? "No tables left today"
      : `No tables on ${longDate(jumpedFrom.date)}`
    : null;

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
          <button onClick={handlePrevMonth} className="text-[#2A211C] hover:text-[#B08A3E] transition-colors p-2" aria-label="Previous month">
            &larr;
          </button>
          <h3 className="text-[24px] font-serif text-[#2B221D] tracking-wide">
            {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </h3>
          <button onClick={handleNextMonth} className="text-[#2A211C] hover:text-[#B08A3E] transition-colors p-2" aria-label="Next month">
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
              {/* Soft note when we moved the customer to the next available date. */}
              {jumpedFrom && !loadingTimes && times.length > 0 && (
                <div className="mb-5 text-center font-sans text-[14px] text-[#5A524B]">
                  <p>{jumpedLabel} — here&apos;s the next available date.</p>
                  {jumpedFrom.reason === "full" && (
                    <button
                      onClick={() => handleJoinWaitlist(jumpedFrom.date)}
                      className="mt-1.5 font-medium text-[#5D0925] underline underline-offset-2 hover:text-[#420616]"
                    >
                      Join the waitlist for {jumpedFrom.date.toDateString() === today.toDateString() ? "today" : longDate(jumpedFrom.date)}
                    </button>
                  )}
                </div>
              )}

              <h4 className="text-center text-[#2B221D] text-[20px] font-serif mb-1.5">
                {isTodaySelected ? "Today" : longDate(effectiveDate)}
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
              ) : nothingSoon ? (
                <p className="py-4 text-center font-sans text-[15px] text-[#5A524B]">
                  No tables are available online over the next few weeks. Please check back soon.
                </p>
              ) : null}
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
