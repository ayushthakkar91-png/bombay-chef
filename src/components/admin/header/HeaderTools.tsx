"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, Plus, Bell, MapPin, CalendarDays, ShoppingBag, UtensilsCrossed, Gift, Send, ChevronDown, Award, User, CornerDownLeft } from "lucide-react";

import { globalSearch, type SearchHit } from "@/app/admin/_actions/search";
import { getNotifications } from "@/app/admin/_actions/notifications";
import type { ActivityItem } from "@/lib/repositories/dashboard";
import { cx } from "@/components/admin/primitives";

const at = (iso: string) => new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

const GROUP_ICON: Record<string, typeof Search> = { Orders: ShoppingBag, Reservations: CalendarDays, Customers: User, Loyalty: Award, Dishes: UtensilsCrossed, "Gift cards": Gift };

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="px-4 py-10 text-center text-sm text-body/70">{children}</p>;
}

/* ---- Global search (⌘K) ----------------------------------------------- */

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [active, setActive] = useState(0);
  const [pending, start] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen(true); }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 30); }, [open]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => start(async () => { setHits(await globalSearch(q)); setActive(0); }), 200);
    return () => clearTimeout(t);
  }, [q, open]);

  const go = (h: SearchHit) => { setOpen(false); setQ(""); router.push(h.href); };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Search"
        className="group flex h-9 items-center gap-2.5 rounded-lg border border-sand bg-bg/50 px-2.5 text-sm transition-colors hover:border-brass/50 hover:bg-surface sm:w-72 sm:px-3"
      >
        <Search className="h-4 w-4 shrink-0 text-body/60 transition-colors group-hover:text-brass" />
        <span className="hidden flex-1 text-left text-body/70 sm:inline">Search orders, customers…</span>
        <kbd className="hidden shrink-0 rounded border border-sand bg-surface px-1.5 py-0.5 font-sans text-[10px] font-medium text-body/60 sm:inline-block">⌘K</kbd>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]" role="dialog" aria-modal>
          <div className="absolute inset-0 bg-text/40 backdrop-blur-[2px]" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-sand bg-surface shadow-2xl ring-1 ring-text/5">
            <div className="flex items-center gap-3 border-b border-sand px-4">
              <Search className="h-4.5 w-4.5 shrink-0 text-brass" />
              <input
                ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(hits.length - 1, i + 1)); }
                  if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(0, i - 1)); }
                  if (e.key === "Enter" && hits[active]) go(hits[active]);
                }}
                placeholder="Search orders, bookings, customers, dishes, gift cards…"
                className="w-full bg-transparent py-4 text-[15px] text-text outline-none placeholder:text-body/50"
              />
              <kbd className="hidden shrink-0 rounded border border-sand bg-bg px-1.5 py-0.5 text-[10px] text-body/60 sm:inline-block">Esc</kbd>
            </div>

            <div className="max-h-[54vh] overflow-y-auto p-2">
              {q.length < 2 ? <Hint>Type at least 2 characters to search…</Hint>
                : pending && hits.length === 0 ? <Hint>Searching…</Hint>
                : hits.length === 0 ? <Hint>No matches for “{q}”.</Hint>
                : hits.map((h, i) => {
                  const newGroup = i === 0 || hits[i - 1].group !== h.group;
                  const Icon = GROUP_ICON[h.group] ?? Search;
                  return (
                    <div key={i}>
                      {newGroup && <p className="px-2.5 pb-1 pt-2.5 font-sans text-[11px] font-semibold uppercase tracking-wider text-body/60">{h.group}</p>}
                      <button onMouseEnter={() => setActive(i)} onClick={() => go(h)} className={cx("flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors", i === active ? "bg-brass/10" : "hover:bg-bg/60")}>
                        <span className={cx("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", i === active ? "bg-brass/20 text-brass" : "bg-bg text-body/70")}><Icon className="h-4 w-4" /></span>
                        <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-text">{h.label}</span>{h.sub && <span className="block truncate text-xs text-body">{h.sub}</span>}</span>
                        {i === active && <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-body/50" />}
                      </button>
                    </div>
                  );
                })}
            </div>

            <div className="flex items-center gap-4 border-t border-sand bg-bg/40 px-4 py-2 text-[11px] text-body/60">
              <span className="flex items-center gap-1"><kbd className="rounded border border-sand bg-surface px-1">↑</kbd><kbd className="rounded border border-sand bg-surface px-1">↓</kbd> navigate</span>
              <span className="flex items-center gap-1"><kbd className="rounded border border-sand bg-surface px-1.5">↵</kbd> open</span>
              <span className="flex items-center gap-1"><kbd className="rounded border border-sand bg-surface px-1.5">esc</kbd> close</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ---- Quick actions ---------------------------------------------------- */

const QUICK = [
  { href: "/admin/reservations", label: "New reservation", icon: CalendarDays },
  { href: "/admin/orders/live", label: "New order", icon: ShoppingBag },
  { href: "/admin/menu/items", label: "Add dish", icon: UtensilsCrossed },
  { href: "/admin/giftcards", label: "Create gift card", icon: Gift },
  { href: "/admin/messaging/campaigns", label: "Send campaign", icon: Send },
];

export function QuickActions() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useOutside(ref, () => setOpen(false));
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-1.5 rounded-md bg-text px-3 py-1.5 text-sm text-bg transition-colors hover:bg-brass">
        <Plus className="h-4 w-4" /> <span className="hidden sm:inline">New</span>
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-56 overflow-hidden rounded-lg border border-sand bg-surface py-1 shadow-lg">
          {QUICK.map((a) => { const Icon = a.icon; return <Link key={a.href} href={a.href} onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-text hover:bg-bg/50"><Icon className="h-4 w-4 text-brass" /> {a.label}</Link>; })}
        </div>
      )}
    </div>
  );
}

