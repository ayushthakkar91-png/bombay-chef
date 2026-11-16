"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { Menu } from "lucide-react";
import { useOrderHref } from "@/components/order/OrderEntry";
import { LEFT_LINKS } from "./navbar-links";

/**
 * Fetched when the menu is first opened.
 *
 * Framer Motion was the heaviest single thing the site shipped — 36KB of its
 * 40KB unused on the ordering menu, per Lighthouse — and the navbar was the
 * only reason it reached every page. Nothing above the fold animates with it.
 */
const NavbarMobileMenu = dynamic(() => import("./NavbarMobileMenu").then((m) => m.NavbarMobileMenu));

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const orderHref = useOrderHref();

  // Light-background pages need the solid cream navbar (dark text) even at the top,
  // otherwise the transparent light-text navbar is invisible against them.
  const isDarkTheme =
    isScrolled ||
    pathname === '/contact' ||
    pathname === '/privacy' ||
    pathname === '/terms' ||
    pathname?.startsWith('/locations') ||
    pathname?.startsWith('/reservations') ||
    pathname?.startsWith('/order') ||
    pathname?.startsWith('/gift') ||
    pathname?.startsWith('/indian-restaurant') ||
    pathname?.startsWith('/account');

  useEffect(() => {
    // Passive: otherwise the browser must wait to see whether this handler calls
    // preventDefault before it may scroll, which stutters every frame on mobile.
    // rAF-coalesced so a burst of scroll events causes one setState per frame.
    let frame = 0;
    const handleScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        setIsScrolled(window.scrollY > 50);
      });
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => { if (frame) cancelAnimationFrame(frame); window.removeEventListener("scroll", handleScroll); };
  }, []);

  // Lock page scroll only while the mobile menu is open, and ALWAYS release it when
  // the menu closes, the route changes or the navbar unmounts — so the page can
  // never be left unscrollable (e.g. pressing Back with the menu still open).
  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  // Close the mobile menu whenever the route changes.
  const [menuPath, setMenuPath] = useState(pathname);
  if (menuPath !== pathname) {
    setMenuPath(pathname);
    if (isMobileMenuOpen) setIsMobileMenuOpen(false);
  }

  const toggleMobileMenu = () => setIsMobileMenuOpen((prev) => !prev);

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-700 ease-in-out border-b ${isDarkTheme
          ? "bg-[#F5F0E6] border-[rgba(43,36,29,0.08)] shadow-[0_4px_20px_rgba(0,0,0,0.02)]"
          : "bg-transparent border-[rgba(245,240,230,0.08)]"
          }`}
      >
        <div className="w-full px-6 md:px-12 lg:px-16">
          <nav className="relative flex justify-between items-center h-[84px] lg:h-[88px]" aria-label="Main Navigation">

            <div className="flex-1 lg:hidden" />

            {/* Desktop Left Links */}
            <div className="hidden lg:flex items-center space-x-10 xl:space-x-14 flex-1">
              {LEFT_LINKS.map((link) => (
                <div key={link.name} className="flex items-center">
                  <Link
                    href={link.href}
                    className={`text-[11px] tracking-[0.2em] font-medium uppercase transition-colors duration-300 ease-in-out relative group whitespace-nowrap ${isDarkTheme ? "text-[#2B241D]/70 hover:text-[#2B241D]" : "text-[#F5F0E6]/60 hover:text-[#F5F0E6]"
                      }`}
                  >
                    {link.name}
                    {/* Underline grows from center */}
                    <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-[1px] bg-[#B08A3E] transition-all duration-300 ease-in-out group-hover:w-full opacity-0 group-hover:opacity-100"></span>
                  </Link>
                </div>
              ))}
            </div>

            {/* Center Brand Lockup — Logo mark only */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
              <Link href="/" aria-label="Bombay Bicycle Chef — home" className="group flex items-center cursor-pointer">
                <div
                  className={`w-[48px] h-[58px] lg:w-[40px] lg:h-[48px] transition-colors duration-500 ${isDarkTheme ? "bg-[#2B241D]" : "bg-[#F5F0E6]"
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
              </Link>
            </div>

            {/* Desktop Right CTAs */}
            <div className="hidden lg:flex items-center justify-end gap-6 xl:gap-8 flex-1 pr-4">
              <div className="flex items-center">
                <Link
                  href="/reservations"
                  className={`flex items-center justify-center px-6 h-[40px] text-[10px] xl:text-[11px] tracking-[0.2em] font-medium uppercase font-sans whitespace-nowrap border transition-all duration-500 ease-in-out ${isDarkTheme
                    ? "border-[rgba(43,36,29,0.2)] text-[#2B241D]/80 hover:bg-[#2B241D] hover:text-[#F5F0E6] hover:border-[#2B241D]"
                    : "border-[rgba(245,240,230,0.3)] text-[#F5F0E6]/80 hover:bg-[#F5F0E6] hover:text-[#2B241D] hover:border-[#F5F0E6]"
                    }`}
                >
                  Reserve Table
                </Link>
              </div>
              <div className="flex items-center">
                <Link
                  href={orderHref}
                  className="flex items-center justify-center px-6 h-[40px] bg-[#5D0925] border border-[#5D0925] text-[#F8F4ED] text-[10px] xl:text-[11px] tracking-[0.2em] font-medium uppercase font-sans whitespace-nowrap hover:bg-[#420616] hover:border-[#420616] transition-all duration-500 ease-in-out"
                >
                  Order Online
                </Link>
              </div>
            </div>

            {/* Mobile Menu Toggle Button */}
            <div className="lg:hidden flex items-center justify-end flex-1">
              <button
                onClick={toggleMobileMenu}
                aria-expanded={isMobileMenuOpen}
                aria-label="Toggle menu"
                className={`p-2 focus:outline-none transition-colors duration-500 ${isDarkTheme ? "text-[#2B241D]" : "text-[#F5F0E6]"
                  }`}
              >
                <Menu size={28} strokeWidth={1} />
              </button>
            </div>
          </nav>
        </div>
      </header>

      {/* Mobile menu. Loaded on first open, so its animation library is not
          shipped to every visitor for a panel most never tap. */}
      <NavbarMobileMenu open={isMobileMenuOpen} onClose={toggleMobileMenu} orderHref={orderHref} />
    </>
  );
}
