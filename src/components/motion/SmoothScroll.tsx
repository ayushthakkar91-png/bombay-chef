"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { ReactLenis } from "lenis/react";
import gsap from "gsap";

export function SmoothScroll({ children }: { children: React.ReactNode }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Lenis ref shape isn't exported cleanly
  const lenisRef = useRef<any>(null);
  const pathname = usePathname();

  useEffect(() => {
    // Reset scroll to top instantly when the route changes
    if (lenisRef.current?.lenis) {
      lenisRef.current.lenis.scrollTo(0, { immediate: true });
    }
  }, [pathname]);

  useEffect(() => {
    function update(time: number) {
      lenisRef.current?.lenis?.raf(time * 1000);
    }

    gsap.ticker.add(update);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(update);
    };
  }, []);

  return (
    <ReactLenis
      ref={lenisRef}
      autoRaf={false}
      root
      options={{ 
        lerp: 0.07, 
        smoothWheel: true,
      }}
    >
      {children}
    </ReactLenis>
  );
}
