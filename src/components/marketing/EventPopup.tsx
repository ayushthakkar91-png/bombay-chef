"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";

import type { EventPopupConfig } from "@/config/event-popup";

const STORAGE_KEY = "bbc.eventpopup.dismissedAt";

/**
 * Public marketing pop-up. Content comes from the DB (`marketing_popup`,
 * editable in admin → Marketing → Popup) via `getEventPopup()`, passed in as
 * `config`; structural fields (routes, dates, dismissHours, details) come from
 * the static fallback merged inside that loader. Appears on the allowed routes
 * shortly after load, within the date window, unless dismissed recently.
 */
export function EventPopup({ config }: { config: EventPopupConfig }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const cfg = config;
    if (!cfg.enabled) return;
    if (!pathname || !cfg.routes.includes(pathname)) return;

    // Date window (restaurant-local ISO dates; inclusive).
    const today = new Date().toISOString().slice(0, 10);
    if (cfg.startDate && today < cfg.startDate) return;
    if (cfg.endDate && today > cfg.endDate) return;

    // Suppress if dismissed recently.
    if (cfg.dismissHours > 0) {
      try {
        const ts = Number(localStorage.getItem(STORAGE_KEY) || 0);
        if (ts && Date.now() - ts < cfg.dismissHours * 3600_000) return;
      } catch { /* storage unavailable — show it */ }
    }

    // Let the page settle, then reveal.
    const t = setTimeout(() => setOpen(true), 900);
    return () => clearTimeout(t);
  }, [pathname, config]);

  if (!open) return null;
  const cfg = config;

  const dismiss = () => {
    try { localStorage.setItem(STORAGE_KEY, String(Date.now())); } catch { /* ignore */ }
    setOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center p-4 sm:items-center" role="dialog" aria-modal="true" aria-label={cfg.title}>
      <button aria-label="Close offer" onClick={dismiss} className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" />

      <div className="relative w-full max-w-[420px] overflow-hidden rounded-2xl border border-[#B08A3E]/40 bg-[#1A130D] shadow-2xl">
        {/* Full-bleed background image (admin-set, else the hero photo) with a
            dark gradient over it so the copy stays legible on any photo. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={cfg.image || "/images/hero/hero-bg.jpg"} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover" />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/65 to-black/85" />

        <button onClick={dismiss} aria-label="Close" className="absolute right-3 top-3 z-20 rounded-full bg-black/40 p-1.5 text-[#F6F2EA] backdrop-blur-sm transition-colors hover:bg-black/60">
          <X className="h-5 w-5" />
        </button>

        <div className="relative z-10 px-7 pb-7 pt-12 text-center">
          {cfg.label && <p className="mb-2 font-sans text-[11px] font-semibold uppercase tracking-[0.25em] text-[#D8BD85]">{cfg.label}</p>}
          <h2 className="font-serif text-[32px] font-light leading-[1.1] text-[#F6F2EA] [text-shadow:0_2px_16px_rgba(0,0,0,0.5)]">{cfg.title}</h2>

          {(cfg.offerHeadline || cfg.offer) && (
            <div className="my-4 inline-flex flex-col items-center rounded-xl border border-[#D8BD85]/30 bg-[#5D0925]/90 px-6 py-3 text-[#F6F2EA] backdrop-blur-sm">
              {cfg.offerHeadline && <span className="font-serif text-[34px] leading-none">{cfg.offerHeadline}</span>}
              {cfg.offer && <span className="mt-1 font-sans text-[11px] uppercase tracking-[0.18em] text-[#F6F2EA]/85">{cfg.offer}</span>}
            </div>
          )}

          <p className="mx-auto mt-1 max-w-[320px] font-sans text-[14px] leading-relaxed text-[#F6F2EA]/85">{cfg.message}</p>

          {cfg.details.length > 0 && (
            <ul className="mx-auto mt-4 flex max-w-[320px] flex-col gap-1.5 text-left">
              {cfg.details.map((d, i) => (
                <li key={i} className="flex items-start gap-2 font-sans text-[13px] text-[#F6F2EA]/90">
                  <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#D8BD85]" />
                  {d}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-6 flex flex-col gap-2.5">
            <Link href={cfg.ctaHref} onClick={dismiss} className="inline-flex h-[52px] items-center justify-center bg-[#C8A96B] px-8 font-sans text-[12px] font-semibold uppercase tracking-[0.15em] text-[#1A130D] transition-colors hover:bg-[#D8BD85]">
              {cfg.ctaText}
            </Link>
            <Link href={cfg.secondaryHref} onClick={dismiss} className="inline-flex h-[48px] items-center justify-center border border-[#F6F2EA]/35 px-8 font-sans text-[12px] uppercase tracking-[0.15em] text-[#F6F2EA] transition-colors hover:border-[#F6F2EA] hover:bg-[#F6F2EA] hover:text-[#1A130D]">
              {cfg.secondaryText}
            </Link>
          </div>

          {cfg.note && <p className="mt-4 font-sans text-[11px] uppercase tracking-[0.15em] text-[#F6F2EA]/70">{cfg.note}</p>}
          <p className="mt-2 font-sans text-[10px] tracking-[0.08em] text-[#F6F2EA]/55">T&amp;Cs apply.</p>
        </div>
      </div>
    </div>
  );
}
