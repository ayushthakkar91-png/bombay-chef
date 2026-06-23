"use client";

import { useActionState } from "react";
import { IDLE } from "@/lib/admin/validation";
import { updateSlot } from "@/app/admin/_actions/tables";
import { useActionResult } from "@/components/admin/useActionResult";
import { Button, EmptyState } from "@/components/admin/primitives";
import { Td, Th } from "@/components/admin/ui";

export type SlotRow = {
  id: string;
  weekday: number;
  service_start: string;
  service_end: string;
  max_covers: number;
  is_active: boolean;
};

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function hhmm(t: string) {
  return t.slice(0, 5);
}

export function ServiceWindows({ slots, locationId }: { slots: SlotRow[]; locationId: string }) {
  if (slots.length === 0) {
    return <EmptyState title="No service windows" description="Run supabase/seed_reservations.sql to create lunch and dinner windows for each branch." />;
  }
  const ordered = [...slots].sort((a, b) => a.weekday - b.weekday || a.service_start.localeCompare(b.service_start));

  return (
    <div className="overflow-x-auto rounded-lg border border-sand bg-surface">
      <table className="w-full border-collapse">
        <thead className="border-b border-sand bg-bg/40">
          <tr><Th>Day</Th><Th>Service</Th><Th>Max covers</Th><Th className="text-center">Active</Th><Th className="w-px" /></tr>
        </thead>
        <tbody className="divide-y divide-sand">
          {ordered.map((s) => <SlotRowForm key={s.id} slot={s} locationId={locationId} />)}
        </tbody>
      </table>
    </div>
  );
}

function SlotRowForm({ slot, locationId }: { slot: SlotRow; locationId: string }) {
  const [state, action] = useActionState(updateSlot, IDLE);
  useActionResult(state);
  const period = Number(slot.service_start.slice(0, 2)) < 16 ? "Lunch" : "Dinner";

  return (
    <tr className="hover:bg-bg/30">
      <Td className="font-medium">{WEEKDAYS[slot.weekday]}</Td>
      <Td className="text-body">{period} · {hhmm(slot.service_start)}–{hhmm(slot.service_end)}</Td>
      <Td>
        <form action={action} id={`slot-${slot.id}`} className="flex items-center gap-3">
          <input type="hidden" name="id" value={slot.id} />
          <input type="hidden" name="locationId" value={locationId} />
          <input
            name="maxCovers"
            type="number"
            min={0}
            defaultValue={slot.max_covers}
            aria-label="Max covers"
            className="w-20 rounded-md border border-sand bg-surface px-2 py-1.5 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass"
          />
        </form>
      </Td>
      <Td className="text-center">
        <input form={`slot-${slot.id}`} type="checkbox" name="isActive" defaultChecked={slot.is_active} className="h-4 w-4 accent-[#3a6b2e]" aria-label="Active" />
      </Td>
      <Td className="text-right">
        <Button form={`slot-${slot.id}`} type="submit" variant="secondary">Save</Button>
      </Td>
    </tr>
  );
}
