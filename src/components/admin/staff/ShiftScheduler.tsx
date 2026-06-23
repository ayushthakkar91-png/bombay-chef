"use client";

import { useActionState, useState } from "react";
import { Plus, Pencil } from "lucide-react";

import type { ShiftRow } from "@/lib/repositories/staff";
import { POSITIONS, positionLabel } from "@/lib/staff/constants";
import { IDLE } from "@/lib/admin/validation";
import { saveShift, deleteShift } from "@/app/admin/_actions/shifts";
import { formatInstantTime, londonDateISO, londonHM } from "@/lib/reservations/time";
import { Modal } from "@/components/admin/Modal";
import { useActionResult } from "@/components/admin/useActionResult";
import { Banner, Button, Field, Select, SubmitButton, Textarea, TextInput } from "@/components/admin/primitives";

type StaffOption = { id: string; name: string };

export function ShiftScheduler({
  shifts,
  staff,
  locationId,
  days,
  canManage,
}: {
  shifts: ShiftRow[];
  staff: StaffOption[];
  locationId: string;
  days: string[];
  canManage: boolean;
}) {
  const [editing, setEditing] = useState<{ shift?: ShiftRow; date: string } | null>(null);
  const byDay = new Map<string, ShiftRow[]>();
  for (const s of shifts) {
    const d = londonDateISO(new Date(s.startsAt));
    byDay.set(d, [...(byDay.get(d) ?? []), s]);
  }

  return (
    <>
      <div className="grid gap-3 lg:grid-cols-7">
        {days.map((d) => {
          const dayShifts = byDay.get(d) ?? [];
          const label = new Date(`${d}T12:00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric" });
          return (
            <div key={d} className="rounded-lg border border-sand bg-surface">
              <div className="flex items-center justify-between border-b border-sand px-3 py-2">
                <span className="text-sm font-medium text-text">{label}</span>
                {canManage && <button onClick={() => setEditing({ date: d })} aria-label="Add shift" className="text-body hover:text-primary"><Plus className="h-4 w-4" /></button>}
              </div>
              <div className="flex flex-col gap-1.5 p-2">
                {dayShifts.length === 0 && <p className="px-1 py-2 text-xs text-body/60">—</p>}
                {dayShifts.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => canManage && setEditing({ shift: s, date: d })}
                    className={`rounded-md border border-sand px-2.5 py-2 text-left text-xs ${canManage ? "hover:border-brass/50" : "cursor-default"}`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-medium text-text">{s.staffName}</span>
                      {canManage && <Pencil className="h-3 w-3 text-body/50" />}
                    </div>
                    <div className="text-body">{formatInstantTime(new Date(s.startsAt))}–{formatInstantTime(new Date(s.endsAt))}</div>
                    {s.position && <div className="text-brass">{positionLabel(s.position)}</div>}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {canManage && editing && (
        <Modal open onClose={() => setEditing(null)} title={editing.shift ? "Edit shift" : "Add shift"}>
          <ShiftForm shift={editing.shift} date={editing.date} staff={staff} locationId={locationId} onDone={() => setEditing(null)} />
        </Modal>
      )}
    </>
  );
}

function ShiftForm({ shift, date, staff, locationId, onDone }: { shift?: ShiftRow; date: string; staff: StaffOption[]; locationId: string; onDone: () => void }) {
  const [state, action] = useActionState(saveShift, IDLE);
  useActionResult(state, onDone);
  const start = shift ? londonHM(new Date(shift.startsAt)) : { h: 9, m: 0 };
  const end = shift ? londonHM(new Date(shift.endsAt)) : { h: 17, m: 0 };
  const hm = (x: { h: number; m: number }) => `${String(x.h).padStart(2, "0")}:${String(x.m).padStart(2, "0")}`;

  return (
    <form action={action} className="flex flex-col gap-4">
      <Banner state={state} />
      {shift && <input type="hidden" name="id" value={shift.id} />}
      <input type="hidden" name="locationId" value={locationId} />
      <input type="hidden" name="date" value={date} />
      <Field label="Staff member" htmlFor="profileId" required>
        <Select id="profileId" name="profileId" defaultValue={shift?.profileId ?? ""}>
          <option value="" disabled>Choose…</option>
          {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Start" htmlFor="startTime" required><TextInput id="startTime" name="startTime" type="time" defaultValue={hm(start)} /></Field>
        <Field label="End" htmlFor="endTime" required><TextInput id="endTime" name="endTime" type="time" defaultValue={hm(end)} /></Field>
      </div>
      <Field label="Position" htmlFor="position">
        <Select id="position" name="position" defaultValue={shift?.position ?? ""}>
          <option value="">—</option>
          {POSITIONS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
        </Select>
      </Field>
      <Field label="Notes" htmlFor="notes"><Textarea id="notes" name="notes" defaultValue={shift?.notes ?? ""} /></Field>
      <div className="mt-1 flex items-center justify-between gap-3">
        {shift ? <DeleteShift id={shift.id} locationId={locationId} onDone={onDone} /> : <span />}
        <div className="flex gap-2"><Button type="button" variant="secondary" onClick={onDone}>Cancel</Button><SubmitButton>{shift ? "Save" : "Add shift"}</SubmitButton></div>
      </div>
    </form>
  );
}

function DeleteShift({ id, locationId, onDone }: { id: string; locationId: string; onDone: () => void }) {
  const [state, action] = useActionState(deleteShift, IDLE);
  useActionResult(state, onDone);
  return (
    <form action={action} onSubmit={(e) => { if (!window.confirm("Remove this shift?")) e.preventDefault(); }}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="locationId" value={locationId} />
      <SubmitButton variant="danger">Delete</SubmitButton>
    </form>
  );
}
