"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Star, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

import { ORDER_URL } from "@/lib/flags";

type Testimonial = { quote: string; name: string; location: string };

const TESTIMONIALS: Testimonial[] = [
  { quote: "Best Indian food in South London.", name: "Sarah", location: "Balham" },
  { quote: "Outstanding service and authentic flavours.", name: "James", location: "Battersea" },
  { quote: "One of London's hidden gems.", name: "Priya", location: "London" },
  { quote: "The lamb chops alone are worth crossing London for.", name: "Tom", location: "Clapham" },
  { quote: "Service like silk, food like home. We come every birthday.", name: "Anika", location: "Wandsworth" },
];

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

/**
 * Premium social-proof band — rating + Google branding + a rotating testimonial
 * carousel + the two primary conversions (reserve / order). Sits right after the
 * hero. Compact by design; auto-rotates every 5s, pauses on hover/focus, and is
 * fully keyboard + screen-reader navigable.
 */
export function GoogleReviews({ reviewCount }: { reviewCount?: number }) {
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = TESTIMONIALS.length;

  const go = (next: number) => setIndex(((next % count) + count) % count);

  // Auto-rotate (timer restarts on every change). Stops when paused or when the
  // visitor prefers reduced motion — they can still step through manually.
  useEffect(() => {
    if (paused || reduceMotion) return;
    const t = setTimeout(() => setIndex((i) => (i + 1) % count), 5000);
    return () => clearTimeout(t);
  }, [index, paused, reduceMotion, count]);

  const active = TESTIMONIALS[index];

  return (
    <section className="border-y border-[#2A211C]/8 bg-[#F5F0E6] px-6 py-12 lg:py-14">
      <div className="mx-auto flex max-w-[760px] flex-col items-center text-center">
        {/* Rating + Google branding */}
        <div className="flex items-center gap-2.5">
          <div className="flex gap-0.5" aria-hidden>
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="h-[18px] w-[18px] fill-[#B08A3E] text-[#B08A3E]" strokeWidth={0} />
            ))}
          </div>
          <span className="font-serif text-[20px] leading-none text-[#2B221D]">
            4.8<span className="ml-0.5 text-[14px] text-[#5A524B]">/5</span>
          </span>
        </div>
        <p className="mt-2.5 flex items-center gap-1.5 font-sans text-[11px] uppercase tracking-[0.2em] text-[#5A524B]">
          <GoogleG /> Rated Excellent on Google
          {typeof reviewCount === "number" && reviewCount > 0 && (
            <span className="text-[#5A524B]">· {reviewCount.toLocaleString("en-GB")} reviews</span>
          )}
        </p>

        {/* Rotating testimonial. Fixed min-height prevents layout shift between quotes. */}
        <div
          className="group relative mt-7 flex min-h-[132px] w-full items-center justify-center sm:min-h-[116px]"
          role="group"
          aria-roledescription="carousel"
          aria-label="Customer reviews"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocusCapture={() => setPaused(true)}
          onBlurCapture={() => setPaused(false)}
        >
          <AnimatePresence mode="wait">
            <motion.blockquote
              key={index}
              initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reduceMotion ? 0 : -12 }}
              transition={{ duration: 0.55, ease: EASE_OUT }}
              className="px-2"
              aria-live="polite"
              aria-atomic="true"
            >
              <p className="font-serif text-[22px] font-light italic leading-snug text-[#2B221D] lg:text-[27px]">
                &ldquo;{active.quote}&rdquo;
              </p>
              <footer className="mt-4 font-sans text-[12px] uppercase tracking-[0.18em] text-[#5D0925]">
                {active.name} · <span className="text-[#5A524B]">{active.location}</span>
              </footer>
            </motion.blockquote>
          </AnimatePresence>
        </div>

        {/* Carousel controls — keyboard accessible, labelled */}
        <div className="mt-5 flex items-center gap-3">
          <button
            type="button"
            onClick={() => go(index - 1)}
            aria-label="Previous review"
            className="grid h-8 w-8 place-items-center rounded-full border border-[#2A211C]/15 text-[#2B221D] transition-colors hover:border-[#B08A3E] hover:text-[#B08A3E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B08A3E]"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2">
            {TESTIMONIALS.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => go(i)}
                aria-label={`Show review ${i + 1} of ${count}`}
                aria-current={i === index}
                className={`h-1.5 rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B08A3E] ${
                  i === index ? "w-5 bg-[#5D0925]" : "w-1.5 bg-[#2A211C]/20 hover:bg-[#2A211C]/40"
                }`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => go(index + 1)}
            aria-label="Next review"
            className="grid h-8 w-8 place-items-center rounded-full border border-[#2A211C]/15 text-[#2B221D] transition-colors hover:border-[#B08A3E] hover:text-[#B08A3E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B08A3E]"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Conversion CTAs */}
        <div className="mt-8 flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center">
          <Link
            href="/reservations"
            className="inline-flex h-[52px] items-center justify-center bg-[#5D0925] px-9 font-sans text-[12px] uppercase tracking-[0.18em] text-[#F6F2EA] transition-colors duration-500 hover:bg-[#420616] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B08A3E] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F5F0E6]"
          >
            Reserve A Table
          </Link>
          <a
            href={ORDER_URL}
            className="inline-flex h-[52px] items-center justify-center border border-[#B08A3E] px-9 font-sans text-[12px] uppercase tracking-[0.18em] text-[#2B221D] transition-colors duration-500 hover:border-[#2B221D] hover:bg-[#2B221D] hover:text-[#F6F2EA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B08A3E] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F5F0E6]"
          >
            Order Online
          </a>
        </div>
      </div>
    </section>
  );
}

function GoogleG() {
  return (
    <svg viewBox="0 0 48 48" className="h-3.5 w-3.5" aria-hidden>
      <path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z" />
      <path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z" />
      <path fill="#FBBC05" d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34A21.99 21.99 0 0 0 2 24c0 3.55.85 6.91 2.34 9.88l7.35-5.7z" />
      <path fill="#EA4335" d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z" />
    </svg>
  );
}
