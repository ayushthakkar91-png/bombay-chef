/** Reservation domain constants shared by the customer flow and the admin. */

export type ServicePeriod = "lunch" | "dinner" | "all";

export type Experience = {
  id: string;
  label: string;
  period: ServicePeriod;
  /** Weekend-only experiences only offer slots on Sat/Sun. */
  weekendOnly?: boolean;
};

/** Mirrors the labels in StepExperience.tsx; `period` drives which slots show. */
export const EXPERIENCES: Experience[] = [
  { id: "lunch", label: "Lunch", period: "lunch" },
  { id: "dinner", label: "Dinner", period: "dinner" },
  { id: "brunch", label: "Weekend Gathering", period: "lunch", weekendOnly: true },
  { id: "private", label: "Private Dining", period: "all" },
  { id: "celebration", label: "Celebration", period: "all" },
];

export function experienceById(id: string | null | undefined): Experience | undefined {
  return EXPERIENCES.find((e) => e.id === id);
}

export const OCCASIONS = [
  { id: "birthday", label: "Birthday" },
  { id: "anniversary", label: "Anniversary" },
  { id: "family", label: "Family Gathering" },
  { id: "business", label: "Business Dinner" },
  { id: "other", label: "Other" },
] as const;

export type ReservationStatus =
  | "pending"
  | "confirmed"
  | "seated"
  | "completed"
  | "no_show"
  | "cancelled";

export const STATUS_LABEL: Record<ReservationStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  seated: "Seated",
  completed: "Completed",
  no_show: "No-show",
  cancelled: "Cancelled",
};

/** Legal next states (kept in sync with the DB transition guard in 0005). */
export const STATUS_TRANSITIONS: Record<ReservationStatus, ReservationStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["seated", "cancelled", "no_show"],
  seated: ["completed", "cancelled"],
  completed: [],
  no_show: [],
  cancelled: [],
};

/** Minimum lead time before a slot is bookable (minutes). */
export const BOOKING_LEAD_MINUTES = 60;

/** How many days ahead the public flow may book. */
export const BOOKING_HORIZON_DAYS = 90;

export const RESTAURANT_TZ = "Europe/London";
