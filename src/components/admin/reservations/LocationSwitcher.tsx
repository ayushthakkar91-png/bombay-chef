"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Select } from "@/components/admin/primitives";

/** Switches the `?loc=` query param, preserving the rest of the URL. */
export function LocationSwitcher({
  locations,
  current,
}: {
  locations: { id: string; slug: string; name: string }[];
  current: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  if (locations.length <= 1) {
    return <span className="text-sm font-medium text-text">{locations[0]?.name ?? "—"}</span>;
  }

  // `current` may be an id (legacy) or a slug — resolve to the matching slug.
  const currentSlug = locations.find((l) => l.slug === current || l.id === current)?.slug ?? locations[0].slug;

  return (
    <Select
      aria-label="Location"
      value={currentSlug}
      onChange={(e) => {
        const next = new URLSearchParams(params.toString());
        next.set("loc", e.target.value);
        router.push(`${pathname}?${next.toString()}`);
      }}
      className="w-44"
    >
      {locations.map((l) => (
        <option key={l.id} value={l.slug}>{l.name}</option>
      ))}
    </Select>
  );
}