/* ---- Notifications bell ------------------------------------------------ */

const N_ICON = { order: ShoppingBag, reservation: CalendarDays, giftcard: Gift, loyalty: Award } as const;

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [, start] = useTransition();
  const ref = useRef<HTMLDivElement>(null);
  useOutside(ref, () => setOpen(false));

  useEffect(() => {
    start(async () => {
      const data = await getNotifications();
      setItems(data);
      const seen = Number(localStorage.getItem("admin_notif_seen") ?? 0);
      setUnread(data.filter((d) => new Date(d.at).getTime() > seen).length);
    });
  }, []);

  const toggle = () => {
    setOpen((v) => {
      if (!v) { localStorage.setItem("admin_notif_seen", String(Date.now())); setUnread(0); }
      return !v;
    });
  };

  return (
    <div className="relative" ref={ref}>
      <button onClick={toggle} aria-label="Notifications" className="relative rounded-md p-2 text-body hover:bg-sand/50">
        <Bell className="h-5 w-5" />
        {unread > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-bg">{unread > 9 ? "9+" : unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-80 overflow-hidden rounded-lg border border-sand bg-surface shadow-lg">
          <div className="border-b border-sand px-4 py-2.5 text-sm font-semibold text-text">Notifications</div>
          <div className="max-h-[60vh] overflow-y-auto">
            {items.length === 0 ? <p className="px-4 py-6 text-center text-sm text-body">Nothing recent.</p>
              : items.map((n, i) => { const Icon = N_ICON[n.kind]; return (
                <div key={i} className="flex items-start gap-2.5 px-4 py-2.5 hover:bg-bg/40">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brass/10 text-brass"><Icon className="h-3.5 w-3.5" /></span>
                  <div className="min-w-0 flex-1"><p className="truncate text-sm text-text">{n.title}</p><p className="truncate text-xs text-body">{n.detail}</p></div>
                  <span className="shrink-0 text-[10px] text-body/60">{at(n.at)}</span>
                </div>
              ); })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---- Location switcher (persisted) ------------------------------------ */

export function HeaderLocation({ locations }: { locations: { id: string; name: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useOutside(ref, () => setOpen(false));

  const current = params.get("loc") ?? (typeof document !== "undefined" ? readCookie("admin_loc") : "") ?? "";
  const label = current ? locations.find((l) => l.id === current)?.name ?? "Location" : "All locations";

  const choose = (id: string) => {
    setOpen(false);
    document.cookie = `admin_loc=${id}; path=/; max-age=31536000`;
    const sp = new URLSearchParams(Array.from(params.entries()));
    if (id) sp.set("loc", id); else sp.delete("loc");
    router.push(`${pathname}?${sp.toString()}`);
  };

  if (locations.length < 2) return null;
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-1.5 rounded-md border border-sand px-3 py-1.5 text-sm text-body hover:bg-sand/40">
        <MapPin className="h-4 w-4" /> <span className="hidden max-w-[120px] truncate sm:inline">{label}</span> <ChevronDown className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-52 overflow-hidden rounded-lg border border-sand bg-surface py-1 shadow-lg">
          <button onClick={() => choose("")} className={cx("flex w-full px-4 py-2 text-left text-sm hover:bg-bg/50", !current ? "text-brass" : "text-text")}>All locations</button>
          {locations.map((l) => <button key={l.id} onClick={() => choose(l.id)} className={cx("flex w-full px-4 py-2 text-left text-sm hover:bg-bg/50", current === l.id ? "text-brass" : "text-text")}>{l.name}</button>)}
        </div>
      )}
    </div>
  );
}

/* ---- helpers ---------------------------------------------------------- */

function useOutside(ref: React.RefObject<HTMLElement | null>, fn: () => void) {
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) fn(); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [ref, fn]);
}

function readCookie(name: string): string {
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : "";
}
