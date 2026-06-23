import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import "./globals.css";
import { PublicChrome } from "@/components/layout/PublicChrome";

const cormorant = Cormorant_Garamond({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Bombay Bicycle Chef | Modern Indian Kitchen",
  description: "Inspired by the flavours, memories and gathering places of old Bombay, reimagined for modern London dining.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${cormorant.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans bg-[#F5F0E6]">
        {/* Public marketing chrome (smooth scroll, grain, navbar, footer) wraps
            every route except /admin, which renders on a bare canvas. The public
            site is unchanged. */}
        <PublicChrome>{children}</PublicChrome>
      </body>
    </html>
  );
}
