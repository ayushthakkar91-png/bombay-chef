"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { gsap } from "@/utils/gsap";
import { useGSAP } from "@gsap/react";
export function Hero() {
  const bgRef = useRef<HTMLDivElement>(null);
  const chapterRef = useRef<HTMLSpanElement>(null);
  const hindiRef = useRef<HTMLSpanElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const buttonsRef = useRef<HTMLDivElement>(null);
  const curtainRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const mm = gsap.matchMedia();

    // All motion lives inside the no-preference branch. Every element renders
    // visible by default (no opacity:0 in markup), so a no-JS render, a crawler,
    // a failed GSAP load, or a reduced-motion visitor all see the full hero —
    // including the "Reserve A Table" CTA. GSAP only applies the hidden "from"
    // state below, before paint, when motion is actually allowed.
    // Split desktop / mobile so the heavy, continuous effects (infinite Ken-Burns
    // breath + scroll-scrubbed parallax) run on desktop only. The fast reveal runs
    // on both. Reduced-motion still sees the full hero (markup is visible by default).
    mm.add(
      {
        isDesktop: "(min-width: 769px) and (prefers-reduced-motion: no-preference)",
        isMobile: "(max-width: 768px) and (prefers-reduced-motion: no-preference)",
      },
      (context) => {
        const isDesktop = Boolean((context.conditions as { isDesktop?: boolean } | undefined)?.isDesktop);

        // Background settle. The endless "breath" loop is desktop-only.
        gsap.fromTo(bgRef.current, { scale: isDesktop ? 1.12 : 1.06 }, { scale: 1, duration: isDesktop ? 20 : 8, ease: "power1.out" });
        if (isDesktop) {
          gsap.to(bgRef.current, { scale: 1.03, duration: 16, ease: "sine.inOut", yoyo: true, repeat: -1, delay: 20 });
        }

        // Curtain lift — quick.
        if (curtainRef.current) {
          gsap.fromTo(curtainRef.current, { opacity: 0.55 }, { opacity: 0, duration: 0.8, ease: "power2.out" });
        }

        // ═══ Fast cinematic reveal — first line by ~0.6s, complete by ~1.5s ═══
        const reveal = gsap.timeline({ delay: 0.15 });
        if (hindiRef.current) {
          reveal.fromTo(hindiRef.current, { opacity: 0, y: 12 }, { opacity: 0.85, y: 0, duration: 0.6, ease: "expo.out" });
        }
        if (chapterRef.current) {
          reveal.fromTo(chapterRef.current, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.5, ease: "expo.out" }, "-=0.4");
        }
        if (headlineRef.current) {
          const words = headlineRef.current.querySelectorAll('.word');
          reveal.fromTo(words, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, stagger: 0.04, ease: "expo.out" }, "-=0.35");
        }
        if (subtitleRef.current) {
          reveal.fromTo(subtitleRef.current, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.55, ease: "expo.out" }, "-=0.45");
        }
        if (buttonsRef.current) {
          reveal.fromTo(buttonsRef.current, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.5, ease: "expo.out" }, "-=0.35");
        }

        // Scroll-scrubbed parallax — desktop only (heavy on mobile).
        if (isDesktop && contentRef.current) {
          gsap.to(contentRef.current, {
            y: -100, opacity: 0, scale: 0.95,
            scrollTrigger: { trigger: "#chapter-family-kitchen", start: "top bottom", end: "top 40%", scrub: 1 },
          });
        }
        if (isDesktop) {
          gsap.to(bgRef.current, {
            scale: 1.1, opacity: 0.3,
            scrollTrigger: { trigger: "#chapter-family-kitchen", start: "top bottom", end: "top top", scrub: true },
          });
        }
      },
    );
  }, []);

  return (
    <section className="relative min-h-[100dvh] w-full flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div ref={bgRef} className="absolute inset-0 z-0">
        <Image
          src="/images/hero/hero-bg.jpg"
          alt="The lamplit dining room at Bombay Bicycle Chef, tables set for the evening"
          fill
          priority
          quality={75}
          className="object-cover object-center"
          sizes="100vw"
        />
        {/* Cinematic treatments: Darken edges, vignette, and warmth */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/40 z-10" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 z-10" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0)_0%,rgba(0,0,0,0.4)_100%)] z-10 pointer-events-none" />
        <div className="absolute inset-0 bg-primary opacity-20 z-10" />



        {/* Floating Dust Particles */}
        <div aria-hidden="true" className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
          {Array.from({ length: 18 }).map((_, i) => (
            <div
              key={i}
              className="dust-particle"
              style={{
                width: (Math.abs(Math.sin(i * 12.34)) * 3 + 1.5) + 'px',
                height: (Math.abs(Math.sin(i * 43.21)) * 3 + 1.5) + 'px',
                left: (Math.abs(Math.sin(i * 76.54)) * 100) + '%',
                top: (Math.abs(Math.sin(i * 98.76)) * 100) + '%',
                animationDuration: (Math.abs(Math.sin(i * 24.68)) * 12 + 15) + 's',
                animationDelay: (Math.abs(Math.sin(i * 13.57)) * -20) + 's',
              }}
            />
          ))}
        </div>
      </div>

      {/* Subtle dark gradient at the bottom */}
      <div
        className="absolute inset-0 z-20 pointer-events-none"
        style={{
          background: "linear-gradient(to bottom, transparent 70%, rgba(16,12,8,0.75) 100%)"
        }}
      />

      {/* Center scrim: the existing vignette is transparent at center — exactly
          where the text sits — so this floors background luminance behind the
          headline and the small brass labels, keeping them legible over any
          region of the photo. */}
      <div
        className="absolute inset-0 z-20 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 50% 44%, rgba(16,12,8,0.6) 0%, rgba(16,12,8,0.32) 48%, transparent 78%)"
        }}
      />

      {/* Cinematic curtain: the scene lifts out of shadow on load. Opacity-only
          and motion-gated (default opacity-0 below), so reduced-motion and no-JS
          renders never show a dark veil. */}
      <div
        ref={curtainRef}
        className="absolute inset-0 z-20 bg-[#0B0805] opacity-0 pointer-events-none"
      />

      {/* Content */}
      <div
        ref={contentRef}
        className="relative z-30 w-full max-w-[1200px] mx-auto px-5 sm:px-8 md:px-12 pt-[16vh] sm:pt-[18vh] pb-8 text-center flex flex-col items-center"
      >
        <div className="flex flex-col items-center">
          {/* Hindi Script (Prologue) */}
          <span
            ref={hindiRef}
            lang="hi"
            className="text-[#F3EEE8]/85 text-[15px] italic tracking-[0.08em] font-light mb-4 sm:mb-[2vh] block"
            style={{ textShadow: "0 1px 14px rgba(0,0,0,0.5)" }}
          >
            कहानियाँ वहीं शुरू होती हैं<br className="sm:hidden" /> जहाँ लोग साथ बैठते हैं
          </span>

          {/* Chapter Label (Marker) */}
          <span
            ref={chapterRef}
            className="text-brass-light text-[10px] tracking-[0.4em] font-normal uppercase mb-6 sm:mb-[3vh] font-sans block"
            style={{ textShadow: "0 1px 12px rgba(0,0,0,0.55)" }}
          >
            Chapter I &middot; The Arrival
          </span>

          {/* Heading */}
          <h1
            ref={headlineRef}
            className="font-serif text-[#F3EEE8] mb-6 sm:mb-[4vh] font-light text-balance flex flex-col space-y-3 sm:space-y-4"
            style={{ fontSize: "clamp(1.75rem, 4.5vw, 5rem)", lineHeight: "1.2", textShadow: "0 2px 24px rgba(0,0,0,0.4)" }}
          >
            <span className="block">
              <span className="word inline-block">Every</span> <span className="word inline-block">City</span> <span className="word inline-block">Has</span> <span className="word inline-block">Its</span> <span className="word inline-block">Stories.</span>
            </span>
            <span className="block">
              <span className="word inline-block">Ours</span> <span className="word inline-block">Begin</span> <span className="word inline-block">Around</span> <span className="word inline-block">A</span> <span className="word inline-block">Table.</span>
            </span>
          </h1>

          {/* Tagline */}
          <p
            ref={subtitleRef}
            className="text-[13px] lg:text-[14px] text-brass-light max-w-[500px] mx-auto mb-8 sm:mb-[5vh] font-sans tracking-[0.25em] font-normal uppercase"
            style={{ lineHeight: "2", textShadow: "0 1px 12px rgba(0,0,0,0.55)" }}
          >
            Inspired By Bombay.<br className="sm:hidden" /> Made For London.
          </p>

          {/* CTA */}
          <div
            ref={buttonsRef}
            className="flex flex-col items-center justify-center gap-6 sm:gap-8 w-full sm:w-auto"
          >
            <a
              href="#chapter-reservation"
              className="flex items-center justify-center h-[48px] sm:h-[52px] px-8 sm:px-12 rounded-none bg-primary border border-primary text-[#F3EEE8] text-[11px] sm:text-[12px] tracking-[0.2em] font-normal uppercase font-sans hover:bg-primary-dark hover:border-primary-dark transition-all duration-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-dark focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A130D]"
            >
              Reserve A Table
            </a>

            <div className="flex items-center gap-6 sm:gap-10 mt-2">
              <Link
                href="/menu"
                className="group flex min-h-[44px] flex-col items-center justify-center gap-2 px-2 py-2 text-brass-light/85 hover:text-[#F3EEE8] transition-colors duration-500 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-dark"
                style={{ textShadow: "0 1px 12px rgba(0,0,0,0.55)" }}
              >
                <span className="text-[10px] sm:text-[11px] tracking-[0.25em] uppercase font-sans font-normal">View Menu</span>
                <span className="text-[10px] opacity-0 group-hover:opacity-100 transition-opacity duration-300">&mdash;</span>
              </Link>

              <span className="text-brass-light/30 text-[10px]">&bull;</span>

              <a
                href="#chapter-family-kitchen"
                className="group flex min-h-[44px] flex-col items-center justify-center gap-2 px-2 py-2 text-brass-light/85 hover:text-[#F3EEE8] transition-colors duration-500 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-dark"
                style={{ textShadow: "0 1px 12px rgba(0,0,0,0.55)" }}
              >
                <span className="text-[10px] sm:text-[11px] tracking-[0.25em] uppercase font-sans font-normal">Explore Story</span>
                <span className="text-[10px] group-hover:translate-y-1 transition-transform duration-300">↓</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
