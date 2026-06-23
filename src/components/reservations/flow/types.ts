export type BookingStep = 1 | 2 | 3 | 4 | 5 | 6;

export type BookingMode = "reservation" | "waitlist";

export interface BookingState {
  step: BookingStep;
  /** When a date is fully booked the flow switches to collecting a waitlist entry. */
  mode: BookingMode;
  location: string | null;
  experience: string | null;
  date: Date | null;
  time: string | null;
  guests: number | null;
  details: {
    name: string;
    email: string;
    phone: string;
    occasion: string | null;
    requests: string;
  };
}

/** Local-date (no timezone shift) yyyy-mm-dd for the availability API + actions. */
export function toDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
