"use client";

import Link from "next/link";
import { useRef } from "react";
import { usePathname } from "next/navigation";
import { ORDER_URL } from "@/lib/flags";
import { gsap, ScrollTrigger } from "@/utils/gsap";
import { useGSAP } from "@gsap/react";

export function MobileBottomBar() {
  const barRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useGSAP(() => {
    if (!barRef.current) return;

    // Initially hide the bar (push it down enough so the shadow is hidden too)
    gsap.set(barRef.current, { yPercent: 150 });

    ScrollTrigger.create({
      trigger: "body",
      start: "top -80%", // trigger after scrolling 80% of viewport height
      onEnter: () => gsap.to(barRef.current, { yPercent: 0, duration: 0.5, ease: "power3.out" }),
      onLeaveBack: () => gsap.to(barRef.current, { yPercent: 150, duration: 0.5, ease: "power3.in" }),
    });
  }, []);

  // The marketing CTA bar collides with the ordering flow's own cart bar and
  // doesn't belong over the account area — hide it on those routes.
  if (pathname?.startsWith("/order") || pathname?.startsWith("/account")) return null;

  return (
    <div 
      ref={barRef}
      className="fixed bottom-0 left-0 right-0 z-[80] lg:hidden w-full bg-[#2A211C] shadow-[0_-4px_20px_rgba(0,0,0,0.2)] pb-[env(safe-area-inset-bottom)]"
    >
      <div className="flex h-[60px]">
        
        <Link
          href="/reservations"
          className="flex-1 flex items-center justify-center border-r border-[#F6F2EA]/10 text-[#F6F2EA] text-[12px] font-medium tracking-[0.15em] uppercase active:bg-[#3A2F28] sm:hover:bg-[#3A2F28] transition-colors"
        >
          Reserve Table
        </Link>
        
        <Link
          href={ORDER_URL}
          className="flex-1 flex items-center justify-center bg-[#7A0E2E] text-[#F6F2EA] text-[12px] font-medium tracking-[0.15em] uppercase active:bg-[#5D0925] sm:hover:bg-[#5D0925] transition-colors"
        >
          Order Online
        </Link>
        
      </div>
    </div>
  );
}
