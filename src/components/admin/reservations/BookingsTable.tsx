"use client";

import { useActionState, useState } from "react";
import { Pencil } from "lucide-react";

import type { Reservation } from "@/lib/repositories/reservations";
import { IDLE } from "@/lib/admin/validation";
import {
  STATUS_LABEL,
  STATUS_TRANSITIONS,
  OCCASIONS,
  type ReservationStatus,
} from "@/lib/reservations/constants";
import { formatInstantTime, londonDateISO, londonHM } from "@/lib/reservations/time";
import { setReservationStatus, moveReservation } from "@/app/admin/_actions/reservations";
import { Modal } from "@/components/admin/Modal";
import { useActionResult } from "@/components/admin/useActionResult";
import { Badge, Banner, Button, EmptyState, Field, SubmitButton, Textarea, TextInput, cx } from "@/components/admin/primitives";
import { Td, Th } from "@/components/admin/ui";

const TONE: Record<ReservationStatus, "neutral" | "on" | "off" | "accent"> = {
  pending: "accent",
  confirmed: "on",
  seated: "accent",
  completed: "neutral",
  no_show: "off",
  cancelled: "off",
};

function occasionLabel(id: string | null) {
  return OCCASIONS.find((o) => o.id === id)?.label;
}

export function BookingsTable({
  reservations,
  locationId,
}: {
  reservations: Reservation[];
  locationId: string;
}) {
  const [editing, setEditing] = useState<Reservation | null>(null);

  if (reservations.length === 0) {
    return <EmptyState title="No bookings" description="There are no reservations for this day yet." />;
  }

  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-sand bg-surface">
        <table className="w-full border-collapse">
          <thead className="border-b border-sand bg-bg/40">
            <tr>
              <Th>Time</Th>
              <Th>Guest</Th>
              <Th className="text-center">Party</Th>
              <Th>Occasion</Th>
              <Th>Contact</Th>
              <Th>Status</Th>
              <Th className="w-px" />
            </tr>
          </thead>
          <tbody className="divide-y divide-sand">
            {reservations.map((r) => (
              <tr key={r.id} className={cx("hover:bg-bg/30", (r.status === "cancelled" || r.status === "no_show") && "opacity-60")}>
                <Td className="font-medium tabular-nums">{formatInstantTime(new Date(r.startsAt))}</Td>
                <Td>{r.guestName ?? "—"}</Td>
                <Td className="text-center tabular-nums">{r.partySize}</Td>
                <Td className="text-body">{occasionLabel(r.occasion) ?? "—"}</Td>
                <Td className="text-body">
                  <div className="text-xs leading-tight">
                    {r.guestPhone && <div>{r.guestPhone}</div>}
                    {r.guestEmail && <div className="text-body/70">{r.guestEmail}</div>}
                  </div>
                </Td>
                <Td><StatusCell reservation={r} locationId={locationId} /></Td>
                <Td className="text-right">
                  {(r.status === "confirmed" || r.status === "pending" || r.status === "seated") && (
                    <Button variant="ghost" onClick={() => setEditing(r)} aria-label={`Edit booking for ${r.guestName ?? "guest"}`}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing ? `Booking — ${editing.guestName ?? "Guest"}` : "Booking"}>
        {editing && <ManageForm key={editing.id} reservation={editing} locationId={locationId} onDone={() => setEditing(null)} />}
      </Modal>
    </>
  );
}

function StatusCell({ reservation, locationId }: { reservation: Reservation; locationId: string }) {
  const [state, action] = useActionState(setReservationStatus, IDLE);
  useActionResult(state);
  const allowed = STATUS_TRANSITIONS[reservation.status];

  if (allowed.length === 0) {
    return <Badge tone={TONE[reservation.status]}>{STATUS_LABEL[reservation.status]}</Badge>;
  }

  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="id" value={reservation.id} />
      <input type="hidden" name="locationId" value={locationId} />
      <input type="hidden" name="current" value={reservation.status} />
      <Badge tone={TONE[reservation.status]}>{STATUS_LABEL[reservation.status]}</Badge>
      <select
        name="status"
        defaultValue=""
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        aria-label="Change status"
        className="rounded-md border border-sand bg-surface px-2 py-1 text-xs text-body focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass"
      >
        <option value="" disabled>Change…</option>
        {allowed.map((s) => (
          <option key={s} value={s}>Mark {STATUS_LABEL[s]}</option>
        ))}
      </select>
    </form>
  );
}

function ManageForm({
  reservation,
  locationId,
  onDone,
}: {
  reservation: Reservation;
  locationId: string;
  onDone: () => void;
}) {
  const [state, action] = useActionState(moveReservation, IDLE);
  useActionResult(state, onDone);
  const start = new Date(reservation.startsAt);
  const { h, m } = londonHM(start);
  const timeValue = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

  return (
    <form action={action} className="flex flex-col gap-4">
      <Banner state={state} />
      <input type="hidden" name="id" value={reservation.id} />
      <input type="hidden" name="locationId" value={locationId} />
      <div className="grid grid-cols-2 gap-4">
        <Field label="Date" htmlFor="date" required>
          <TextInput id="date" name="date" type="date" defaultValue={londonDateISO(start)} />
        </Field>
        <Field label="Time" htmlFor="time" required>
          <TextInput id="time" name="time" type="time" step={900} defaultValue={timeValue} />
        </Field>
      </div>
      <Field label="Party size" htmlFor="partySize" required>
        <TextInput id="partySize" name="partySize" type="number" min={1} defaultValue={reservation.partySize} />
      </Field>
      <Field label="Special requests" htmlFor="requests">
        <Textarea id="requests" name="requests" defaultValue={reservation.specialRequests ?? ""} />
      </Field>
      <div className="mt-1 flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onDone}>Cancel</Button>
        <SubmitButton>Save changes</SubmitButton>
      </div>
    </form>
  );
}
