"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const STORAGE_KEY = "bbc:cookie-consent";

/**
 * Slim, non-blocking cookie/storage notice. Shown once until acknowledged
 * (persisted in localStorage). Informational banner — analytics here are
 * cookieless, so no consent gating is required; we simply tell visitors what
 * we store and why, with a link to the privacy policy.
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

  const accept = () => {
    setVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
  };

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="Cookie notice"
      className="fixed inset-x-0 bottom-0 z-[110] border-t border-[#B08A3E]/25 bg-[#2B221D] px-5 py-4 sm:px-8"
    >
      <div className="mx-auto flex max-w-[1100px] flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-sans text-[13px] leading-relaxed text-[#F6F2EA]/85">
          We use cookies and similar storage for analytics, promotions and a better experience.{" "}
          <Link href="/privacy" className="underline underline-offset-2 text-[#F6F2EA] hover:text-[#B08A3E]">
            Learn more
          </Link>
        </p>
        <button
          type="button"
          onClick={accept}
          className="shrink-0 bg-[#B08A3E] px-6 py-2.5 font-sans text-[11px] font-semibold uppercase tracking-[0.15em] text-[#2B221D] transition-colors hover:bg-[#C9A254] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B08A3E]"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
