import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reservations | Bombay Bicycle Chef",
  description: "Book a table for lunch, dinner, or a special celebration at our Balham, Battersea, or Kilburn locations.",
};

export default function ReservationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
