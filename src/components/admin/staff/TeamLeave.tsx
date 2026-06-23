"use client";

import { useActionState } from "react";

import type { LeaveRow } from "@/lib/repositories/staff";
import { leaveKindLabel, LEAVE_STATUS_LABEL } from "@/lib/staff/constants";
import { IDLE } from "@/lib/admin/validation";
import { decideLeave } from "@/app/admin/_actions/leave";
import { useActionResult } from "@/components/admin/useActionResult";
import { Badge, Button, EmptyState } from "@/components/admin/primitives";
import { Td, Th } from "@/components/admin/ui";

const d = (s: string) => new Date(`${s}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const tone = (s: string) => (s === "approved" ? "on" : s === "rejected" || s === "cancelled" ? "off" : "accent") as "on" | "off" | "accent";

export function TeamLeave({ leave }: { leave: LeaveRow[] }) {
  if (leave.length === 0) return <EmptyState title="No requests" description="Team leave requests will appear here." />;
  return (
    <div className="overflow-x-auto rounded-lg border border-sand bg-surface">
      <table className="w-full border-collapse">
        <thead className="border-b border-sand bg-bg/40"><tr><Th>Staff</Th><Th>Dates</Th><Th>Type</Th><Th>Reason</Th><Th>Status</Th><Th className="w-px" /></tr></thead>
        <tbody className="divide-y divide-sand">
          {leave.map((l) => (
            <tr key={l.id} className="hover:bg-bg/30">
              <Td className="font-medium">{l.staffName}</Td>
              <Td>{d(l.startDate)}{l.endDate !== l.startDate ? ` – ${d(l.endDate)}` : ""}</Td>
              <Td className="text-body">{leaveKindLabel(l.kind)}</Td>
              <Td className="max-w-xs truncate text-body">{l.reason ?? "—"}</Td>
              <Td><Badge tone={tone(l.status)}>{LEAVE_STATUS_LABEL[l.status]}</Badge></Td>
              <Td className="text-right">
                {l.status === "pending" && (
                  <div className="flex justify-end gap-1">
                    <Decide id={l.id} locationId={l.locationId} decision="approved" label="Approve" />
                    <Decide id={l.id} locationId={l.locationId} decision="rejected" label="Reject" variant="danger" />
                  </div>
                )}
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Decide({ id, locationId, decision, label, variant = "secondary" }: { id: string; locationId: string | null; decision: string; label: string; variant?: "secondary" | "danger" }) {
  const [state, action] = useActionState(decideLeave, IDLE);
  useActionResult(state);
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      {locationId && <input type="hidden" name="locationId" value={locationId} />}
      <input type="hidden" name="decision" value={decision} />
      <Button type="submit" variant={variant}>{label}</Button>
    </form>
  );
}
