"use client";

import { useActionState, useState } from "react";
import { CalendarPlus } from "lucide-react";

import type { WaitlistEntry } from "@/lib/repositories/reservations";
import { IDLE } from "@/lib/admin/validation";
import { convertWaitlist, removeWaitlist } from "@/app/admin/_actions/reservations";
import { londonDateISO, formatInstantDate } from "@/lib/reservations/time";
import { Modal } from "@/components/admin/Modal";
import { useActionResult } from "@/components/admin/useActionResult";
import { Badge, Banner, Button, EmptyState, Field, SubmitButton, TextInput } from "@/components/admin/primitives";
import { Td, Th } from "@/components/admin/ui";

export function WaitlistManager({
  entries,
  locationId,
}: {
  entries: WaitlistEntry[];
  locationId: string;
}) {
  const [converting, setConverting] = useState<WaitlistEntry | null>(null);

  if (entries.length === 0) {
    return <EmptyState title="No one waiting" description="When a date is fully booked, guests who join the waitlist appear here." />;
  }

  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-sand bg-surface">
        <table className="w-full border-collapse">
          <thead className="border-b border-sand bg-bg/40">
            <tr>
              <Th>Guest</Th>
              <Th className="text-center">Party</Th>
              <Th>Preferred date</Th>
              <Th>Contact</Th>
              <Th>Status</Th>
              <Th className="w-px" />
            </tr>
          </thead>
          <tbody className="divide-y divide-sand">
            {entries.map((e) => (
              <tr key={e.id} className="hover:bg-bg/30">
                <Td className="font-medium">{e.guestName ?? "—"}</Td>
                <Td className="text-center tabular-nums">{e.partySize}</Td>
                <Td>{formatInstantDate(new Date(e.desiredFrom))}</Td>
                <Td className="text-body">
                  <div className="text-xs leading-tight">
                    {e.guestPhone && <div>{e.guestPhone}</div>}
                    {e.guestEmail && <div className="text-body/70">{e.guestEmail}</div>}
                  </div>
                </Td>
                <Td><Badge tone={e.status === "offered" ? "accent" : "neutral"}>{e.status}</Badge></Td>
                <Td className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" onClick={() => setConverting(e)} aria-label="Offer a table">
                      <CalendarPlus className="h-4 w-4" />
                    </Button>
                    <RemoveButton entry={e} locationId={locationId} />
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={converting !== null} onClose={() => setConverting(null)} title="Offer a table" description="Create a confirmed booking from this waitlist entry.">
        {converting && <ConvertForm key={converting.id} entry={converting} locationId={locationId} onDone={() => setConverting(null)} />}
      </Modal>
    </>
  );
}

function ConvertForm({ entry, locationId, onDone }: { entry: WaitlistEntry; locationId: string; onDone: () => void }) {
  const [state, action] = useActionState(convertWaitlist, IDLE);
  useActionResult(state, onDone);
  return (
    <form action={action} className="flex flex-col gap-4">
      <Banner state={state} />
      <input type="hidden" name="waitlistId" value={entry.id} />
      <input type="hidden" name="locationId" value={locationId} />
      <p className="text-sm text-body">{entry.guestName} · party of {entry.partySize}</p>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Date" htmlFor="date" required>
          <TextInput id="date" name="date" type="date" defaultValue={londonDateISO(new Date(entry.desiredFrom))} />
        </Field>
        <Field label="Time" htmlFor="time" required>
          <TextInput id="time" name="time" type="time" step={900} defaultValue="19:00" />
        </Field>
      </div>
      <div className="mt-1 flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onDone}>Cancel</Button>
        <SubmitButton>Create booking</SubmitButton>
      </div>
    </form>
  );
}

function RemoveButton({ entry, locationId }: { entry: WaitlistEntry; locationId: string }) {
  const [state, action] = useActionState(removeWaitlist, IDLE);
  useActionResult(state);
  return (
    <form action={action} onSubmit={(e) => { if (!window.confirm("Remove this guest from the waitlist?")) e.preventDefault(); }}>
      <input type="hidden" name="id" value={entry.id} />
      <input type="hidden" name="locationId" value={locationId} />
      <SubmitButton variant="ghost">Remove</SubmitButton>
    </form>
  );
}
