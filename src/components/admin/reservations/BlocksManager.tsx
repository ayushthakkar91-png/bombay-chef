"use client";

import { useActionState } from "react";
import { Plus } from "lucide-react";

import { IDLE } from "@/lib/admin/validation";
import { addBlock, removeBlock } from "@/app/admin/_actions/reservations";
import { formatInstantDate, formatInstantTime, londonDateISO } from "@/lib/reservations/time";
import { useActionResult } from "@/components/admin/useActionResult";
import { Badge, Banner, Field, Select, SubmitButton, TextInput } from "@/components/admin/primitives";

export type BlockRow = { id: string; starts_at: string; ends_at: string; kind: string; reason: string | null };

export function BlocksManager({ blocks, locationId }: { blocks: BlockRow[]; locationId: string }) {
  return (
    <div className="flex flex-col gap-5">
      <AddBlockForm locationId={locationId} />
      {blocks.length === 0 ? (
        <p className="text-sm text-body">No upcoming blocks or closures.</p>
      ) : (
        <ul className="divide-y divide-sand rounded-lg border border-sand bg-surface">
          {blocks.map((b) => (
            <li key={b.id} className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="flex items-center gap-3">
                <Badge tone={b.kind === "closure" ? "off" : "accent"}>{b.kind === "closure" ? "Closure" : "Block"}</Badge>
                <div className="text-sm">
                  <span className="font-medium text-text">{formatInstantDate(new Date(b.starts_at))}</span>
                  <span className="text-body"> · {formatInstantTime(new Date(b.starts_at))}–{formatInstantTime(new Date(b.ends_at))}</span>
                  {b.reason && <span className="text-body"> · {b.reason}</span>}
                </div>
              </div>
              <RemoveBlockButton id={b.id} locationId={locationId} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AddBlockForm({ locationId }: { locationId: string }) {
  const [state, action] = useActionState(addBlock, IDLE);
  useActionResult(state);
  const today = londonDateISO(new Date());
  return (
    <form action={action} className="rounded-lg border border-sand bg-surface p-4">
      <input type="hidden" name="locationId" value={locationId} />
      <Banner state={state} />
      <div className="mt-2 grid gap-3 sm:grid-cols-5 sm:items-end">
        <Field label="Date" htmlFor="bd"><TextInput id="bd" name="date" type="date" defaultValue={today} min={today} /></Field>
        <Field label="From" htmlFor="bs"><TextInput id="bs" name="startTime" type="time" defaultValue="12:00" /></Field>
        <Field label="To" htmlFor="be"><TextInput id="be" name="endTime" type="time" defaultValue="23:00" /></Field>
        <Field label="Type" htmlFor="bk">
          <Select id="bk" name="kind" defaultValue="block">
            <option value="block">Block</option>
            <option value="closure">Closure</option>
          </Select>
        </Field>
        <SubmitButton><Plus className="h-4 w-4" /> Add</SubmitButton>
      </div>
      <div className="mt-3">
        <Field label="Reason (optional)" htmlFor="br"><TextInput id="br" name="reason" placeholder="Private event, staff training…" /></Field>
      </div>
    </form>
  );
}

function RemoveBlockButton({ id, locationId }: { id: string; locationId: string }) {
  const [state, action] = useActionState(removeBlock, IDLE);
  useActionResult(state);
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="locationId" value={locationId} />
      <SubmitButton variant="ghost">Remove</SubmitButton>
    </form>
  );
}
