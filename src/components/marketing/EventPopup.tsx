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

  const eligible = cfg.enabled && cfg.routes.includes(pathname ?? "");

  // Schedule the pop-up on eligible routes.
  useEffect(() => {
    if (!eligible) return;
    if (!withinCampaignWindow(new Date())) return;
    if (recentlyDismissed()) return;

    const t = setTimeout(() => setMounted(true), APPEAR_DELAY_MS);
    return () => clearTimeout(t);
  }, [eligible]);

  // Play the enter transition on the next frame and move focus to the close button.
  useEffect(() => {
    if (!mounted) return;
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
      <div
        aria-hidden
        onClick={dismiss}
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Live football at ${cfg.location}`}
        className={`relative w-full max-w-[600px] overflow-hidden rounded-[4px] border border-[#2A211C]/10 bg-[#F6F2EA] px-8 pb-9 pt-9 shadow-[0_30px_90px_-25px_rgba(0,0,0,0.6)] transition-transform duration-[450ms] ease-out will-change-transform motion-reduce:transition-none sm:px-10 ${shown ? "scale-100" : "scale-[0.96]"}`}
      >
        {/* Gold top hairline */}
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#B08A3E] to-transparent"
        />

        {/* Close */}
        <button
          ref={closeRef}
          type="button"
          onClick={dismiss}
          aria-label="Close football popup"
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full text-[#2B221D]/60 transition-colors hover:bg-[#2A211C]/5 hover:text-[#2B221D] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B08A3E]"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>

        {/* Content — fades in beneath the scene */}
        <div className={`transition-all duration-700 ease-out delay-200 motion-reduce:translate-y-0 motion-reduce:transition-none ${shown ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`}>
        {/* Kicker: animated gold line + label */}
        {cfg.label && (
          <div className="mb-4 flex items-center gap-2.5">
            <span
              aria-hidden
              className={`h-px bg-[#B08A3E]/70 transition-[width] duration-700 ease-out motion-reduce:w-9 ${shown ? "w-9" : "w-0"}`}
            />
            <span className="font-sans text-[10px] font-semibold uppercase tracking-[0.25em] text-[#9A7430]">
              {cfg.label}
            </span>
          </div>
        )}

        <h2 className="pr-6 font-serif text-[30px] font-light leading-[1.1] text-[#2B221D] sm:text-[34px]">
          {cfg.title}
        </h2>

        <p className="mt-3 font-sans text-[14px] leading-relaxed text-[#4A4039]">{cfg.message}</p>

        <ul className="mt-4 flex flex-col gap-1.5">
          {cfg.details.map((d) => (
            <li key={d} className="flex items-center gap-2 font-sans text-[13px] text-[#4A4039]">
              <span aria-hidden className="h-1 w-1 shrink-0 rounded-full bg-[#B08A3E]" />
              {d}
            </li>
          ))}
        </ul>

        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
          <Link
            href={cfg.ctaHref}
            onClick={dismiss}
            className="inline-flex h-[48px] flex-1 items-center justify-center bg-[#5D0925] px-6 font-sans text-[11px] font-semibold uppercase tracking-[0.18em] text-[#F6F2EA] transition-colors hover:bg-[#420616] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5D0925]"
          >
            {cfg.ctaText}
          </Link>
          <Link
            href={cfg.secondaryHref}
            onClick={dismiss}
            className="inline-flex h-[48px] flex-1 items-center justify-center border border-[#2B221D]/25 px-6 font-sans text-[11px] font-semibold uppercase tracking-[0.18em] text-[#2B221D] transition-colors hover:border-[#2B221D] hover:bg-[#2B221D] hover:text-[#F6F2EA] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2B221D]"
          >
            {cfg.secondaryText}
          </Link>
        </div>
        </div>
      </div>
    </div>
  );
}
