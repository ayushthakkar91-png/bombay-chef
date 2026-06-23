/** Staff & operations constants. */

export const POSITIONS = [
  { id: "kitchen", label: "Kitchen" },
  { id: "front", label: "Front of house" },
  { id: "bar", label: "Bar" },
  { id: "manager", label: "Manager" },
] as const;

export function positionLabel(id: string | null | undefined): string {
  return POSITIONS.find((p) => p.id === id)?.label ?? (id ?? "—");
}

export const LEAVE_KINDS = [
  { id: "holiday", label: "Holiday" },
  { id: "sick", label: "Sick leave" },
  { id: "unpaid", label: "Unpaid leave" },
  { id: "other", label: "Other" },
] as const;

export function leaveKindLabel(id: string): string {
  return LEAVE_KINDS.find((k) => k.id === id)?.label ?? id;
}

export const LEAVE_STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  cancelled: "Cancelled",
};
