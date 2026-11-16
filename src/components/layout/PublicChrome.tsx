"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { CookieNotice } from "@/components/common/CookieNotice";
import type { EventPopupConfig } from "@/config/event-popup";

/**
 * The cinematic layer, loaded only where it is used.
 *
 * The /order branch below already refuses to RENDER any of this — but a
 * static import is a static import, so GSAP, ScrollTrigger, ScrollSmoother
 * and Lenis were still bundled into the chunk every page downloads. Lighthouse
 * measured 22KB of 32KB going unused on the menu page: shipped to a phone,
 * parsed, and never run, on exactly the pages where somebody is trying to pay.
 *
 * Splitting them out costs the marketing pages one extra request during
 * hydration, after their HTML is already on screen, and takes the whole
 * animation stack off the ordering flow.
 */
const SmoothScroll = dynamic(() => import("@/components/motion/SmoothScroll").then((m) => m.SmoothScroll));
const MobileBottomBar = dynamic(() => import("@/components/common/MobileBottomBar").then((m) => m.MobileBottomBar));
const EventPopup = dynamic(() => import("@/components/marketing/EventPopup").then((m) => m.EventPopup));
import { Maintenance } from "@/components/layout/Maintenance";
import { SITE_ENABLED } from "@/lib/flags";

/**
 * Renders the public marketing chrome (smooth scroll, grain atmosphere, navbar,
 * footer, mobile bar) for every route EXCEPT the admin panel. The admin area
 * gets a bare canvas so it isn't wrapped in Lenis smooth-scroll or the public
 * navigation. The non-admin branch is identical to the original root layout —
 * the public site renders exactly as before.
 */
export function PublicChrome({
  children,
  popup,
}: {
  children: React.ReactNode;
  popup?: EventPopupConfig;
}) {
  const pathname = usePathname();

  if (pathname?.startsWith("/admin")) {
    return <>{children}</>;
  }

  // Public-site kill switch — /admin above is unaffected so staff keep working.
  if (!SITE_ENABLED) {
    return <Maintenance />;
  }

  // Ordering is a task, not a story. The cinematic layer — Lenis smooth scroll,
  // the GSAP ticker driving it, the grain filter, the mobile bar and the offers
  // popup — costs frames on exactly the pages where a customer is trying to pay,
  // and the scroll-triggered animations look for elements these pages do not
  // have (hence the "GSAP target null" warnings on checkout). So the order flow
  // gets the navbar, the page and the footer, and nothing else.
  if (pathname?.startsWith("/order")) {
    return (
      <>
        <Navbar />
        <main className="flex-grow">{children}</main>
        <Footer />
        <CookieNotice />
      </>
    );
  }

  return (
    <SmoothScroll>
      {/* Global Atmosphere: Cinematic Grain & Depth.
          No blend mode: a fixed, viewport-sized mix-blend layer forces the
          GPU to re-composite against the whole scrolling page every frame,
          which is the main cause of scroll jank. translateZ(0) promotes this
          to its own layer so the noise rasterizes once and the compositor
          just keeps it pinned while you scroll. */}
      {/* Grain: desktop only. On mobile the live SVG filter is the main scroll-
          jank source (weak GPUs re-rasterize it every frame), so it's dropped
          there for a smoother feel. numOctaves lowered 3→1 to cut filter cost. */}
      <div
        className="pointer-events-none fixed inset-0 z-[100] hidden opacity-[0.06] md:block"
        style={{ transform: "translateZ(0)" }}
      >
        <svg className="w-full h-full opacity-60" xmlns="http://www.w3.org/2000/svg">
          <filter id="noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="1" stitchTiles="stitch" />
          </filter>
          <rect width="100%" height="100%" filter="url(#noise)" />
        </svg>
      </div>
      <div className="pointer-events-none fixed inset-0 z-[90] bg-[radial-gradient(circle_at_top_right,rgba(168,132,66,0.06),transparent_50%),radial-gradient(circle_at_bottom_left,rgba(93,9,37,0.04),transparent_50%)]" />

      <Navbar />
      <main className="flex-grow">{children}</main>
      <Footer />
      <MobileBottomBar />
      <CookieNotice />
      {popup && <EventPopup config={popup} />}
    </SmoothScroll>
  );
}
