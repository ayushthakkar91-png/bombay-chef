"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/account/_actions/auth";
import { flags } from "@/lib/flags";

const TABS = [
  { href: "/account", label: "Overview" },
  { href: "/account/orders", label: "Orders" },
  { href: "/account/reservations", label: "Reservations" },
  ...(flags.loyalty ? [{ href: "/account/rewards", label: "Rewards" }] : []),
  { href: "/account/gift-cards", label: "Gift cards" },
  { href: "/account/addresses", label: "Addresses" },
  { href: "/account/favourites", label: "Favourites" },
  { href: "/account/preferences", label: "Preferences" },
];

function active(pathname: string, href: string): boolean {
  return href === "/account" ? pathname === "/account" : pathname.startsWith(href);
}

export function AccountShell({ name, children }: { name: string | null; children: React.ReactNode }) {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);

  // On mobile the tab bar scrolls horizontally; make sure the active tab is
  // brought into view so it's never hidden off-screen (e.g. Preferences).
  useEffect(() => {
    const el = navRef.current?.querySelector('[data-active="true"]');
    el?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [pathname]);

  return (
    <main className="min-h-screen bg-[#F6F2EA] pt-[92px] lg:pt-[104px] pb-24 px-5 lg:px-8">
      <div className="max-w-[1000px] mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
          <div>
            <p className="text-[#B08A3E] text-[12px] tracking-[0.25em] uppercase font-sans font-semibold mb-2">Your Account</p>
            <h1 className="font-serif text-[34px] lg:text-[44px] text-[#2B221D] font-light leading-none">
              {name ? `Hello, ${name.split(" ")[0]}` : "Your Account"}
            </h1>
          </div>
          <form action={logout}>
            <button type="submit" className="inline-flex min-h-[44px] items-center py-2 -my-2 text-[#2B221D] text-[12px] uppercase tracking-[0.15em] font-sans hover:text-[#B08A3E] transition-colors">
              Sign out
            </button>
          </form>
        </div>

        {/* Section nav — horizontal scroll on mobile, with a right-edge fade so
            it reads as scrollable and the active tab auto-centres (see effect). */}
        <div className="relative mb-8">
          <nav ref={navRef} className="flex gap-1 overflow-x-auto hide-scrollbar border-b border-[#2A211C]/10 scroll-px-4">
            {TABS.map((t) => {
              const on = active(pathname, t.href);
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  data-active={on}
                  aria-current={on ? "page" : undefined}
                  className={`flex min-h-[44px] items-center whitespace-nowrap px-4 text-[14px] font-sans tracking-[0.05em] transition-colors border-b-2 -mb-px ${
                    on ? "border-[#B08A3E] text-[#B08A3E]" : "border-transparent text-[#5A524B] hover:text-[#2B221D]"
                  }`}
                >
                  {t.label}
                </Link>
              );
            })}
          </nav>
          {/* Fade hint (mobile only) that more tabs lie to the right. */}
          <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-[#F6F2EA] to-transparent sm:hidden" />
        </div>

        {children}
      </div>
    </main>
  );
}
