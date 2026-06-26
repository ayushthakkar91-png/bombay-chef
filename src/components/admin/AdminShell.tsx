"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  UtensilsCrossed,
  FolderTree,
  ListOrdered,
  MapPin,
  ToggleRight,
  CalendarDays,
  CalendarRange,
  ClipboardList,
  Armchair,
  ShoppingBag,
  ChefHat,
  Clock,
  Users,
  Megaphone,
  Send,
  PieChart,
  Ticket,
  BadgePercent,
  BarChart3,
  PoundSterling,
  CalendarCheck,
  UserCheck,
  Mail,
  Gift,
  Gauge,
  CalendarClock,
  CalendarOff,
  UserCog,
  Package,
  Boxes,
  Trash2,
  Truck,
  FileText,
  Calculator,
  MessageSquare,
  MessageSquareText,
  Sparkles,
  LineChart,
  UsersRound,
  PackageSearch,
  Building2,
  Menu as MenuIcon,
  X,
  LogOut,
} from "lucide-react";

import { logout } from "@/app/admin/_actions/auth";
import { ROLE_LABEL, type Role } from "@/lib/auth/roles";
import { flags } from "@/lib/flags";
import { Badge, cx } from "./primitives";
import { GlobalSearch, QuickActions, NotificationsBell, HeaderLocation } from "./header/HeaderTools";

type NavItem = { href: string; label: string; icon: typeof LayoutDashboard; minRank: number };
type NavGroup = { heading?: string; items: NavItem[] };

// Reorganised into operational top-level sections. Every existing page is kept
// (no lost features, no dead links) — just regrouped for faster daily workflow.
const NAV: NavGroup[] = [
  {
    heading: "Operations",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard, minRank: 1 },
      { href: "/admin/operations", label: "Daily service", icon: Gauge, minRank: 2 },
      { href: "/admin/kitchen", label: "Kitchen", icon: ChefHat, minRank: 1 },
      { href: "/admin/orders", label: "Orders", icon: ShoppingBag, minRank: 1 },
      { href: "/admin/orders/live", label: "Live orders", icon: Clock, minRank: 1 },
      { href: "/admin/orders/history", label: "Order history", icon: ListOrdered, minRank: 1 },
    ],
  },
  {
    heading: "Customers",
    items: [
      { href: "/admin/reservations", label: "Reservations", icon: CalendarDays, minRank: 1 },
      { href: "/admin/reservations/calendar", label: "Calendar", icon: CalendarRange, minRank: 1 },
      { href: "/admin/reservations/waitlist", label: "Waitlist", icon: ClipboardList, minRank: 1 },
      { href: "/admin/reservations/tables", label: "Tables & hours", icon: Armchair, minRank: 2 },
      { href: "/admin/customers", label: "Customers", icon: Users, minRank: 3 },
      { href: "/admin/reports/loyalty", label: "Loyalty", icon: Sparkles, minRank: 3 },
      { href: "/admin/giftcards", label: "Gift cards", icon: Gift, minRank: 3 },
    ],
  },
  {
    heading: "Menu",
    items: [
      { href: "/admin/menu", label: "Overview", icon: UtensilsCrossed, minRank: 1 },
      { href: "/admin/menu/categories", label: "Categories", icon: FolderTree, minRank: 3 },
      { href: "/admin/menu/items", label: "Dishes", icon: UtensilsCrossed, minRank: 3 },
      { href: "/admin/menu/availability", label: "Availability", icon: ToggleRight, minRank: 1 },
    ],
  },
  {
    heading: "Marketing",
    items: [
      { href: "/admin/marketing", label: "CRM", icon: Megaphone, minRank: 3 },
      { href: "/admin/marketing/campaigns", label: "Campaigns", icon: Send, minRank: 3 },
      { href: "/admin/marketing/segments", label: "Segments", icon: PieChart, minRank: 3 },
      { href: "/admin/marketing/promotions", label: "Promotions", icon: Ticket, minRank: 3 },
      { href: "/admin/marketing/popup", label: "Offers Popup", icon: BadgePercent, minRank: 3 },
      { href: "/admin/messaging", label: "SMS & WhatsApp", icon: MessageSquare, minRank: 3 },
      { href: "/admin/messaging/templates", label: "Message templates", icon: MessageSquareText, minRank: 3 },
    ],
  },
  {
    heading: "Analytics",
    items: [
      { href: "/admin/reports", label: "Reports", icon: BarChart3, minRank: 3 },
      { href: "/admin/reports/sales", label: "Sales", icon: PoundSterling, minRank: 3 },
      { href: "/admin/reports/reservations", label: "Reservation reports", icon: CalendarCheck, minRank: 3 },
      { href: "/admin/reports/customers", label: "Customer reports", icon: UserCheck, minRank: 3 },
      { href: "/admin/reports/marketing", label: "Marketing reports", icon: Mail, minRank: 3 },
      { href: "/admin/insights", label: "AI insights", icon: LineChart, minRank: 3 },
      { href: "/admin/insights/customers", label: "Customer insights", icon: UsersRound, minRank: 3 },
      { href: "/admin/insights/inventory", label: "Inventory insights", icon: PackageSearch, minRank: 3 },
    ],
  },
  {
    heading: "Inventory",
    items: [
      { href: "/admin/inventory", label: "Overview", icon: Package, minRank: 1 },
      { href: "/admin/inventory/stock", label: "Stock", icon: Boxes, minRank: 1 },
      { href: "/admin/inventory/waste", label: "Waste", icon: Trash2, minRank: 1 },
      { href: "/admin/inventory/purchase-orders", label: "Purchase orders", icon: FileText, minRank: 2 },
      { href: "/admin/inventory/suppliers", label: "Suppliers", icon: Truck, minRank: 3 },
      { href: "/admin/inventory/costing", label: "Costing", icon: Calculator, minRank: 3 },
    ],
  },
  {
    heading: "Settings",
    items: [
      { href: "/admin/locations", label: "Locations", icon: MapPin, minRank: 2 },
      { href: "/admin/staff", label: "Staff", icon: UserCog, minRank: 2 },
      { href: "/admin/staff/shifts", label: "Schedule", icon: CalendarClock, minRank: 1 },
      { href: "/admin/staff/leave", label: "Leave", icon: CalendarOff, minRank: 1 },
      { href: "/platform", label: "SaaS Platform", icon: Building2, minRank: 4 },
    ],
  },
];

