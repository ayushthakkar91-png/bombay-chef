"use client";

import { useActionState, useState } from "react";
import { Plus, Pencil } from "lucide-react";

import { IDLE } from "@/lib/admin/validation";
import { upsertSlot, deleteSlot } from "@/app/admin/_actions/tables";
import { Modal } from "@/components/admin/Modal";
import { useActionResult } from "@/components/admin/useActionResult";
import { Badge, Banner, Button, EmptyState, Field, Select, SubmitButton, TextInput } from "@/components/admin/primitives";
import { Td, Th } from "@/components/admin/ui";

export type SlotRow = {
  id: string;
  weekday: number;
  service_start: string;
  service_end: string;
  slot_minutes: number;
  turn_minutes: number;
  max_covers: number;
  is_active: boolean;
};

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function hhmm(t: string) {
  return t.slice(0, 5);
}

export function ServiceWindows({ slots, locationId }: { slots: SlotRow[]; locationId: string }) {
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<SlotRow | null>(null);
  const ordered = [...slots].sort((a, b) => a.weekday - b.weekday || a.service_start.localeCompare(b.service_start));

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-body">{slots.length} windows · bookable times are generated from these each week</p>
        <Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" /> Add window</Button>
      </div>

      {slots.length === 0 ? (
        <EmptyState
          title="No service windows"
          description="Guests can only book inside a service window. Add one per day you take bookings (e.g. Dinner 17:30–22:00)."
          action={<Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" /> Add a window</Button>}
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-sand bg-surface">
          <table className="w-full border-collapse">
            <thead className="border-b border-sand bg-bg/40">
              <tr>
                <Th>Day</Th><Th>Service</Th><Th className="text-center">Every</Th><Th className="text-center">Turn</Th><Th className="text-center">Max covers</Th><Th className="text-center">Active</Th><Th className="w-px" />
              </tr>
            </thead>
            <tbody className="divide-y divide-sand">
              {ordered.map((s) => {
                const period = Number(s.service_start.slice(0, 2)) < 16 ? "Lunch" : "Dinner";
                return (
                  <tr key={s.id} className="hover:bg-bg/30">
                    <Td className="font-medium">{WEEKDAYS[s.weekday]}</Td>
                    <Td className="text-body">{period} · {hhmm(s.service_start)}–{hhmm(s.service_end)}</Td>
                    <Td className="text-center tabular-nums text-body">{s.slot_minutes} min</Td>
                    <Td className="text-center tabular-nums text-body">{s.turn_minutes} min</Td>
                    <Td className="text-center tabular-nums">{s.max_covers}</Td>
                    <Td className="text-center"><Badge tone={s.is_active ? "on" : "off"}>{s.is_active ? "Yes" : "No"}</Badge></Td>
                    <Td className="text-right"><Button variant="ghost" onClick={() => setEditing(s)} aria-label={`Edit ${WEEKDAYS[s.weekday]} window`}><Pencil className="h-4 w-4" /></Button></Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add service window">
        <SlotForm locationId={locationId} onDone={() => setAddOpen(false)} />
      </Modal>
      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing ? `Edit ${WEEKDAYS[editing.weekday]} window` : "Edit window"}>
        {editing && <SlotForm key={editing.id} slot={editing} locationId={locationId} onDone={() => setEditing(null)} />}
      </Modal>
    </>
  );
}

function SlotForm({ slot, locationId, onDone }: { slot?: SlotRow; locationId: string; onDone: () => void }) {
  const [state, action] = useActionState(upsertSlot, IDLE);
  useActionResult(state, onDone);
  return (
    <form action={action} className="flex flex-col gap-4">
      <Banner state={state} />
      {slot && <input type="hidden" name="id" value={slot.id} />}
      <input type="hidden" name="locationId" value={locationId} />
      <div className="grid grid-cols-2 gap-4">
        <Field label="Day" htmlFor="weekday" required>
          <Select id="weekday" name="weekday" defaultValue={slot?.weekday ?? 5}>
            {WEEKDAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
          </Select>
        </Field>
        <Field label="Max covers" htmlFor="maxCovers" required error={state.errors?.maxCovers}>
          <TextInput id="maxCovers" name="maxCovers" type="number" min={0} max={1000} defaultValue={slot?.max_covers ?? 40} />
        </Field>
        <Field label="Starts" htmlFor="serviceStart" required error={state.errors?.serviceStart}>
          <TextInput id="serviceStart" name="serviceStart" type="time" defaultValue={slot ? hhmm(slot.service_start) : "17:30"} />
        </Field>
        <Field label="Ends (last booking before)" htmlFor="serviceEnd" required error={state.errors?.serviceEnd}>
          <TextInput id="serviceEnd" name="serviceEnd" type="time" defaultValue={slot ? hhmm(slot.service_end) : "22:00"} />
        </Field>
        <Field label="Booking interval (min)" htmlFor="slotMinutes" error={state.errors?.slotMinutes}>
          <TextInput id="slotMinutes" name="slotMinutes" type="number" min={5} max={120} step={5} defaultValue={slot?.slot_minutes ?? 15} />
        </Field>
        <Field label="Table turn (min)" htmlFor="turnMinutes" error={state.errors?.turnMinutes}>
          <TextInput id="turnMinutes" name="turnMinutes" type="number" min={30} max={300} step={15} defaultValue={slot?.turn_minutes ?? 120} />
        </Field>
        <label className="flex items-center gap-2.5 text-sm text-text">
          <input type="checkbox" name="isActive" defaultChecked={slot ? slot.is_active : true} className="h-4 w-4 accent-[#3a6b2e]" /> Active
        </label>
      </div>
      <div className="mt-1 flex items-center justify-between gap-3">
        {slot ? <DeleteSlotButton slot={slot} locationId={locationId} onDone={onDone} /> : <span />}
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={onDone}>Cancel</Button>
          <SubmitButton>{slot ? "Save" : "Add window"}</SubmitButton>
        </div>
      </div>
    </form>
  );
}

function DeleteSlotButton({ slot, locationId, onDone }: { slot: SlotRow; locationId: string; onDone: () => void }) {
  const [state, action] = useActionState(deleteSlot, IDLE);
  useActionResult(state, onDone);
  return (
    <form action={action} onSubmit={(e) => { if (!window.confirm(`Delete the ${WEEKDAYS[slot.weekday]} ${hhmm(slot.service_start)}–${hhmm(slot.service_end)} window?`)) e.preventDefault(); }}>
      <input type="hidden" name="id" value={slot.id} />
      <input type="hidden" name="locationId" value={locationId} />
      <SubmitButton variant="danger" pendingLabel="Deleting…">Delete</SubmitButton>
    </form>
  );
}
