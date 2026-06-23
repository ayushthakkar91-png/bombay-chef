"use client";

import { useActionState } from "react";

import type { LeaveRow } from "@/lib/repositories/staff";
import { LEAVE_KINDS, leaveKindLabel, LEAVE_STATUS_LABEL } from "@/lib/staff/constants";
import { IDLE } from "@/lib/admin/validation";
import { submitLeave, cancelLeave } from "@/app/admin/_actions/leave";
import { useActionResult } from "@/components/admin/useActionResult";
import { Badge, Banner, Field, Select, SubmitButton, Textarea, TextInput } from "@/components/admin/primitives";
import { Td, Th } from "@/components/admin/ui";

const d = (s: string) => new Date(`${s}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const tone = (s: string) => (s === "approved" ? "on" : s === "rejected" || s === "cancelled" ? "off" : "accent") as "on" | "off" | "accent";

export function LeaveManager({ myLeave }: { myLeave: LeaveRow[] }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <RequestForm />
      <div className="rounded-lg border border-sand bg-surface">
        <div className="border-b border-sand px-5 py-3"><h2 className="text-sm font-semibold text-text">My requests</h2></div>
        {myLeave.length === 0 ? (
          <p className="px-5 py-4 text-sm text-body">No requests yet.</p>
        ) : (
          <table className="w-full border-collapse">
            <thead className="border-b border-sand bg-bg/40"><tr><Th>Dates</Th><Th>Type</Th><Th>Status</Th><Th className="w-px" /></tr></thead>
            <tbody className="divide-y divide-sand">
              {myLeave.map((l) => (
                <tr key={l.id}>
                  <Td>{d(l.startDate)}{l.endDate !== l.startDate ? ` – ${d(l.endDate)}` : ""}</Td>
                  <Td className="text-body">{leaveKindLabel(l.kind)}</Td>
                  <Td><Badge tone={tone(l.status)}>{LEAVE_STATUS_LABEL[l.status]}</Badge></Td>
                  <Td className="text-right">{l.status === "pending" && <CancelButton id={l.id} />}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function RequestForm() {
  const [state, action] = useActionState(submitLeave, IDLE);
  useActionResult(state);
  const today = new Date();
  const min = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  return (
    <form action={action} className="flex flex-col gap-4 rounded-lg border border-sand bg-surface p-5">
      <h2 className="text-sm font-semibold text-text">Request leave</h2>
      <Banner state={state} />
      <div className="grid grid-cols-2 gap-4">
        <Field label="From" htmlFor="startDate" required><TextInput id="startDate" name="startDate" type="date" min={min} /></Field>
        <Field label="To" htmlFor="endDate" required><TextInput id="endDate" name="endDate" type="date" min={min} /></Field>
      </div>
      <Field label="Type" htmlFor="kind">
        <Select id="kind" name="kind" defaultValue="holiday">{LEAVE_KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}</Select>
      </Field>
      <Field label="Reason (optional)" htmlFor="reason"><Textarea id="reason" name="reason" /></Field>
      <div className="flex justify-end"><SubmitButton>Submit request</SubmitButton></div>
    </form>
  );
}

function CancelButton({ id }: { id: string }) {
  const [state, action] = useActionState(cancelLeave, IDLE);
  useActionResult(state);
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <SubmitButton variant="ghost">Cancel</SubmitButton>
    </form>
  );
}
