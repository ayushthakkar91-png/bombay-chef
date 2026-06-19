"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { gsap, ScrollTrigger } from "@/utils/gsap";
import { useGSAP } from "@gsap/react";
export function Hero() {
  const bgRef = useRef<HTMLDivElement>(null);
  const chapterRef = useRef<HTMLSpanElement>(null);
  const hindiRef = useRef<HTMLSpanElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const buttonsRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    // Cinematic background drift and infinite breathing
    const bgTimeline = gsap.timeline();
    bgTimeline.fromTo(
      bgRef.current,
      { scale: 1.08 },
      { scale: 1, duration: 20, ease: "none" }
    ).to(bgRef.current, {
      scale: 1.02,
      duration: 15,
      ease: "sine.inOut",
      yoyo: true,
      repeat: -1
    });

    // ═══ Cinematic Reveal Sequence ═══
    const reveal = gsap.timeline({ delay: 0.4 });

    // 1. Chapter label — fade in first
    if (chapterRef.current) {
      reveal.fromTo(
        chapterRef.current,
        { opacity: 0, y: 10 },
        { opacity: 0.7, y: 0, duration: 1.4, ease: "power2.out" }
      );
    }

    // 2. Hindi line — fade in second, ethereal
    if (hindiRef.current) {
      reveal.fromTo(
        hindiRef.current,
        { opacity: 0, y: 15 },
        { opacity: 0.6, y: 0, duration: 1.8, ease: "power2.out" },
        "-=0.8"
      );
    }

    // 3. Main headline — split text reveal
    if (headlineRef.current) {
      const words = headlineRef.current.querySelectorAll('.word');
      reveal.fromTo(
        words,
        { y: 120, opacity: 0 },
        { y: 0, opacity: 1, duration: 1.4, stagger: 0.06, ease: "power4.out" },
        "-=0.6"
      );
    }

    // 4. Tagline — fade up
    if (subtitleRef.current) {
      reveal.fromTo(
        subtitleRef.current,
        { opacity: 0, y: 20 },
        { opacity: 0.9, y: 0, duration: 1.2, ease: "power2.out" },
        "-=0.6"
      );
    }

    // 5. CTA — appear last
    if (buttonsRef.current) {
      reveal.fromTo(
        buttonsRef.current,
        { opacity: 0, y: 15 },
        { opacity: 1, y: 0, duration: 1.0, ease: "power2.out" },
        "-=0.4"
      );
    }

    // Cinematic scroll away when Chapter 2 enters
    if (contentRef.current) {
      gsap.to(contentRef.current, {
        y: -100,
        opacity: 0,
        scale: 0.95,
        scrollTrigger: {
          trigger: "#chapter-family-kitchen", // Next section
          start: "top bottom", // When Chapter 2 touches the bottom of screen
          end: "top 40%", // When Chapter 2 is 40% up
          scrub: 1,
        }
      });
    }

    // Background transition as Chapter 2 enters
    gsap.to(bgRef.current, {
      scale: 1.1,
      opacity: 0.3,
      scrollTrigger: {
        trigger: "#chapter-family-kitchen",
        start: "top bottom",
        end: "top top",
        scrub: true,
      }
    });
  }, []);

  return (
    <section className="relative h-screen w-full flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div ref={bgRef} className="absolute inset-0 z-0">
        <Image
          src="/images/hero/hero-bg.png"
          alt="Bombay Bicycle Chef Interior"
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
        />
        {/* Cinematic treatments: Darken edges, vignette, and warmth */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/60 z-10" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/50 z-10" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0)_0%,rgba(0,0,0,0.6)_100%)] z-10 pointer-events-none" />
        <div className="absolute inset-0 mix-blend-overlay bg-[#5D0925] opacity-20 z-10" />

        {/* Candle Flicker Overlay */}
        <div className="absolute inset-0 bg-[#B08A3E] mix-blend-overlay z-10 pointer-events-none animate-flicker" />
        
        {/* Subtle Glow Pulse */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_60%,rgba(168,132,66,0.12)_0%,rgba(0,0,0,0)_60%)] z-10 pointer-events-none animate-glow" />

        {/* Floating Dust Particles */}
        <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden mix-blend-screen">
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
                opacity: 0,
              }}
            />
          ))}
        </div>

        <style dangerouslySetInnerHTML={{
          __html: `
          @keyframes warm-flicker {
            0%, 100% { opacity: 0.04; }
            10% { opacity: 0.08; }
            20% { opacity: 0.03; }
            30% { opacity: 0.07; }
            40% { opacity: 0.04; }
            50% { opacity: 0.09; }
            60% { opacity: 0.05; }
            70% { opacity: 0.11; }
            80% { opacity: 0.04; }
            90% { opacity: 0.07; }
          }
          .animate-flicker {
            animation: warm-flicker 5s infinite;
          }
          @keyframes subtle-pulse {
            0%, 100% { opacity: 0.5; transform: scale(1); }
            50% { opacity: 0.9; transform: scale(1.05); }
          }
          .animate-glow {
            animation: subtle-pulse 10s infinite ease-in-out;
          }
          @keyframes float-up {
            0% { transform: translateY(0) translateX(0); opacity: 0; }
            20% { opacity: 0.5; }
            80% { opacity: 0.5; }
            100% { transform: translateY(-120px) translateX(20px); opacity: 0; }
          }
          .dust-particle {
            position: absolute;
            background: radial-gradient(circle, rgba(245,240,230,0.5) 0%, rgba(245,240,230,0) 80%);
            border-radius: 50%;
            animation: float-up linear infinite;
          }
        `}} />
      </div>

      {/* Subtle dark gradient at the bottom */}
      <div
        className="absolute inset-0 z-20 pointer-events-none"
        style={{
          background: "linear-gradient(to bottom, transparent 70%, rgba(16,12,8,0.75) 100%)"
        }}
      />

      {/* Content */}
      <div
        ref={contentRef}
        className="relative z-30 w-full max-w-[1200px] mx-auto px-5 sm:px-8 md:px-12 pt-[10vh] sm:pt-[18vh] lg:pt-[26vh] pb-[3vh] sm:pb-[5vh] text-center flex flex-col items-center"
      >
        <div className="flex flex-col items-center">
          {/* Chapter Label */}
          <span
            ref={chapterRef}
            className="text-[#C8A96B] text-[0.75rem] tracking-[0.4em] font-normal uppercase mb-[5vh] font-sans block"
            style={{ opacity: 0 }}
          >
            Chapter I &middot; The Arrival
          </span>

          {/* Hindi Script */}
          <span
            ref={hindiRef}
            className="text-[#F3EEE8]/75 text-[15px] tracking-[0.08em] font-light mb-[6vh] block"
            style={{ opacity: 0 }}
          >
            कहानियाँ वहीं शुरू होती हैं<br className="sm:hidden" /> जहाँ लोग साथ बैठते हैं
          </span>

          {/* Heading */}
          <h1
            ref={headlineRef}
            className="font-serif text-[#F3EEE8] mb-[6vh] tracking-wide font-normal max-w-[900px] flex flex-col space-y-2 sm:space-y-4"
            style={{ fontSize: "clamp(1.75rem, 5.5vw, 5.8rem)", lineHeight: "1.15" }}
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
            className="text-[13px] lg:text-[15px] text-[#C8A96B] max-w-[500px] mx-auto mb-[4vh] font-sans tracking-[0.2em] font-normal uppercase"
            style={{ lineHeight: "2", opacity: 0 }}
          >
            Inspired By Bombay.<br className="sm:hidden" /> Made For London.
          </p>

          {/* CTA */}
          <div
            ref={buttonsRef}
            className="flex flex-col items-center justify-center gap-5 sm:gap-8 w-full sm:w-auto"
            style={{ opacity: 0 }}
          >
            <a
              href="#chapter-reservation"
              className="flex items-center justify-center h-[40px] sm:h-[44px] px-8 sm:px-10 rounded-none bg-[#5D0925] border border-[#5D0925] text-[#F8F4ED] text-[10px] sm:text-[11px] tracking-[0.18em] font-normal uppercase font-sans hover:bg-[#420616] hover:border-[#420616] transition-all duration-500"
            >
              Reserve A Table
            </a>

            <a
              href="#chapter-family-kitchen"
              className="group flex flex-col items-center gap-2 text-[#C8A96B]/50 hover:text-[#F5F0E6]/70 transition-colors duration-500"
            >
              <span className="text-[9px] sm:text-[10px] tracking-[0.25em] uppercase font-sans font-normal">Explore The Story</span>
              <span className="text-[11px] sm:text-[12px] group-hover:translate-y-1 transition-transform duration-300">↓</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
