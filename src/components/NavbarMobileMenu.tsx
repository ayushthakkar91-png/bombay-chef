"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { LEFT_LINKS } from "./navbar-links";

/**
 * The full-screen mobile menu.
 *
 * Split out of the navbar so its animation library is fetched when somebody
 * opens the menu, not on every page load. Framer Motion was the single
 * heaviest thing the site shipped — Lighthouse measured 36KB of its 40KB going
 * unused on the ordering menu — and it was there only for this panel, which is
 * closed until tapped, and never on a desktop.
 *
 * The navbar itself keeps the button; only the panel lives here.
 */
export function NavbarMobileMenu({ open, onClose, orderHref }: { open: boolean; onClose: () => void; orderHref: string }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: "-100%" }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: "-100%" }}
          transition={{ type: "tween", ease: [0.16, 1, 0.3, 1], duration: 0.7 }}
          className="fixed inset-0 z-[60] bg-[#F5F0E6] flex flex-col"
        >
          {/* Mobile Menu Header */}
          <div className="relative px-6 md:px-12 h-[130px] flex justify-between items-center w-full pt-8">
            <div className="flex-1" />

            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center w-max">
              <Link href="/" aria-label="Bombay Bicycle Chef — home" className="flex flex-col items-center" onClick={onClose}>
                <div
                  className="w-[60px] h-[70px] bg-[#2B241D] mb-2"
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
                <div className="flex flex-col items-center text-center mt-1 w-max">
                  <span className="whitespace-nowrap font-serif text-[1rem] sm:text-[1.1rem] tracking-[0.15em] sm:tracking-[0.2em] uppercase leading-none text-[#2B241D]">
                    Bombay Bicycle Chef
                  </span>
                </div>
              </Link>
            </div>

            <div className="flex justify-end flex-1">
              <button
                onClick={onClose}
                aria-label="Close menu"
                className="p-2 text-[#2B241D] hover:text-[#806515] transition-colors duration-300 focus:outline-none -mr-2"
              >
                <X size={28} strokeWidth={1} />
              </button>
            </div>
          </div>

          {/* Mobile Menu Links */}
          <nav className="flex-grow flex flex-col items-center justify-center px-6 pb-12">
            <ul className="flex flex-col items-center space-y-6 w-full">
              {LEFT_LINKS.map((link, index) => (
                <motion.li
                  key={link.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + index * 0.05, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Link
                    href={link.href}
                    onClick={onClose}
                    className="text-[22px] font-serif tracking-[0.15em] uppercase text-[#2B241D] hover:text-[#806515] transition-colors duration-300 ease-in-out"
                  >
                    {link.name}
                  </Link>
                </motion.li>
              ))}
            </ul>

            {/* Mobile CTA Buttons */}
            <motion.div
              className="mt-12 flex flex-col space-y-4 w-full max-w-[280px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <Link
                href="/reservations"
                onClick={onClose}
                className="w-full h-[46px] flex items-center justify-center border border-[rgba(43,36,29,0.15)] text-[#2B241D] text-[12px] tracking-[0.12em] font-medium uppercase hover:bg-[#2B241D] hover:text-[#F5F0E6] transition-all duration-300 ease-in-out"
              >
                Reserve Table
              </Link>
              <Link
                href={orderHref}
                onClick={onClose}
                className="w-full h-[46px] flex items-center justify-center bg-[#5D0925] border border-[#5D0925] text-[#F5F0E6] text-[12px] tracking-[0.12em] font-medium uppercase hover:bg-[#420616] hover:border-[#420616] transition-colors duration-300 shadow-md ease-in-out"
              >
                Order Online
              </Link>
            </motion.div>
          </nav>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