function isActive(pathname: string, href: string): boolean {
  // Exact match — these nav groups are flat, so a child route shouldn't also
  // light up its sibling parent (e.g. /admin/menu vs /admin/menu/items).
  return pathname === href;
}

export function AdminShell({
  children,
  user,
  rank,
  topRole,
  locations = [],
}: {
  children: React.ReactNode;
  user: { name: string | null; email: string | null };
  rank: number;
  topRole: Role;
  locations?: { id: string; slug: string; name: string }[];
}) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const nav = (
    <nav className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-3 py-4">
      {NAV.map((group, gi) => {
        const items = group.items.filter((i) => rank >= i.minRank && (i.href !== "/platform" || flags.platform));
        if (items.length === 0) return null;
        return (
          <div key={gi} className="flex flex-col gap-1">
            {group.heading && (
              <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-body/70">
                {group.heading}
              </p>
            )}
            {items.map((item) => {
              const active = isActive(pathname, item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setDrawerOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={cx(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-primary/8 font-medium text-primary"
                      : "text-body hover:bg-sand/50 hover:text-text",
                  )}
                >
                  <Icon className="h-4.5 w-4.5 shrink-0" strokeWidth={1.75} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        );
      })}
    </nav>
  );

  const brand = (
    <Link href="/admin" className="flex flex-col px-5 py-4" onClick={() => setDrawerOpen(false)}>
      <span className="font-serif text-lg leading-none text-text">Bombay Bicycle Chef</span>
      <span className="mt-1 text-[11px] uppercase tracking-[0.2em] text-brass">Management</span>
    </Link>
  );

  return (
    <div className="min-h-screen bg-bg text-text">
      {/* Desktop / tablet sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-sand bg-surface md:flex">
        {brand}
        <div className="border-t border-sand" />
        {nav}
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-text/40" onClick={() => setDrawerOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col border-r border-sand bg-surface">
            <div className="flex items-center justify-between pr-2">
              {brand}
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setDrawerOpen(false)}
                className="rounded-md p-2 text-body hover:bg-sand/60"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="border-t border-sand" />
            {nav}
          </aside>
        </div>
      )}

      {/* Main column */}
      <div className="md:pl-64">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-sand bg-surface/90 px-4 backdrop-blur supports-[backdrop-filter]:bg-surface/75 md:px-8">
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setDrawerOpen(true)}
            className="rounded-md p-2 text-body hover:bg-sand/60 md:hidden"
          >
            <MenuIcon className="h-5 w-5" />
          </button>

          <GlobalSearch />

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <HeaderLocation locations={locations} />
            <QuickActions />
            <NotificationsBell />
            <div className="hidden text-right lg:block">
              <p className="text-sm font-medium leading-tight text-text">{user.name ?? user.email ?? "Staff"}</p>
              <p className="text-xs leading-tight text-body">{ROLE_LABEL[topRole]}</p>
            </div>
            <span className="hidden sm:inline-flex"><Badge tone="accent">{ROLE_LABEL[topRole]}</Badge></span>
            <form action={logout}>
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-md border border-sand px-3 py-1.5 text-sm text-body transition-colors hover:bg-sand/50 hover:text-text"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </form>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
