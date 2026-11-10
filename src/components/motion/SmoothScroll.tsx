"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ReactLenis } from "lenis/react";
import { gsap, ScrollTrigger } from "@/utils/gsap";

/**
 * Smooth scrolling, where it helps.
 *
 * Lenis replaces native scrolling and is driven from the GSAP ticker, so the
 * page only advances when the main thread is free. On a capable machine that
 * reads as a slow, expensive glide. On a weak phone it reads as the page
 * sticking — and the browser's own scrolling, which runs on the compositor,
 * would have been smoother.
 *
 * So it is opt-out in two cases:
 *   - the visitor asked for reduced motion (hijacked scrolling is the clearest
 *     possible violation of that request);
 *   - the device looks low-powered, where it costs more than it gives.
 *
 * Both fall back to native scrolling. Nothing else changes: the page, its
 * content and every GSAP reveal still work, because ScrollTrigger listens to
 * native scroll perfectly well on its own.
 */
function useSmoothScrollWanted(): boolean | null {
  // null = undecided (first render, server and client agree on markup).
  const [wanted, setWanted] = useState<boolean | null>(null);

  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const decide = () => {
      if (motionQuery.matches) return setWanted(false);
      // Rough but effective: cores and memory are the two hints browsers give
      // us, and a 2-core/2GB Android is precisely where Lenis hurts.
      const cores = navigator.hardwareConcurrency ?? 8;
      const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
      setWanted(cores > 4 && memory > 4);
    };

    decide();
    motionQuery.addEventListener("change", decide);
    return () => motionQuery.removeEventListener("change", decide);
  }, []);

  return wanted;
}

export function SmoothScroll({ children }: { children: React.ReactNode }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Lenis ref shape isn't exported cleanly
  const lenisRef = useRef<any>(null);
  const pathname = usePathname();
  const smooth = useSmoothScrollWanted();

  useEffect(() => {
    // Reset scroll to top instantly when the route changes.
    if (lenisRef.current?.lenis) {
      lenisRef.current.lenis.scrollTo(0, { immediate: true });
    } else {
      window.scrollTo(0, 0);
    }
  }, [pathname]);

  useEffect(() => {
    if (!smooth) return;

    function update(time: number) {
      lenisRef.current?.lenis?.raf(time * 1000);
    }

    gsap.ticker.add(update);
    gsap.ticker.lagSmoothing(0);

    // Keep ScrollTrigger in sync with Lenis-driven scrolling; without this,
    // pinned/scrubbed sections lag or jump while Lenis animates the scroll.
    const lenis = lenisRef.current?.lenis;
    lenis?.on("scroll", ScrollTrigger.update);

    return () => {
      gsap.ticker.remove(update);
      lenis?.off("scroll", ScrollTrigger.update);
    };
  }, [smooth]);

  // Undecided or unwanted: plain native scrolling. ScrollTrigger handles native
  // scroll on its own, so every reveal still fires.
  if (!smooth) return <>{children}</>;

  return (
    <ReactLenis
      ref={lenisRef}
      autoRaf={false}
      root
      options={{
        // Smoother, more controlled glide: a gentle exponential ease-out over a
        // fixed duration reads more "buttery" than a raw lerp, without feeling
        // floaty or laggy. Slightly reduced wheel gain softens fast flicks.
        duration: 1.15,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        wheelMultiplier: 0.9,
        touchMultiplier: 1.2,
      }}
    >
      {children}
    </ReactLenis>
  );
}
