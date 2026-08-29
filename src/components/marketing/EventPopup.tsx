"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";

import { eventPopup } from "@/config/event-popup";

const STORAGE_KEY = "bbc.eventpopup.dismissedAt";

/**
 * Public marketing pop-up, driven entirely by `src/config/event-popup.ts`.
 * Appears on the allowed routes shortly after the page loads, within the
 * optional date window, unless the visitor dismissed it inside `dismissHours`.
 * Fully client-side — no data fetch, no layout shift.
 */
export function EventPopup() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const cfg = eventPopup;
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
  }, [pathname]);

  if (!open) return null;
  const cfg = eventPopup;

  const dismiss = () => {
    try { localStorage.setItem(STORAGE_KEY, String(Date.now())); } catch { /* ignore */ }
    setOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center p-4 sm:items-center" role="dialog" aria-modal="true" aria-label={cfg.title}>
      <button aria-label="Close offer" onClick={dismiss} className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" />

      <div className="relative w-full max-w-[420px] overflow-hidden rounded-2xl border border-[#B08A3E]/30 bg-[#F6F2EA] shadow-2xl">
        {cfg.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cfg.image} alt="" className="h-36 w-full object-cover" />
        )}
        <button onClick={dismiss} aria-label="Close" className="absolute right-3 top-3 rounded-full bg-[#F6F2EA]/90 p-1.5 text-[#2B221D] transition-colors hover:bg-white">
          <X className="h-5 w-5" />
        </button>

        <div className="px-7 pb-7 pt-8 text-center">
          {cfg.label && <p className="mb-2 font-sans text-[11px] font-semibold uppercase tracking-[0.25em] text-[#B08A3E]">{cfg.label}</p>}
          <h2 className="font-serif text-[30px] font-light leading-[1.1] text-[#2B221D]">{cfg.title}</h2>

          {(cfg.offerHeadline || cfg.offer) && (
            <div className="my-4 inline-flex flex-col items-center rounded-xl bg-[#5D0925] px-6 py-3 text-[#F6F2EA]">
              {cfg.offerHeadline && <span className="font-serif text-[34px] leading-none">{cfg.offerHeadline}</span>}
              {cfg.offer && <span className="mt-1 font-sans text-[11px] uppercase tracking-[0.18em] text-[#F6F2EA]/85">{cfg.offer}</span>}
            </div>
          )}

          <p className="mx-auto mt-1 max-w-[320px] font-sans text-[14px] leading-relaxed text-[#5A524B]">{cfg.message}</p>

          {cfg.details.length > 0 && (
            <ul className="mx-auto mt-4 flex max-w-[320px] flex-col gap-1.5 text-left">
              {cfg.details.map((d, i) => (
                <li key={i} className="flex items-start gap-2 font-sans text-[13px] text-[#2B221D]">
                  <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#B08A3E]" />
                  {d}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-6 flex flex-col gap-2.5">
            <Link href={cfg.ctaHref} onClick={dismiss} className="inline-flex h-[52px] items-center justify-center bg-[#5D0925] px-8 font-sans text-[12px] uppercase tracking-[0.15em] text-[#F6F2EA] transition-colors hover:bg-[#420616]">
              {cfg.ctaText}
            </Link>
            <Link href={cfg.secondaryHref} onClick={dismiss} className="inline-flex h-[48px] items-center justify-center border border-[#2B221D]/25 px-8 font-sans text-[12px] uppercase tracking-[0.15em] text-[#2B221D] transition-colors hover:border-[#2B221D] hover:bg-[#2B221D] hover:text-[#F6F2EA]">
              {cfg.secondaryText}
            </Link>
          </div>

          {cfg.note && <p className="mt-4 font-sans text-[11px] uppercase tracking-[0.15em] text-[#5A524B]">{cfg.note}</p>}
        </div>
      </div>
    </div>
  );
}
