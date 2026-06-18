"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { Menu, X } from "lucide-react";
import { gsap } from "@/utils/gsap";
import { useGSAP } from "@gsap/react";

const LEFT_LINKS = [
  { name: "Menu", href: "#chapter-signature-dishes" },
  { name: "Locations", href: "#chapter-locations" },
  { name: "Our Story", href: "#chapter-family-kitchen" },
];

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);

  useGSAP(() => {
    if (navRef.current) {
      gsap.fromTo(
        navRef.current,
        { y: -100, opacity: 0 },
        { y: 0, opacity: 1, duration: 1.2, ease: "power3.out" }
      );
    }
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen((prev) => !prev);
    if (!isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
  };

  // Framer Motion Variants for Premium Feel
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.1 },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: -10 },
    show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } },
  };

  const logoVariants: Variants = {
    hidden: { opacity: 0, scale: 0.95 },
    show: { opacity: 1, scale: 1, transition: { duration: 1.2, ease: [0.16, 1, 0.3, 1] } },
  };

  const buttonVariants: Variants = {
    hidden: { opacity: 0, x: 20 },
    show: { opacity: 1, x: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } },
  };

  return (
    <>
      <header
        ref={navRef}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-700 ease-in-out border-b ${
          isScrolled
            ? "bg-[#F5F0E6] border-[rgba(43,36,29,0.08)] shadow-[0_4px_20px_rgba(0,0,0,0.02)]"
            : "bg-transparent border-[rgba(245,240,230,0.08)]"
        }`}
      >
        <div className="w-full px-6 md:px-12 lg:px-16">
          {/* Height increased to 110px to accommodate the taller logo lockup with elegant breathing room */}
          <nav className="relative flex justify-between items-center h-[90px] lg:h-[110px] py-[16px]" aria-label="Main Navigation">
            
            <div className="flex-1 lg:hidden" />

            {/* Desktop Left Links */}
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="hidden lg:flex items-center space-x-10 xl:space-x-14 flex-1"
            >
              {LEFT_LINKS.map((link) => (
                <motion.div key={link.name} variants={itemVariants} className="flex items-center">
                  <Link
                    href={link.href}
                    className={`text-[14px] tracking-[0.08em] font-medium uppercase transition-colors duration-300 ease-in-out relative group whitespace-nowrap ${
                      isScrolled ? "text-[#2B241D] hover:text-[#A88442]" : "text-[#F5F0E6] hover:text-[#A88442]"
                    }`}
                  >
                    {link.name}
                    {/* Underline grows from center */}
                    <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-[1px] bg-[#A88442] transition-all duration-300 ease-in-out group-hover:w-full opacity-0 group-hover:opacity-100"></span>
                  </Link>
                </motion.div>
              ))}
            </motion.div>

            {/* Center Brand Lockup */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center">
              <Link href="/" className="group flex flex-col items-center cursor-pointer">
                <motion.div 
                  variants={logoVariants}
                  initial="hidden"
                  animate="show"
                  className={`w-[36px] h-[42px] lg:w-[44px] lg:h-[52px] transition-colors duration-500 mb-2 ${
                    isScrolled ? "bg-[#2B241D]" : "bg-[#F5F0E6]"
                  }`}
                  style={{
                    WebkitMaskImage: "url('/images/brand/logo.svg')",
                    maskImage: "url('/images/brand/logo.svg')",
                    WebkitMaskSize: "contain",
                    maskSize: "contain",
                    WebkitMaskRepeat: "no-repeat",
                    maskRepeat: "no-repeat",
                    WebkitMaskPosition: "center",
                    maskPosition: "center",
                  }}
                  aria-hidden="true"
                />
                <motion.div 
                  variants={logoVariants}
                  initial="hidden"
                  animate="show"
                  className="flex flex-col items-center text-center mt-1"
                >
                  <span className={`font-serif text-[1.1rem] lg:text-[1.2rem] tracking-[0.2em] uppercase leading-none transition-colors duration-500 ${
                    isScrolled ? "text-[#2B241D]" : "text-[#F5F0E6]"
                  }`}>
                    Bombay Bicycle Chef
                  </span>
                  <span className={`font-sans text-[0.6rem] tracking-[0.25em] uppercase font-medium mt-1.5 transition-colors duration-500 ${
                    isScrolled ? "text-[#A88442]" : "text-[#A88442]/90"
                  }`}>
                    Modern Indian Kitchen
                  </span>
                </motion.div>
              </Link>
            </div>

            {/* Desktop Right CTAs */}
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="hidden lg:flex items-center justify-end space-x-5 flex-1"
            >
              <motion.div variants={buttonVariants} whileHover={{ y: -2 }} transition={{ duration: 0.3 }} className="flex items-center">
                <Link
                  href="#chapter-reservation"
                  className={`flex items-center justify-center h-[42px] px-6 rounded-full text-[12px] tracking-[0.12em] font-medium uppercase font-sans whitespace-nowrap border transition-all duration-300 ease-in-out ${
                    isScrolled 
                      ? "border-[rgba(43,36,29,0.15)] text-[#2B241D] hover:bg-[#2B241D] hover:text-[#F5F0E6] hover:border-[#2B241D]" 
                      : "border-[rgba(245,240,230,0.35)] text-[#F5F0E6] hover:bg-[#F5F0E6] hover:text-[#2B241D] hover:border-[#F5F0E6]"
                  }`}
                >
                  Reserve Table
                </Link>
              </motion.div>
              <motion.div variants={buttonVariants} whileHover={{ y: -2 }} transition={{ duration: 0.3 }} className="flex items-center">
                <Link
                  href="https://www.bombaybicyclechef.uk/locator"
                  className="flex items-center justify-center h-[42px] px-6 rounded-full bg-[#5D0925] text-[#F5F0E6] text-[12px] tracking-[0.12em] font-medium uppercase font-sans whitespace-nowrap border border-[#5D0925] hover:bg-[#420616] hover:border-[#420616] transition-all duration-300"
                >
                  Order Online
                </Link>
              </motion.div>
            </motion.div>

            {/* Mobile Menu Toggle Button */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="lg:hidden flex items-center justify-end flex-1"
            >
              <button
                onClick={toggleMobileMenu}
                aria-expanded={isMobileMenuOpen}
                aria-label="Toggle menu"
                className={`p-2 focus:outline-none transition-colors duration-500 ${
                  isScrolled ? "text-[#2B241D]" : "text-[#F5F0E6]"
                }`}
              >
                <Menu size={28} strokeWidth={1.5} />
              </button>
            </motion.div>
          </nav>
        </div>
      </header>

      {/* Mobile Full-Screen Slide-Down Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: "-100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "-100%" }}
            transition={{ type: "tween", ease: [0.16, 1, 0.3, 1], duration: 0.7 }}
            className="fixed inset-0 z-[60] bg-[#F5F0E6] flex flex-col"
          >
            {/* Mobile Menu Header */}
            <div className="relative px-6 md:px-12 h-[80px] flex justify-between items-center w-full">
              <div className="flex-1" />

              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
                <Link href="/" className="flex flex-col items-center" onClick={toggleMobileMenu}>
                  <div 
                    className="w-[36px] h-[42px] bg-[#2B241D] mb-2"
                    style={{
                      WebkitMaskImage: "url('/images/brand/logo.svg')",
                      maskImage: "url('/images/brand/logo.svg')",
                      WebkitMaskSize: "contain",
                      maskSize: "contain",
                      WebkitMaskRepeat: "no-repeat",
                      maskRepeat: "no-repeat",
                      WebkitMaskPosition: "center",
                      maskPosition: "center",
                    }}
                    aria-hidden="true"
                  />
                  <div className="flex flex-col items-center text-center mt-1">
                    <span className="font-serif text-[1.1rem] tracking-[0.2em] uppercase leading-none text-[#2B241D]">
                      Bombay Bicycle Chef
                    </span>
                    <span className="font-sans text-[0.6rem] tracking-[0.25em] uppercase font-medium mt-1.5 text-[#A88442]">
                      Modern Indian Kitchen
                    </span>
                  </div>
                </Link>
              </div>

              <div className="flex justify-end flex-1">
                <button
                  onClick={toggleMobileMenu}
                  aria-label="Close menu"
                  className="p-2 text-[#2B241D] hover:text-[#A88442] transition-colors duration-300 focus:outline-none -mr-2"
                >
                  <X size={28} strokeWidth={1.5} />
                </button>
              </div>
            </div>

            {/* Mobile Menu Links */}
            <nav className="flex-grow flex flex-col items-center justify-center space-y-10 px-6">
              <ul className="flex flex-col items-center space-y-8 w-full">
                {LEFT_LINKS.map((link, index) => (
                  <motion.li
                    key={link.name}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + index * 0.05, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <Link
                      href={link.href}
                      onClick={toggleMobileMenu}
                      className="text-xl md:text-2xl font-serif tracking-widest uppercase text-[#2B241D] hover:text-[#A88442] transition-colors duration-300 ease-in-out"
                    >
                      {link.name}
                    </Link>
                  </motion.li>
                ))}
              </ul>

              {/* Mobile CTA Buttons */}
              <motion.div 
                className="pt-12 flex flex-col space-y-4 w-full max-w-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              >
                <Link
                  href="#chapter-reservation"
                  onClick={toggleMobileMenu}
                  className="w-full h-[46px] flex items-center justify-center border border-[rgba(43,36,29,0.15)] text-[#2B241D] text-[12px] tracking-[0.12em] font-medium uppercase hover:bg-[#2B241D] hover:text-[#F5F0E6] transition-all duration-300 ease-in-out"
                >
                  Reserve Table
                </Link>
                <Link
                  href="https://www.bombaybicyclechef.uk/locator"
                  onClick={toggleMobileMenu}
                  className="w-full h-[46px] flex items-center justify-center bg-[#5D0925] border border-[#5D0925] text-[#F5F0E6] text-[12px] tracking-[0.12em] font-medium uppercase hover:bg-[#420616] hover:border-[#420616] transition-colors duration-300 shadow-md ease-in-out"
                >
                  Order Online
                </Link>
              </motion.div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
