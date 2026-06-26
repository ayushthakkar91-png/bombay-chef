"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SmoothScroll } from "@/components/motion/SmoothScroll";
import { MobileBottomBar } from "@/components/common/MobileBottomBar";
import { Maintenance } from "@/components/layout/Maintenance";
import { SITE_ENABLED } from "@/lib/flags";
import type { EventPopupConfig } from "@/config/event-popup";

// Promo pop-up is client-only and self-gates by route — load it lazily so it
// stays out of the initial bundle.
const EventPopup = dynamic(
  () => import("@/components/marketing/EventPopup").then((m) => m.EventPopup),
  { ssr: false },
);

/**
 * Renders the public marketing chrome (smooth scroll, grain atmosphere, navbar,
 * footer, mobile bar) for every route EXCEPT the admin panel. The admin area
 * gets a bare canvas so it isn't wrapped in Lenis smooth-scroll or the public
 * navigation. The non-admin branch is identical to the original root layout —
 * the public site renders exactly as before.
 */
export function PublicChrome({
  children,
  eventPopup,
}: {
  children: React.ReactNode;
  eventPopup?: EventPopupConfig;
}) {
  const pathname = usePathname();

  if (pathname?.startsWith("/admin")) {
    return <>{children}</>;
  }

  // Public-site kill switch — /admin above is unaffected so staff keep working.
  if (!SITE_ENABLED) {
    return <Maintenance />;
  }

  return (
    <SmoothScroll>
      {/* Global Atmosphere: Cinematic Grain & Depth.
          No blend mode: a fixed, viewport-sized mix-blend layer forces the
          GPU to re-composite against the whole scrolling page every frame,
          which is the main cause of scroll jank. translateZ(0) promotes this
          to its own layer so the noise rasterizes once and the compositor
          just keeps it pinned while you scroll. */}
      <div
        className="pointer-events-none fixed inset-0 z-[100] opacity-[0.06]"
        style={{ transform: "translateZ(0)" }}
      >
        <svg className="w-full h-full opacity-60" xmlns="http://www.w3.org/2000/svg">
          <filter id="noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch" />
          </filter>
          <rect width="100%" height="100%" filter="url(#noise)" />
        </svg>
      </div>
      <div className="pointer-events-none fixed inset-0 z-[90] bg-[radial-gradient(circle_at_top_right,rgba(168,132,66,0.06),transparent_50%),radial-gradient(circle_at_bottom_left,rgba(93,9,37,0.04),transparent_50%)]" />

      <Navbar />
      <main className="flex-grow">{children}</main>
      <Footer />
      <MobileBottomBar />
      <EventPopup config={eventPopup} />
    </SmoothScroll>
  );
}
