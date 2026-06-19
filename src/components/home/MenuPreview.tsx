"use client";

import { useRef } from "react";
import { gsap } from "@/utils/gsap";
import { useGSAP } from "@gsap/react";
import Link from "next/link";
import { motion } from "framer-motion";

const MENUS = [
  { name: "Dine-In Menu", description: "Our signature dishes, meant to be shared.", link: "/menu" },
  { name: "Takeaway Menu", description: "The Bombay experience, enjoyed at home.", link: "https://www.bombaybicyclechef.uk/locator" },
  { name: "Private Dining", description: "Bespoke feasting for intimate gatherings.", link: "/reservations" },
  { name: "Catering", description: "Bringing our fire to your events.", link: "/contact" }
];

export function MenuPreview() {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (contentRef.current) {
      gsap.fromTo(
        contentRef.current.children,
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 1.2,
          stagger: 0.15,
          ease: "power3.out",
          scrollTrigger: {
            trigger: containerRef.current,
            start: "top 70%",
          }
        }
      );
    }
  }, []);

  return (
    <section ref={containerRef} className="bg-[#F5F0E6] w-full pt-20 pb-20 lg:pt-[140px] lg:pb-[140px] px-6 border-t border-[rgba(43,36,29,0.05)]">
      <div className="max-w-[1000px] mx-auto text-center" ref={contentRef}>
        
        <span className="text-[#A88442] text-[11px] tracking-[0.35em] font-normal uppercase mb-8 font-sans block">
          Chapter V &middot; The Dining Experience
        </span>
        
        <h2 className="text-[36px] md:text-[48px] lg:text-[64px] font-serif text-[#2B241D] leading-[1.15] mb-16">
          A Menu Written<br />In Spice And Smoke
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-16 text-left mb-20 max-w-[800px] mx-auto">
          {MENUS.map((menu, i) => (
            <motion.div 
              key={i} 
              className="group flex flex-col border-b border-[rgba(43,36,29,0.1)] pb-8"
              whileHover={{ x: 10 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              <Link href={menu.link} className="flex flex-col h-full">
                <h3 className="text-2xl lg:text-3xl font-serif text-[#2B241D] mb-3 group-hover:text-[#A88442] transition-colors duration-300">
                  {menu.name}
                </h3>
                <p className="text-[16px] text-[#5E564D] font-sans leading-[1.7] mb-6">
                  {menu.description}
                </p>
                <div className="mt-auto text-[#2B241D] text-[12px] tracking-[0.15em] font-bold uppercase font-sans flex items-center group-hover:text-[#A88442] transition-colors duration-300">
                  Explore <span className="ml-2">→</span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        <div>
          <Link
            href="/menu"
            className="inline-flex items-center justify-center h-[52px] px-10 border border-[rgba(43,36,29,0.2)] text-[#2B241D] text-[13px] tracking-[0.15em] font-medium uppercase font-sans hover:bg-[#2B241D] hover:text-[#F5F0E6] transition-all duration-500"
          >
            View Full Menu
          </Link>
        </div>

      </div>
    </section>
  );
}
