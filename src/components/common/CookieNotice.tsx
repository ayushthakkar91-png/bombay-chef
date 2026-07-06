"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { recordCookieConsent } from "@/app/_actions/cookie-consent";

const STORAGE_KEY = "bbc:cookie-consent";

/**
 * Cookie/storage consent banner. Shown until the visitor chooses Accept or
 * Reject; the choice is kept in localStorage (so the banner stays away) and
 * recorded server-side with a timestamp via `recordCookieConsent`. Sits above
 * the mobile bottom bar (60px + safe area) on small screens.
 */
export function CookieNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch {
      /* storage unavailable — stay hidden */
    }
  }, []);

  const choose = (choice: "accepted" | "rejected") => {
    setVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ choice, at: new Date().toISOString() }));
    } catch {
      /* ignore */
    }
    void recordCookieConsent(choice);
  };

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-[calc(60px+env(safe-area-inset-bottom))] z-[110] border-t border-[#B08A3E]/25 bg-[#2B221D] px-5 py-4 shadow-[0_-8px_30px_rgba(0,0,0,0.35)] sm:px-8 lg:bottom-0"
    >
      <div className="mx-auto flex max-w-[1100px] flex-col items-start gap-4 lg:flex-row lg:items-center lg:justify-between">
        <p className="font-sans text-[13px] leading-relaxed text-[#F6F2EA]/85">
          We use cookies and similar storage for analytics, promotions and a better experience.{" "}
          <Link href="/privacy" className="underline underline-offset-2 text-[#F6F2EA] hover:text-[#B08A3E]">
            Learn more
          </Link>
        </p>
        <div className="flex w-full shrink-0 gap-3 sm:w-auto">
          <button
            type="button"
            onClick={() => choose("rejected")}
            className="flex-1 border border-[#F6F2EA]/25 px-6 py-2.5 font-sans text-[11px] font-semibold uppercase tracking-[0.15em] text-[#F6F2EA]/80 transition-colors hover:border-[#F6F2EA]/60 hover:text-[#F6F2EA] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F6F2EA] sm:flex-none"
          >
            Reject
          </button>
          <button
            type="button"
            onClick={() => choose("accepted")}
            className="flex-1 bg-[#B08A3E] px-6 py-2.5 font-sans text-[11px] font-semibold uppercase tracking-[0.15em] text-[#2B221D] transition-colors hover:bg-[#C9A254] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B08A3E] sm:flex-none"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
