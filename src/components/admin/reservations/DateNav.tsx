"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/admin/primitives";

/** Prev / next / today + date picker, driving the `?date=` param. */
export function DateNav({ date }: { date: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const go = (next: string) => {
    const p = new URLSearchParams(params.toString());
    p.set("date", next);
    router.push(`${pathname}?${p.toString()}`);
  };

  const shift = (days: number) => {
    const d = new Date(`${date}T12:00:00`);
    d.setDate(d.getDate() + days);
    go(d.toISOString().slice(0, 10));
  };

  const today = new Date();
  const todayISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  return (
    <div className="flex items-center gap-2">
      <Button variant="secondary" onClick={() => shift(-1)} aria-label="Previous day"><ChevronLeft className="h-4 w-4" /></Button>
      <input
        type="date"
        value={date}
        onChange={(e) => e.target.value && go(e.target.value)}
        className="rounded-md border border-sand bg-surface px-3 py-2 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass"
      />
      <Button variant="secondary" onClick={() => shift(1)} aria-label="Next day"><ChevronRight className="h-4 w-4" /></Button>
      <Button variant="ghost" onClick={() => go(todayISO)}>Today</Button>
    </div>
  );
}
