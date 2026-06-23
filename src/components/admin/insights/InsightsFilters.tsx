"use client";

import { useRouter } from "next/navigation";

const SELECT = "rounded-md border border-sand bg-surface px-3 py-2 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass";
const PERIODS = [{ d: "7", label: "7 days" }, { d: "30", label: "30 days" }, { d: "90", label: "90 days" }, { d: "365", label: "12 months" }];

export function InsightsFilters({ basePath, locations, currentLoc, currentDays }: { basePath: string; locations: { id: string; name: string }[]; currentLoc?: string; currentDays: number }) {
  const router = useRouter();
  const go = (days: string, loc: string) => router.push(`${basePath}?days=${days}${loc ? `&loc=${loc}` : ""}`);

  return (
    <div className="flex items-center gap-2">
      <select aria-label="Period" defaultValue={String(currentDays)} onChange={(e) => go(e.target.value, currentLoc ?? "")} className={SELECT}>
        {PERIODS.map((p) => <option key={p.d} value={p.d}>{p.label}</option>)}
      </select>
      {locations.length > 1 && (
        <select aria-label="Location" defaultValue={currentLoc ?? ""} onChange={(e) => go(String(currentDays), e.target.value)} className={SELECT}>
          <option value="">All locations</option>
          {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      )}
    </div>
  );
}
