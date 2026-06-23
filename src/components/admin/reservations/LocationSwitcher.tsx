"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Select } from "@/components/admin/primitives";

/** Switches the `?loc=` query param, preserving the rest of the URL. */
export function LocationSwitcher({
  locations,
  current,
}: {
  locations: { id: string; name: string }[];
  current: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  if (locations.length <= 1) {
    return <span className="text-sm font-medium text-text">{locations[0]?.name ?? "—"}</span>;
  }

  return (
    <Select
      aria-label="Location"
      value={current}
      onChange={(e) => {
        const next = new URLSearchParams(params.toString());
        next.set("loc", e.target.value);
        router.push(`${pathname}?${next.toString()}`);
      }}
      className="w-44"
    >
      {locations.map((l) => (
        <option key={l.id} value={l.id}>{l.name}</option>
      ))}
    </Select>
  );
}
