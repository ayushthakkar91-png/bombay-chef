"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { eventPopup as cfg } from "@/config/event-popup";

const STORAGE_KEY = "bbc:event:live-football-balham";
const APPEAR_DELAY_MS = 2500;
const EXIT_MS = 500;

function withinCampaignWindow(now: Date): boolean {
  if (cfg.startDate && now < new Date(`${cfg.startDate}T00:00:00`)) return false;
  if (cfg.endDate && now > new Date(`${cfg.endDate}T23:59:59`)) return false;
  return true;
}

function recentlyDismissed(): boolean {
  if (cfg.dismissHours <= 0) return false; // 0 → show on every load
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const ts = Number(raw);
    return Number.isFinite(ts) && Date.now() - ts < cfg.dismissHours * 3_600_000;
  } catch {
    return false; // storage unavailable — don't block the promo
  }
}

/**
 * Lightweight, dismissible promo pop-up (bottom sheet on mobile, bottom-right
 * card on desktop). Non-blocking, keyboard-accessible, transform/opacity-only
 * animation that respects prefers-reduced-motion. Self-gates to the routes in
 * the config, so it can be mounted once globally.
 */
export function EventPopup() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false); // present in the DOM
  const [shown, setShown] = useState(false); // drives the enter/exit transition
  const closeRef = useRef<HTMLButtonElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  const eligible = cfg.enabled && cfg.routes.includes(pathname ?? "");

  // Schedule the pop-up on eligible routes.
  useEffect(() => {
    if (!eligible) return;
    if (!withinCampaignWindow(new Date())) return;
    if (recentlyDismissed()) return;

    const t = setTimeout(() => setMounted(true), APPEAR_DELAY_MS);
    return () => clearTimeout(t);
  }, [eligible]);

  // Play the enter transition on the next frame and move focus into the dialog,
  // remembering what was focused so we can restore it on close.
  useEffect(() => {
    if (!mounted) return;
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    const raf = requestAnimationFrame(() => setShown(true));
    closeRef.current?.focus();
    return () => cancelAnimationFrame(raf);
  }, [mounted]);

  const dismiss = useCallback(() => {
    setShown(false);
    try {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
    restoreFocusRef.current?.focus?.();
    setTimeout(() => setMounted(false), EXIT_MS);
  }, []);

  // Escape closes the dialog.
  useEffect(() => {
    if (!mounted) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mounted, dismiss]);

  if (!mounted) return null;

  return (
    <div
      className={`fixed inset-0 z-[120] flex items-center justify-center px-4 transition-opacity duration-[450ms] ease-out ${shown ? "opacity-100" : "opacity-0"}`}
    >
      {/* Soft backdrop — click to dismiss */}
      <div aria-hidden onClick={dismiss} className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Live Football at ${cfg.location}`}
        className={`relative max-h-[94vh] w-full max-w-[600px] overflow-y-auto overflow-x-hidden rounded-[14px] border border-[#B08A3E]/25 bg-[#F6F2EA] px-6 pb-5 pt-5 text-center shadow-[0_40px_120px_-30px_rgba(42,33,28,0.7)] transition-transform duration-[450ms] ease-out will-change-transform motion-reduce:transition-none sm:px-8 sm:pb-6 sm:pt-6 ${shown ? "scale-100" : "scale-[0.96]"}`}
      >
        {/* Close */}
        <button
          ref={closeRef}
          type="button"
          onClick={dismiss}
          aria-label="Close popup"
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-[#F6F2EA]/85 text-[#2B221D]/70 shadow-sm backdrop-blur-sm transition-colors hover:bg-[#F6F2EA] hover:text-[#2B221D] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B08A3E]"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>

        {/* Content — fades in */}
        <div className={`transition-all duration-700 ease-out delay-200 motion-reduce:translate-y-0 motion-reduce:transition-none ${shown ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`}>
          {/* Eyebrow with flanking gold rules */}
          {cfg.label && (
            <div className="mb-2 flex items-center justify-center gap-3">
              <span aria-hidden className="h-px w-7 bg-[#B08A3E]/50" />
              <span className="font-sans text-[9px] font-semibold uppercase tracking-[0.3em] text-[#806515]">{cfg.label}</span>
              <span aria-hidden className="h-px w-7 bg-[#B08A3E]/50" />
            </div>
          )}

          <h2 className="font-serif text-[25px] font-light leading-[1.05] text-[#2B221D] sm:text-[31px]">
            {cfg.title}
          </h2>

          {/* Match card */}
          {cfg.match && (
            <div className="mx-auto mt-2.5 max-w-[340px] rounded-[10px] border border-[#B08A3E]/25 bg-white/50 px-4 py-2.5">
              <div className="flex items-center justify-center gap-2">
                <EnglandFlag />
                <span className="font-serif text-[16px] text-[#2B221D]">{cfg.match.home}</span>
                <span className="font-sans text-[9px] font-semibold uppercase tracking-[0.18em] text-[#9A7430]">vs</span>
                <span className="font-serif text-[16px] text-[#2B221D]">{cfg.match.away}</span>
                <PanamaFlag />
              </div>
              <div className="mt-1 font-sans text-[11px] uppercase tracking-[0.12em] text-[#6B6258]">
                {cfg.match.date} • {cfg.location} Branch
              </div>
            </div>
          )}

          {/* Offer — bold headline + premium sub-label */}
          {(cfg.offerHeadline || cfg.offer) && (
            <div className="mx-auto mt-3 inline-flex flex-col items-center rounded-[10px] border border-[#B08A3E]/35 bg-[#B08A3E]/[0.06] px-6 py-2">
              {cfg.offerHeadline && (
                <span className="font-serif text-[30px] font-medium leading-none text-[#5D0925] sm:text-[36px]">
                  {cfg.offerHeadline}
                </span>
              )}
              {cfg.offer && (
                <span className="mt-1 font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-[#806515]">
                  {cfg.offer}
                </span>
              )}
            </div>
          )}

          <p className="mx-auto mt-2.5 max-w-[400px] font-sans text-[13px] leading-snug text-[#4A4039]">{cfg.message}</p>

          {cfg.details.length > 0 && (
            <p className="mt-1.5 font-sans text-[12px] text-[#6B6258]">{cfg.details.join(" · ")}</p>
          )}

          {/* Thin gold divider */}
          <div aria-hidden className="mx-auto mt-4 h-px w-full max-w-[400px] bg-gradient-to-r from-transparent via-[#B08A3E]/35 to-transparent" />

          {/* CTAs — primary dominant, secondary light */}
          <div className="mx-auto mt-4 flex max-w-[400px] flex-col gap-2">
            <Link
              href={cfg.ctaHref}
              onClick={dismiss}
              className="inline-flex h-[48px] items-center justify-center bg-[#5D0925] px-6 font-sans text-[12px] font-semibold uppercase tracking-[0.18em] text-[#F6F2EA] shadow-[0_10px_30px_-12px_rgba(93,9,37,0.85)] transition-colors hover:bg-[#420616] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5D0925]"
            >
              {cfg.ctaText}
            </Link>
            <Link
              href={cfg.secondaryHref}
              onClick={dismiss}
              className="inline-flex h-[42px] items-center justify-center px-6 font-sans text-[11px] font-medium uppercase tracking-[0.18em] text-[#5A524B] transition-colors hover:text-[#2B221D] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B08A3E]"
            >
              {cfg.secondaryText}
            </Link>
          </div>

          {cfg.note && (
            <p className="mt-2.5 font-sans text-[11px] uppercase tracking-[0.12em] text-[#9A9087]">{cfg.note}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// Small five-point star, centred on the origin.
const STAR = "M0,-2.4 L0.7,-0.7 L2.4,-0.7 L1.05,0.35 L1.5,2.1 L0,1 L-1.5,2.1 L-1.05,0.35 L-2.4,-0.7 L-0.7,-0.7 Z";

const flagClass = "h-[19px] w-[27px] shrink-0 rounded-[2px] ring-1 ring-[#2B221D]/15";

/** England — St George's cross. */
function EnglandFlag() {
  return (
    <svg viewBox="0 0 20 14" aria-hidden className={flagClass}>
      <rect width="20" height="14" fill="#fff" />
      <rect x="8" width="4" height="14" fill="#CE1124" />
      <rect y="5" width="20" height="4" fill="#CE1124" />
    </svg>
  );
}

/** Panama — quartered with two stars (simplified). */
function PanamaFlag() {
  return (
    <svg viewBox="0 0 20 14" aria-hidden className={flagClass}>
      <rect width="20" height="14" fill="#fff" />
      <rect x="10" width="10" height="7" fill="#DA121A" />
      <rect y="7" width="10" height="7" fill="#072357" />
      <path d={STAR} transform="translate(5 3.5)" fill="#072357" />
      <path d={STAR} transform="translate(15 10.5)" fill="#DA121A" />
    </svg>
  );
}
