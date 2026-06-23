"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Building2, CreditCard, BarChart3, ArrowLeft, Menu as MenuIcon, X } from "lucide-react";

import { logout } from "@/app/admin/_actions/auth";
import { cx } from "@/components/admin/primitives";

const NAV = [
  { href: "/platform", label: "Overview", icon: LayoutGrid, exact: true },
  { href: "/platform/tenants", label: "Tenants", icon: Building2 },
  { href: "/platform/billing", label: "Billing", icon: CreditCard },
  { href: "/platform/analytics", label: "Analytics", icon: BarChart3 },
];

export function PlatformShell({ children, email }: { children: React.ReactNode; email: string | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const active = (href: string, exact?: boolean) => (exact ? pathname === href : pathname === href || pathname.startsWith(href + "/"));

  return (
    <div className="min-h-screen bg-bg text-text">
      <header className="sticky top-0 z-30 border-b border-sand bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4">
          <button className="lg:hidden" onClick={() => setOpen((v) => !v)} aria-label="Menu">{open ? <X className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}</button>
          <Link href="/platform" className="flex items-center gap-2 font-serif text-lg text-text">Restaurant<span className="text-brass">OS</span></Link>
          <nav className="hidden items-center gap-1 lg:flex">
            {NAV.map((n) => {
              const Icon = n.icon;
              return <Link key={n.href} href={n.href} className={cx("flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors", active(n.href, n.exact) ? "bg-brass/10 text-brass" : "text-body hover:bg-sand/50")}><Icon className="h-4 w-4" />{n.label}</Link>;
            })}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <Link href="/admin" className="hidden items-center gap-1.5 text-sm text-body hover:text-primary sm:flex"><ArrowLeft className="h-4 w-4" /> Admin</Link>
            <span className="hidden text-xs text-body md:block">{email}</span>
            <form action={logout}><button className="rounded-md border border-sand px-3 py-1.5 text-sm text-body hover:bg-sand/50">Sign out</button></form>
          </div>
        </div>
        {open && (
          <nav className="border-t border-sand px-2 py-2 lg:hidden">
            {NAV.map((n) => { const Icon = n.icon; return <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className={cx("flex items-center gap-2 rounded-md px-3 py-2.5 text-sm", active(n.href, n.exact) ? "bg-brass/10 text-brass" : "text-body")}><Icon className="h-4 w-4" />{n.label}</Link>; })}
            <Link href="/admin" className="flex items-center gap-2 px-3 py-2.5 text-sm text-body"><ArrowLeft className="h-4 w-4" /> Back to admin</Link>
          </nav>
        )}
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
    </div>
  );
}
