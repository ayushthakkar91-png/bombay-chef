"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { RANGE_PRESETS } from "@/lib/reports/range";
import { Select, cx } from "@/components/admin/primitives";

export function ReportFilters({
  locations,
  days,
  loc,
  showLocation = true,
}: {
  locations: { id: string; name: string }[];
  days: number;
  loc?: string;
  showLocation?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const setParam = (key: string, value: string) => {
    const p = new URLSearchParams(params.toString());
    if (value) p.set(key, value);
    else p.delete(key);
    router.push(`${pathname}?${p.toString()}`);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex overflow-hidden rounded-md border border-sand">
        {RANGE_PRESETS.map((d) => (
          <button
            key={d}
            onClick={() => setParam("days", String(d))}
            className={cx("px-3 py-2 text-sm", d === days ? "bg-primary text-on-dark" : "bg-surface text-body hover:bg-sand/50")}
          >
            {d === 365 ? "1y" : `${d}d`}
          </button>
        ))}
      </div>
      {showLocation && locations.length > 1 && (
        <Select value={loc ?? ""} onChange={(e) => setParam("loc", e.target.value)} className="w-44" aria-label="Location">
          <option value="">All locations</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </Select>
      )}
    </div>
  );
}
