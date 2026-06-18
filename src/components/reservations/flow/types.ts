export type BookingStep = 1 | 2 | 3 | 4 | 5 | 6;

export interface BookingState {
  step: BookingStep;
  location: string | null;
  experience: string | null;
  date: Date | null;
  time: string | null;
  guests: number | null;
  details: {
    name: string;
    email: string;
    phone: string;
    requests: string;
  };
}
