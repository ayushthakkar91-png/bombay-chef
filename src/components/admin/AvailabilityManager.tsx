"use client";

import { useActionState, useMemo, useState } from "react";
import { Search, Lock } from "lucide-react";

import type { AvailabilityMatrix } from "@/lib/repositories/admin-locations";
import { IDLE } from "@/lib/admin/validation";
import { setLocationAvailability } from "@/app/admin/_actions/availability";
import { useActionResult } from "./useActionResult";
import { EmptyState, Select, TextInput, cx } from "./primitives";
import { Th } from "./ui";

/**
 * Per-location availability grid. A cell with no override is "available by
 * default"; toggling writes an explicit `location_menu_items` row. `editable`
 * is the set of location ids this staff member may change (null = all).
 */
export function AvailabilityManager({
  matrix,
  editable,
}: {
  matrix: AvailabilityMatrix;
  editable: string[] | null;
}) {
  const [query, setQuery] = useState("");
  const [catFilter, setCatFilter] = useState("");

  const categories = useMemo(
    () => Array.from(new Set(matrix.items.map((i) => i.categoryTitle))),
    [matrix.items],
  );

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return matrix.items.filter(
      (i) =>
        (catFilter === "" || i.categoryTitle === catFilter) &&
        (q === "" || i.name.toLowerCase().includes(q)),
    );
  }, [matrix.items, query, catFilter]);

  const canEdit = (locId: string) => editable === null || editable.includes(locId);

  if (matrix.locations.length === 0 || matrix.items.length === 0) {
    return (
      <EmptyState
        title="Nothing to schedule yet"
        description="Add at least one active location and one dish, then return here to 86 dishes per branch."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-body/60" />
          <TextInput placeholder="Search dishes…" value={query} onChange={(e) => setQuery(e.target.value)} className="w-56 pl-8" aria-label="Search dishes" />
        </div>
        <Select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} aria-label="Filter by category" className="w-44">
          <option value="">All categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
      </div>

      <div className="overflow-x-auto rounded-lg border border-sand bg-surface">
        <table className="w-full border-collapse">
          <thead className="border-b border-sand bg-bg/40">
            <tr>
              <Th className="sticky left-0 bg-bg/40">Dish</Th>
              {matrix.locations.map((l) => (
                <Th key={l.id} className="text-center">
                  <span className="inline-flex items-center gap-1">
                    {l.name}
                    {!canEdit(l.id) && <Lock className="h-3 w-3 text-body/50" aria-label="Read-only" />}
                  </span>
                </Th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-sand">
            {rows.map((item) => (
              <tr key={item.id} className="hover:bg-bg/30">
                <td className="sticky left-0 bg-surface px-4 py-2.5 text-sm">
                  <span className="font-medium text-text">{item.name}</span>
                  <span className="ml-2 text-xs text-body">{item.categoryTitle}</span>
                </td>
                {matrix.locations.map((loc) => {
                  const cell = matrix.cells[`${item.id}:${loc.id}`];
                  const available = cell?.isAvailable ?? true;
                  const hasOverride = cell !== undefined;
                  return (
                    <td key={loc.id} className="px-4 py-2.5 text-center">
                      <Cell
                        itemId={item.id}
                        locationId={loc.id}
                        available={available}
                        isDefault={!hasOverride}
                        disabled={!canEdit(loc.id)}
                        label={`${item.name} at ${loc.name}`}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-body">
        A faint switch means the dish follows its default availability here. Toggle it to set an explicit override for this branch.
      </p>
    </div>
  );
}

function Cell({
  itemId,
  locationId,
  available,
  isDefault,
  disabled,
  label,
}: {
  itemId: string;
  locationId: string;
  available: boolean;
  isDefault: boolean;
  disabled: boolean;
  label: string;
}) {
  const [state, action] = useActionState(setLocationAvailability, IDLE);
  useActionResult(state);

  return (
    <form action={action} className="inline-flex">
      <input type="hidden" name="itemId" value={itemId} />
      <input type="hidden" name="locationId" value={locationId} />
      <input type="hidden" name="next" value={available ? "false" : "true"} />
      <button
        type="submit"
        role="switch"
        aria-checked={available}
        aria-label={label}
        disabled={disabled}
        title={isDefault ? "Default — click to override" : available ? "Available (override)" : "Unavailable (override)"}
        className={cx(
          "relative h-5 w-9 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50",
          available ? "bg-[#3a6b2e]" : "bg-sand",
          isDefault && "opacity-40",
        )}
      >
        <span className={cx("absolute top-0.5 h-4 w-4 rounded-full bg-surface shadow transition-all", available ? "left-[1.125rem]" : "left-0.5")} />
      </button>
    </form>
  );
}
