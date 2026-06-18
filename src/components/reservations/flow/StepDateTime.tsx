"use client";

import { useState } from "react";
import { BookingState } from "./types";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  state: BookingState;
  updateState: (updates: Partial<BookingState>) => void;
  nextStep: () => void;
  prevStep: () => void;
}

const TIME_SLOTS = [
  "12:00 PM", "12:30 PM", "1:00 PM", "1:30 PM", "2:00 PM",
  "6:00 PM", "6:30 PM", "7:00 PM", "7:30 PM", "8:00 PM", "8:30 PM", "9:00 PM", "9:30 PM"
];

export function StepDateTime({ state, updateState, nextStep, prevStep }: Props) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Calendar Logic
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sunday
  
  // Adjust so Monday is first (1 = Mon, 0 = Sun -> 6)
  const startingDayOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  const handlePrevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));

  const handleDateSelect = (day: number) => {
    updateState({ date: new Date(year, month, day), time: null }); // Reset time when date changes
  };

  const handleTimeSelect = (time: string) => {
    updateState({ time });
    setTimeout(() => {
      nextStep();
    }, 400);
  };

  const isSelectedDate = (day: number) => {
    if (!state.date) return false;
    return (
      state.date.getDate() === day &&
      state.date.getMonth() === month &&
      state.date.getFullYear() === year
    );
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      today.getDate() === day &&
      today.getMonth() === month &&
      today.getFullYear() === year
    );
  };

  return (
    <div className="w-full flex flex-col pt-8 max-w-[800px] mx-auto">
      
      <div className="text-center mb-12">
        <h2 className="text-[40px] md:text-[56px] font-serif text-[#2B221D] leading-none mb-6">
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

            return (
              <div key={day} className="flex items-center justify-center h-[48px]">
                <button
                  onClick={() => handleDateSelect(day)}
                  className={`w-[40px] h-[40px] flex items-center justify-center rounded-full text-[15px] font-serif transition-all duration-300
                    ${selected ? "bg-[#B08A3E] text-[#F6F2EA] shadow-[0_4px_12px_rgba(176,138,62,0.4)] scale-110" : 
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
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {TIME_SLOTS.map((time) => (
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
